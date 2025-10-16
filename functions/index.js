require('dotenv').config();

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');
const express = require('express');
const querystring = require('querystring');

admin.initializeApp();

const { logger } = functions;

function resolveConfigValue(...values) {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const trimmed = String(value).trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return '';
}

const defaultConfig = {
  merchantId: resolveConfigValue(
    functions.config().newebpay?.merchant_id,
    process.env.NEWEBPAY_MERCHANT_ID,
    process.env.MERCHANT_ID,
    'MS1624139607'
  ),
  hashKey: resolveConfigValue(
    functions.config().newebpay?.hash_key,
    process.env.NEWEBPAY_HASH_KEY,
    process.env.HASH_KEY,
    'b6LpV3yq5SZFi2QAqpJAvFiB729kIKf6'
  ),
  hashIV: resolveConfigValue(
    functions.config().newebpay?.hash_iv,
    process.env.NEWEBPAY_HASH_IV,
    process.env.HASH_IV,
    'PONyLln8z3fr2CkC'
  ),
  returnURL: resolveConfigValue(
    functions.config().newebpay?.return_url,
    process.env.NEWEBPAY_RETURN_URL,
    'https://posadawang.github.io/rzshop.github.io/thankyou.html'
  ),
  notifyURL: resolveConfigValue(
    functions.config().newebpay?.notify_url,
    process.env.NEWEBPAY_NOTIFY_URL,
    'https://us-central1-rzshop-auth.cloudfunctions.net/paymentNotify'
  ),
  clientBackURL: resolveConfigValue(
    functions.config().newebpay?.client_back_url,
    process.env.NEWEBPAY_CLIENT_BACK_URL,
    'https://posadawang.github.io/rzshop.github.io/thankyou.html'
  ),
  environment: resolveConfigValue(
    functions.config().newebpay?.environment,
    process.env.NEWEBPAY_ENVIRONMENT,
    'sandbox'
  ),
  allowOrigin: resolveConfigValue(
    functions.config().newebpay?.allow_origin,
    process.env.NEWEBPAY_ALLOW_ORIGIN,
    'https://posadawang.github.io,http://localhost:5000,http://127.0.0.1:5000'
  )
};

function validateNewebpayConfigOrThrow() {
  const errors = [];

  if (!defaultConfig.merchantId) {
    errors.push('Merchant ID (NEWEBPAY_MERCHANT_ID) is not configured.');
  }

  if (!defaultConfig.hashKey) {
    errors.push('HashKey (NEWEBPAY_HASH_KEY) is not configured.');
  } else if (Buffer.from(defaultConfig.hashKey, 'utf8').length !== 32) {
    errors.push('HashKey must be 32 bytes long.');
  }

  if (!defaultConfig.hashIV) {
    errors.push('HashIV (NEWEBPAY_HASH_IV) is not configured.');
  } else if (Buffer.from(defaultConfig.hashIV, 'utf8').length !== 16) {
    errors.push('HashIV must be 16 bytes long.');
  }

  if (!defaultConfig.returnURL) {
    errors.push('ReturnURL (NEWEBPAY_RETURN_URL) is not configured.');
  }

  if (!defaultConfig.notifyURL) {
    errors.push('NotifyURL (NEWEBPAY_NOTIFY_URL) is not configured.');
  }

  if (errors.length) {
    throw new Error(`NewebPay configuration error: ${errors.join(' ')}`);
  }
}

const API_URL =
  defaultConfig.environment === 'production'
    ? 'https://core.newebpay.com/MPG/mpg_gateway'
    : 'https://ccore.newebpay.com/MPG/mpg_gateway';

const requiredEnvVars = [
  'NEWEBPAY_MERCHANT_ID',
  'NEWEBPAY_HASH_KEY',
  'NEWEBPAY_HASH_IV',
  'NEWEBPAY_RETURN_URL',
  'NEWEBPAY_NOTIFY_URL'
];

requiredEnvVars.forEach(name => {
  if (!process.env[name]) {
    console.warn(`[NewebPay] Environment variable ${name} is not set.`);
  }
});

