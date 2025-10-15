require('dotenv').config();

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');
const querystring = require('querystring');

admin.initializeApp();

const defaultConfig = {
  merchantId: functions.config().newebpay?.merchant_id || process.env.NEWEBPAY_MERCHANT_ID || 'MS1624139607',
  hashKey: functions.config().newebpay?.hash_key || process.env.NEWEBPAY_HASH_KEY || 'b6LpV3yq5SZFi2QAqpJAvFiB729kIKf6',
  hashIV: functions.config().newebpay?.hash_iv || process.env.NEWEBPAY_HASH_IV || 'PONyLln8z3fr2CkC',
  returnURL:
    functions.config().newebpay?.return_url ||
    process.env.NEWEBPAY_RETURN_URL ||
    'https://us-central1-rzshop-auth.cloudfunctions.net/newebpayReturn',
  notifyURL:
    functions.config().newebpay?.notify_url ||
    process.env.NEWEBPAY_NOTIFY_URL ||
    'https://us-central1-rzshop-auth.cloudfunctions.net/newebpayNotify',
  clientBackURL:
    functions.config().newebpay?.client_back_url ||
    process.env.NEWEBPAY_CLIENT_BACK_URL ||
    'https://rzshop.github.io/thankyou.html',
  environment: functions.config().newebpay?.environment || process.env.NEWEBPAY_ENVIRONMENT || 'sandbox',
  allowOrigin:
    functions.config().newebpay?.allow_origin || process.env.NEWEBPAY_ALLOW_ORIGIN || 'https://rzshop.github.io'
};

const API_URL =
  defaultConfig.environment === 'production'
    ? 'https://core.newebpay.com/MPG/mpg_gateway'
    : 'https://ccore.newebpay.com/MPG/mpg_gateway';

const keyBuffer = Buffer.from(defaultConfig.hashKey, 'utf8');
const ivBuffer = Buffer.from(defaultConfig.hashIV, 'utf8');

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    return querystring.parse(req.body);
  }
  return req.body;
}

