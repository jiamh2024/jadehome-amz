const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const router = express.Router();

// 缓存access token
let accessToken = {
  US: { token: null, tokenExpires: null } ,
  CA: { token: null, tokenExpires: null } ,
  UK: { token: null, tokenExpires: null } ,
  AE: { token: null, tokenExpires: null },
  SA: { token: null, tokenExpires: null }
};
let tokenExpires = 0;

// 亚马逊市场配置
const MARKETPLACES = {
  US: { id: 'ATVPDKIKX0DER', endpoint: process.env.SP_API_EP_NA, refresh_token: process.env.SP_API_REFRESH_TOKEN_NA } ,
  CA: { id: 'A2EUQ1WTGCTBG2', endpoint: process.env.SP_API_EP_NA, refresh_token: process.env.SP_API_REFRESH_TOKEN_NA },
  UK: { id: 'A1F83G8C2ARO7P', endpoint: process.env.SP_API_EP_EU, refresh_token: process.env.SP_API_REFRESH_TOKEN_EU },
  AE: { id: 'A2VIGQ35RCS4UG', endpoint: process.env.SP_API_EP_EU, refresh_token: process.env.SP_API_REFRESH_TOKEN_AE },
  SA: { id: 'A17E79C6D8DWNP', endpoint: process.env.SP_API_EP_EU, refresh_token: process.env.SP_API_REFRESH_TOKEN_SA }
};

/**
 * 获取Access Token
 */
async function getAccessToken(marketplaceId) {

  if (accessToken[marketplaceId].token && Date.now() < accessToken[marketplaceId].tokenExpires) {
    return accessToken[marketplaceId].token;
  }

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('client_id', process.env.SP_API_CLIENT_ID);
    params.append('client_secret', process.env.SP_API_CLIENT_SECRET);
    params.append('refresh_token', MARKETPLACES[marketplaceId].refresh_token);

    const response = await axios.post('https://api.amazon.com/auth/o2/token', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    accessToken[marketplaceId].token = response.data.access_token;
    accessToken[marketplaceId].tokenExpires = Date.now() + (response.data.expires_in - 60) * 1000; // 提前1分钟过期
    console.log('获取Access Token成功:', marketplaceId , response.data.access_token);
    return accessToken[marketplaceId].token;
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
    process.env.AWS_SECRET_ACCESS_KEY, 
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
 * 调用SP-API获取订单列表
 */
async function getOrders(marketplaceId, params) {
  const accessToken = await getAccessToken(marketplaceId);
  const endpoint = MARKETPLACES[marketplaceId]?.endpoint || MARKETPLACES.US.endpoint;
  const url = `${endpoint}/orders/v0/orders`;
  
  const request = {
    method: 'GET',
    url,
    params: {
      MarketplaceIds: MARKETPLACES[marketplaceId]?.id || MARKETPLACES.US.id,
      CreatedAfter: params.createdAfter,
      //CreatedAfter: 'TEST_CASE_200',
      CreatedBefore: params.createdBefore
    },
    headers: {
      'x-amz-access-token': accessToken,
      'User-Agent': process.env.SP_API_USER_AGENT || 'My-App/1.0',
      'Content-Type': 'application/json',
      version: 'beta'
    }
  };

  // 添加签名
  //const { signature, signedHeaders, credentialScope, amzDate } = createSignatureV4(request);
  //request.headers['Authorization'] = [
  //  `AWS4-HMAC-SHA256 Credential=${process.env.AWS_ACCESS_KEY_ID}/${credentialScope}`,
  //  `SignedHeaders=${signedHeaders}`,
  //  `Signature=${signature}`
  //].join(', ');
  //request.headers['x-amz-date'] = amzDate;

  console.log(request);

  try {
    const response = await axios(request);
    return response.data;
  } catch (error) {
    console.error(`SP-API调用失败 (${marketplaceId}):`, error.response?.data || error.message);
    throw new Error(error.response?.data?.errors?.[0]?.message || `Failed to call SP-API for ${marketplaceId}`);
  }
}

/**
 * 调用SP-API获取订单行项目
 */
async function getOrderItems(marketplaceId, orderId) {
  const accessToken = await getAccessToken(marketplaceId);
  const endpoint = MARKETPLACES[marketplaceId]?.endpoint || MARKETPLACES.US.endpoint;
  const url = `${endpoint}/orders/v0/orders/${orderId}/orderItems`;
  
  const request = {
    method: 'GET',
    url,
    headers: {
      'x-amz-access-token': accessToken,
      'User-Agent': process.env.SP_API_USER_AGENT || 'My-App/1.0',
      'Content-Type': 'application/json'
    }
  };

  // 添加签名
  //const { signature, signedHeaders, credentialScope, amzDate } = createSignatureV4(request);
  //request.headers['Authorization'] = [
  //  `AWS4-HMAC-SHA256 Credential=${process.env.AWS_ACCESS_KEY_ID}/${credentialScope}`,
  //  `SignedHeaders=${signedHeaders}`,
  //  `Signature=${signature}`
  //].join(', ');
  //request.headers['x-amz-date'] = amzDate;

  try {
    const response = await axios(request);
    return response.data;
  } catch (error) {
    console.error(`获取订单行项目失败 (${orderId}):`, error.response?.data || error.message);
    throw new Error(error.response?.data?.errors?.[0]?.message || `Failed to get order items for ${orderId}`);
  }
}

/**
 * 获取当日时间范围
 */
function getTodayTimeRange() {
  const today = new Date();
  today.setDate(today.getDate()-1);
  const endDate = new Date(today);
  endDate.setHours(23, 59, 59, 999);

  today.setDate(today.getDate()-1);
  const startDate = new Date(today);
  startDate.setHours(0, 0, 0, 0);
  
  return {
    createdAfter: startDate.toISOString(),
    createdBefore: endDate.toISOString()
  };
}

/**
 * 获取指定市场或所有市场的当日订单
 */
router.get('/today', async (req, res) => {
  try {
    const { marketplaceId } = req.query;
    const timeRange = getTodayTimeRange();
    
    // 如果指定了marketplaceId，则只查询该市场
    if (marketplaceId) {
      if (!MARKETPLACES[marketplaceId]) {
        return res.status(400).json({ 
          success: false,
          message: 'Invalid marketplaceId' 
        });
      }
      
      const data = await getOrders(marketplaceId, timeRange);

      console.log(data);

      return res.json({
        success: true,
        payload: {
        //  [marketplaceId]: { payload: data }
        data
        }
      });
    }
  } catch (error) {
    console.error('获取当日订单错误:', error);
    res.status(500).json({ 
      success: false,
      message: error.message
    });
  }
});

/**
 * 获取订单行项目
 */
router.get('/:orderId/items', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { marketplaceId = 'US' } = req.query;
    
    if (!MARKETPLACES[marketplaceId]) {
      return res.status(400).json({ 
        error: 'Invalid marketplaceId' 
      });
    }
    
    const result = await getOrderItems(marketplaceId, orderId);
    res.json({
      success: true,
      payload: result
    });
  } catch (error) {
    console.error('获取订单行项目错误:', error);
    res.status(500).json({ 
      success: false,
      message: error.message
    });
  }
});

// 导出函数
module.exports = {
  router,
  getAccessToken
};