function maskSecret(value = '', visible = 4) {
  if (!value) return '';
  if (value.length <= visible * 2) return value;
  const mask = '*'.repeat(Math.max(0, value.length - visible * 2));
  return `${value.slice(0, visible)}${mask}${value.slice(-visible)}`;
}

function getCryptoBuffers() {
  const hashKey = (defaultConfig.hashKey || '').trim();
  const hashIV = (defaultConfig.hashIV || '').trim();
  const keyBuffer = Buffer.from(hashKey, 'utf8');
  const ivBuffer = Buffer.from(hashIV, 'utf8');

  if (keyBuffer.length !== 32) {
    throw new Error(`Invalid NEWEBPAY_HASH_KEY length: expected 32 bytes, received ${keyBuffer.length}`);
  }

  if (ivBuffer.length !== 16) {
    throw new Error(`Invalid NEWEBPAY_HASH_IV length: expected 16 bytes, received ${ivBuffer.length}`);
  }

  return { keyBuffer, ivBuffer };
}

logger.info('NewebPay environment variables (sanitized)', {
  merchantId: maskSecret(process.env.NEWEBPAY_MERCHANT_ID || process.env.MERCHANT_ID || ''),
  hashKeyLength: (process.env.NEWEBPAY_HASH_KEY || process.env.HASH_KEY || '').length,
  hashIVLength: (process.env.NEWEBPAY_HASH_IV || process.env.HASH_IV || '').length,
  returnURL: process.env.NEWEBPAY_RETURN_URL || '',
  notifyURL: process.env.NEWEBPAY_NOTIFY_URL || '',
  allowOrigin: process.env.NEWEBPAY_ALLOW_ORIGIN || ''
});

logger.info('Resolved NewebPay configuration', {
  environment: defaultConfig.environment,
  merchantId: maskSecret(defaultConfig.merchantId),
  returnURL: defaultConfig.returnURL,
  notifyURL: defaultConfig.notifyURL,
  clientBackURL: defaultConfig.clientBackURL,
  allowOrigin: defaultConfig.allowOrigin,
  hashKeyLength: (defaultConfig.hashKey || '').length,
  hashIVLength: (defaultConfig.hashIV || '').length
});

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    return querystring.parse(req.body);
  }
  return req.body;
}

