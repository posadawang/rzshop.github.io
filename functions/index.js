require('dotenv').config();

const functions = require('firebase-functions');
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const config = {
  merchantId: functions.config().newebpay?.merchant_id || process.env.NEWEBPAY_MERCHANT_ID || '',
  hashKey: functions.config().newebpay?.hash_key || process.env.NEWEBPAY_HASH_KEY || '',
  hashIV: functions.config().newebpay?.hash_iv || process.env.NEWEBPAY_HASH_IV || '',
  returnURL: functions.config().newebpay?.return_url || process.env.NEWEBPAY_RETURN_URL || '',
  notifyURL: functions.config().newebpay?.notify_url || process.env.NEWEBPAY_NOTIFY_URL || ''
};

function ensureConfig() {
  const problems = [];

  if (!config.merchantId) problems.push('NEWEBPAY_MERCHANT_ID');
  if (!config.hashKey) problems.push('NEWEBPAY_HASH_KEY');
  if (!config.hashIV) problems.push('NEWEBPAY_HASH_IV');
  if (!config.returnURL) problems.push('NEWEBPAY_RETURN_URL');
  if (!config.notifyURL) problems.push('NEWEBPAY_NOTIFY_URL');

  if (Buffer.byteLength(config.hashKey, 'utf8') !== 32) {
    problems.push('HashKey must be 32 bytes');
  }

  if (Buffer.byteLength(config.hashIV, 'utf8') !== 16) {
    problems.push('HashIV must be 16 bytes');
  }

  if (problems.length) {
    throw new Error(`NewebPay configuration error: ${problems.join(', ')}`);
  }
}

function toQueryString(params) {
  return Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value ?? '')}`)
    .join('&');
}

function encryptTradeInfo(payload) {
  const cipher = crypto.createCipheriv('aes-256-cbc', config.hashKey, config.hashIV);
  let encrypted = cipher.update(payload, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function generateTradeSha(tradeInfo) {
  const sha = crypto
    .createHash('sha256')
    .update(`HashKey=${config.hashKey}&${tradeInfo}&HashIV=${config.hashIV}`)
    .digest('hex');
  return sha.toUpperCase();
}

function buildRedirectHtml({ merchantId, tradeInfo, tradeSha }) {
  const escapeHtml = value =>
    String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <title>Redirecting...</title>
</head>
<body>
  <form id="pay" method="post" action="https://core.newebpay.com/MPG/mpg_gateway">
    <input type="hidden" name="MerchantID" value="${escapeHtml(merchantId)}" />
    <input type="hidden" name="TradeInfo" value="${escapeHtml(tradeInfo)}" />
    <input type="hidden" name="TradeSha" value="${escapeHtml(tradeSha)}" />
    <input type="hidden" name="Version" value="2.0" />
  </form>
  <script>document.getElementById('pay').submit();</script>
</body>
</html>`;
}

app.post('/createOrder', (req, res) => {
  try {
    ensureConfig();

    const { amount, email, itemDesc } = req.body || {};

    if (!amount || !email || !itemDesc) {
      res.status(400).json({
        error: '缺少必要欄位',
        received: req.body
      });
      return;
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      res.status(400).json({
        error: '金額必須大於 0',
        received: req.body
      });
      return;
    }

    const normalizedAmount = Math.round(parsedAmount);
    const normalizedItemDesc = String(itemDesc).trim() || 'RZShop 交易';

    const orderId = `RZ${Date.now()}`;

    const tradeInfoData = {
      MerchantID: config.merchantId,
      RespondType: 'JSON',
      TimeStamp: Math.floor(Date.now() / 1000),
      Version: '2.0',
      MerchantOrderNo: orderId,
      Amt: normalizedAmount,
      ItemDesc: normalizedItemDesc,
      Email: email,
      ReturnURL: config.returnURL,
      NotifyURL: config.notifyURL,
      LoginType: 0
    };

    const plain = toQueryString(tradeInfoData);
    const encrypted = encryptTradeInfo(plain);
    const sha = generateTradeSha(encrypted);

    const html = buildRedirectHtml({
      merchantId: config.merchantId,
      tradeInfo: encrypted,
      tradeSha: sha
    });

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(html);
  } catch (error) {
    console.error('❌ CreateOrder error:', error);
    res.status(500).send('Create order failed.');
  }
});

exports.api = functions.https.onRequest(app);
