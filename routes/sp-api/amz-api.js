const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const router = express.Router();

// 缓存access token
let accessToken = null;
let tokenExpires = 0;

/**
 * 获取Access Token
 */
async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpires) {
    return accessToken;
  }

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('client_id', process.env.SP_API_CLIENT_ID);
    params.append('client_secret', process.env.SP_API_CLIENT_SECRET);
    params.append('refresh_token', process.env.SP_API_REFRESH_TOKEN);

    const response = await axios.post('https://api.amazon.com/auth/o2/token', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    accessToken = response.data.access_token;
    tokenExpires = Date.now() + (response.data.expires_in - 60) * 1000;
    return accessToken;
  } catch (error) {
    console.error('获取Access Token失败:', error.response?.data || error.message);
    throw new Error('Failed to get access token');
  }
}

/**
 * 生成签名Key
 */
function getSignatureKey(key, dateStamp, regionName, serviceName) {
  const kDate = crypto.createHmac('sha256', 'AWS4' + key)
    .update(dateStamp)
    .digest();
  const kRegion = crypto.createHmac('sha256', kDate)
    .update(regionName)
    .digest();
  return crypto.createHmac('sha256', kRegion)
    .update(serviceName)
    .digest();
}

/**
 * 创建AWS SigV4签名
 */
function createSignatureV4(request) {
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  
  const canonicalUri = encodeURIComponent(new URL(request.url).pathname).replace(/%2F/g, '/');
  const canonicalQueryString = new URLSearchParams(request.params).toString();
  
  const headers = {
    ...request.headers,
    'host': new URL(request.url).hostname,
    'x-amz-date': amzDate
  };
  
  const canonicalHeaders = Object.entries(headers)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, value]) => `${key.toLowerCase()}:${value}\n`)
    .join('');
  
  const signedHeaders = Object.keys(headers)
    .map(h => h.toLowerCase())
    .sort()
    .join(';');
  
  const payloadHash = crypto.createHash('sha256')
    .update(request.body || '')
    .digest('hex');
  
  const canonicalRequest = [
    request.method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');
  
  const credentialScope = `${dateStamp}/us-east-1/execute-api/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex')
  ].join('\n');
  
  const signingKey = getSignatureKey(
    process.env.AWS_SECRET_KEY, 
    dateStamp, 
    'us-east-1', 
    'execute-api'
  );
  
  const signature = crypto.createHmac('sha256', signingKey)
    .update(stringToSign)
    .digest('hex');

  return {
    signature,
    signedHeaders,
    credentialScope,
    amzDate
  };
}

/**
 * 调用SP-API
 */
async function callSPApi(params) {
  const accessToken = await getAccessToken();
  const endpoint = process.env.SP_API_ENDPOINT || 'https://sellingpartnerapi-na.amazon.com';
  const url = `${endpoint}/orders/v0/orders`;
  
  const request = {
    method: 'GET',
    url,
    params: {
      MarketplaceIds: process.env.SP_API_MARKETPLACE_ID || 'ATVPDKIKX0DER',
      CreatedAfter: params.createdAfter,
      //CreatedAfter: 'TEST_CASE_200',
      CreatedBefore: params.createdBefore,
      OrderStatus: params.orderStatus
    },
    headers: {
      'x-amz-access-token': accessToken,
      'User-Agent': process.env.SP_API_USER_AGENT || 'My-App/1.0',
      'Content-Type': 'application/json',
      'version': 'beta'
    }
  };

  // 添加签名
  const { signature, signedHeaders, credentialScope, amzDate } = createSignatureV4(request);
  request.headers['Authorization'] = [
    `AWS4-HMAC-SHA256 Credential=${process.env.AWS_ACCESS_KEY}/${credentialScope}`,
    `SignedHeaders=${signedHeaders}`,
    `Signature=${signature}`
  ].join(', ');
  request.headers['x-amz-date'] = amzDate;

  console.log('SP-API请求:', request);

  try {
    const response = await axios(request);
    return response.data;
  } catch (error) {
    console.error('SP-API调用失败:', error.response?.data || error.message);
    throw new Error(error.response?.data?.errors?.[0]?.message || 'Failed to call SP-API');
  }
}

/**
 * 订单查询路由
 */
router.get('/', async (req, res) => {
  try {
    const { createdAfter, createdBefore, orderStatus } = req.query;
    
    if (!createdAfter || !createdBefore) {
      return res.status(400).json({ 
        error: 'Missing required parameters: createdAfter, createdBefore' 
      });
    }
    
    const result = await callSPApi({ createdAfter, createdBefore, orderStatus });
    res.json({
      success: true,
      payload: result
    });
  } catch (error) {
    console.error('订单查询错误:', error);
    res.status(500).json({ 
      success: false,
      message: error.message
    });
  }
});

module.exports = router;