function encryptTradeInfo(data) {
  const payload = querystring.stringify(data);
  const { keyBuffer, ivBuffer } = getCryptoBuffers();
  const cipher = crypto.createCipheriv('aes-256-cbc', keyBuffer, ivBuffer);
  cipher.setAutoPadding(true);
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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildAutoSubmitFormHtml(action, fields) {
  const inputs = Object.entries(fields)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(
      ([name, value]) =>
        `        <input type="hidden" name="${escapeHtml(name)}" value="${escapeHtml(value)}" />`
    )
    .join('\n');

  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <title>Redirecting...</title>
</head>
<body>
  <form id="pay" method="post" action="${escapeHtml(action)}">
${inputs}
    <noscript>
      <p>系統將帶您前往藍新金流完成付款，若未自動跳轉請按下方按鈕。</p>
      <button type="submit">前往付款</button>
    </noscript>
  </form>
  <script>document.getElementById('pay').submit();</script>
</body>
</html>`;
}

function decryptTradeInfo(tradeInfo) {
  const { keyBuffer, ivBuffer } = getCryptoBuffers();
  const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, ivBuffer);
  decipher.setAutoPadding(true);
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
      items: payload.items || [],
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
  res.set('Vary', 'Origin');
  res.set('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  next();
});

function resolveRequestBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  return parseBody(req);
}

function normalizeItems(items = []) {
  if (!Array.isArray(items)) return [];
  return items
    .map(item => {
      if (!item || typeof item !== 'object') return null;
      const price = Number(item.price);
      const qty = Math.floor(Number(item.qty));
      return {
        id: item.id ?? '',
        title: item.title ?? '',
        price: Number.isFinite(price) && price >= 0 ? price : 0,
        qty: Number.isFinite(qty) && qty > 0 ? qty : 1
      };
    })
    .filter(Boolean);
}

async function handleCreateOrder(req, res) {
  try {
    const rawBody = resolveRequestBody(req) || {};
    const body = typeof rawBody === 'object' && !Array.isArray(rawBody) ? rawBody : {};

    validateNewebpayConfigOrThrow();

    logger.info('📦 req.body', { body });
    console.log('📦 req.body:', body);

    const missingFields = [];
    if (body.amount === undefined || body.amount === null || body.amount === '') {
      missingFields.push('amount');
    }
    if (!body.email) {
      missingFields.push('email');
    }
    if (!body.itemDesc && !body.item) {
      missingFields.push('itemDesc');
    }

    if (missingFields.length) {
      res.status(400).json({ error: 'Missing fields', missing: missingFields, body });
      return;
    }

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({
        error: 'Invalid amount',
        detail: 'Amount must be greater than zero.',
        body
      });
      return;
    }

    const email = String(body.email || '').trim();
    if (!email) {
      res.status(400).json({
        error: 'Email is required',
        detail: '請提供有效的電子信箱以建立訂單。',
        body
      });
      return;
    }

    const itemDesc = String(body.itemDesc || body.item || '阿智小舖商品').trim() || '阿智小舖商品';
    const normalizedItems = normalizeItems(body.items);
    const normalizedAmount = Math.round(amount);

    logger.info('createOrder request received', {
      origin: req.get('origin') || null,
      referer: req.get('referer') || null,
      amount: normalizedAmount,
      email,
      itemDesc,
      itemCount: normalizedItems.length
    });

    const orderId = `RZ${Date.now()}`;
    await createOrderRecord(orderId, {
      amount: normalizedAmount,
      email,
      item: itemDesc,
      items: normalizedItems
    });

    const timestamp = Math.floor(Date.now() / 1000);
    const tradeInfoData = {
      MerchantID: defaultConfig.merchantId,
      RespondType: 'JSON',
      TimeStamp: timestamp,
      Version: '2.0',
      LangType: 'zh-tw',
      MerchantOrderNo: orderId,
      Amt: normalizedAmount,
      ItemDesc: itemDesc,
      Email: email,
      ReturnURL: defaultConfig.returnURL,
      NotifyURL: defaultConfig.notifyURL,
      ClientBackURL: appendOrderToClientUrl(orderId),
      LoginType: 0
    };

    const plainTradeInfo = querystring.stringify(tradeInfoData);
    logger.info('NewebPay TradeInfo payload constructed', {
      orderId,
      payload: plainTradeInfo
    });

    const tradeInfo = encryptTradeInfo(tradeInfoData);
    const tradeSha = generateTradeSha(tradeInfo);

    logger.info('NewebPay TradeInfo encrypted', {
      orderId,
      tradeInfoLength: tradeInfo.length,
      tradeSha
    });

    const html = buildAutoSubmitFormHtml(API_URL, {
      MerchantID: defaultConfig.merchantId,
      TradeInfo: tradeInfo,
      TradeSha: tradeSha,
      Version: '2.0'
    });

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('createOrder error', { message, stack: error?.stack || null });
    res.status(500).json({ error: 'Failed to create NewebPay order', detail: message });
  }
}

app.post('/createOrder', handleCreateOrder);

exports.api = functions.https.onRequest(app);

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

  await handleCreateOrder(req, res);
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

    logger.info('newebpayReturn processed', {
      orderId,
      status,
      message: info?.Message || '',
      tradeNo: info?.Result?.TradeNo || null
    });

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
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('newebpayReturn error', { message, stack: error?.stack || null });
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
    logger.info('newebpayNotify processed', {
      orderId: info?.Result?.MerchantOrderNo || info?.MerchantOrderNo || null,
      status: info?.Status || null,
      tradeNo: info?.Result?.TradeNo || null
    });
    res.status(200).send('SUCCESS');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('newebpayNotify error', { message, stack: error?.stack || null });
    res.status(500).send('FAIL');
  }
});

exports.paymentNotify = exports.newebpayNotify;