function encryptTradeInfo(data) {
  const payload = querystring.stringify(data);
  const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, ivBuffer);
  let encrypted = cipher.update(payload, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function generateTradeSha(tradeInfo) {
  const hash = crypto
    .createHash('sha256')
    .update(`HashKey=${defaultConfig.hashKey}&${tradeInfo}&HashIV=${defaultConfig.hashIV}`)
    .digest('hex');
  return hash.toUpperCase();
}

function decryptTradeInfo(tradeInfo) {
  const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, ivBuffer);
  let decrypted = decipher.update(tradeInfo, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  try {
    return JSON.parse(decodeURIComponent(decrypted));
  } catch (err) {
    try {
      return JSON.parse(decrypted);
    } catch (innerErr) {
      return querystring.parse(decrypted);
    }
  }
}

async function createOrderRecord(orderId, payload) {
  const docRef = admin.firestore().collection('orders').doc(orderId);
  await docRef.set(
    {
      orderId,
      amount: payload.amount,
      email: payload.email,
      item: payload.item,
      status: 'INIT',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );
}

async function updateOrderRecord(info) {
  const orderId = info?.Result?.MerchantOrderNo || info?.MerchantOrderNo;
  if (!orderId) return null;

  const docRef = admin.firestore().collection('orders').doc(orderId);
  const result = info.Result || {};
  const data = {
    orderId,
    status: info.Status || 'UNKNOWN',
    message: info.Message || '',
    tradeNo: result.TradeNo || '',
    payTime: result.PayTime || '',
    paymentType: result.PaymentType || '',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    rawResult: info
  };

  if (result.Amt !== undefined) {
    data.amount = Number(result.Amt);
  }

  await docRef.set(data, { merge: true });

  return orderId;
}

function appendOrderToClientUrl(orderId, status) {
  try {
    const url = new URL(defaultConfig.clientBackURL);
    if (orderId) url.searchParams.set('orderId', orderId);
    if (status) url.searchParams.set('status', status);
    return url.toString();
  } catch (err) {
    return defaultConfig.clientBackURL;
  }
}

function resolveOrigin(req) {
  const configured = (defaultConfig.allowOrigin || '').split(',').map(item => item.trim()).filter(Boolean);
  const originHeader = req.get('origin');

  if (configured.includes('*')) {
    return originHeader || '*';
  }

  if (originHeader && configured.includes(originHeader)) {
    return originHeader;
  }

  return configured[0] || defaultConfig.allowOrigin || '*';
}

function setCorsHeaders(req, res) {
  res.set('Access-Control-Allow-Origin', resolveOrigin(req));
  res.set('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
}

exports.createOrder = functions.https.onRequest(async (req, res) => {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = parseBody(req);
    const amount = Number(body.amount || body.Amt || 0);
    const email = String(body.email || '').trim();
    const item = String(body.item || '阿智小舖商品').trim();

    if (!amount || amount <= 0) {
      res.status(400).json({ error: 'Invalid amount' });
      return;
    }

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const orderId = `RZ${Date.now()}`;
    await createOrderRecord(orderId, { amount, email, item });

    const timestamp = Math.floor(Date.now() / 1000);
    const tradeInfoData = {
      MerchantID: defaultConfig.merchantId,
      RespondType: 'JSON',
      TimeStamp: timestamp,
      Version: '2.0',
      LangType: 'zh-tw',
      MerchantOrderNo: orderId,
      Amt: Math.round(amount),
      ItemDesc: item,
      Email: email,
      ReturnURL: defaultConfig.returnURL,
      NotifyURL: defaultConfig.notifyURL,
      ClientBackURL: appendOrderToClientUrl(orderId)
    };

    const tradeInfo = encryptTradeInfo(tradeInfoData);
    const tradeSha = generateTradeSha(tradeInfo);

    const html = `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <title>Redirecting...</title>
</head>
<body>
  <form id="newebpay" method="post" action="${API_URL}">
    <input type="hidden" name="MerchantID" value="${defaultConfig.merchantId}" />
    <input type="hidden" name="TradeInfo" value="${tradeInfo}" />
    <input type="hidden" name="TradeSha" value="${tradeSha}" />
    <input type="hidden" name="Version" value="2.0" />
    <noscript>
      <p>請點擊下方按鈕前往付款</p>
      <button type="submit">前往藍新金流付款</button>
    </noscript>
  </form>
  <script>document.getElementById('newebpay').submit();</script>
</body>
</html>`;

    res.status(200).send(html);
  } catch (error) {
    console.error('createOrder error', error);
    res.status(500).json({ error: 'Failed to create NewebPay order' });
  }
});

exports.newebpayReturn = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    setCorsHeaders(req, res);
    res.status(405).send('Method not allowed');
    return;
  }

  try {
    const { TradeInfo, TradeSha } = parseBody(req);
    if (!TradeInfo || !TradeSha) {
      res.status(400).send('Missing parameters');
      return;
    }

    const generatedSha = generateTradeSha(TradeInfo);
    if (generatedSha !== TradeSha) {
      res.status(400).send('Invalid signature');
      return;
    }

    const info = decryptTradeInfo(TradeInfo);
    const orderId = await updateOrderRecord(info);
    const status = info?.Status || 'UNKNOWN';
    const redirectUrl = appendOrderToClientUrl(orderId, status);

    const html = `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0;url=${redirectUrl}">
  <title>付款結果處理中</title>
</head>
<body>
  <p>付款結果處理中，若未自動跳轉請 <a href="${redirectUrl}">點此回到商店</a>。</p>
</body>
</html>`;

    res.status(200).send(html);
  } catch (error) {
    console.error('newebpayReturn error', error);
    res.status(500).send('Failed to process payment result');
  }
});

exports.newebpayNotify = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  try {
    const { TradeInfo, TradeSha } = parseBody(req);
    if (!TradeInfo || !TradeSha) {
      res.status(400).send('Missing parameters');
      return;
    }

    const generatedSha = generateTradeSha(TradeInfo);
    if (generatedSha !== TradeSha) {
      res.status(400).send('Invalid signature');
      return;
    }

    const info = decryptTradeInfo(TradeInfo);
    await updateOrderRecord(info);
    res.status(200).send('SUCCESS');
  } catch (error) {
    console.error('newebpayNotify error', error);
    res.status(500).send('FAIL');
  }
});
