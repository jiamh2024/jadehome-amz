const express = require('express');
const router = express.Router();
const axios = require('axios');
const qs = require('querystring');
const redisStorage = require('../../db/redis'); // 引入前面定义的Redis存储模块
const { body } = require('express-validator');

// 获取访问令牌（使用client credentials方式）
async function getAccessToken(retryCount = 0) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1秒重试间隔
  
  try {
    // 1. 先检查Redis中是否有未过期的token
    const cachedToken = await redisStorage.getToken(`ads_access_token`);
    //if (cachedToken && Date.now() < cachedToken.expires_at * 1000 - 60000) {
      //return cachedToken;
    //}
    //console.log('Cached Token:', cachedToken);
    return cachedToken;
    
  } catch (error) {
    console.error(`Token request failed (attempt ${retryCount + 1}):`, 
      error.response?.data || error.message);
  }
}

// 生成API签名
function generateSignature(accessToken, request) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto.createHmac('sha256', process.env.ADS_CLIENT_SECRET)
    .update(`${accessToken}\n${timestamp}\n${request}`)
    .digest('base64');
  return { signature, timestamp };
}

// 获取Profile ID, 用于确定是哪个市场
async function getProfileID(retryCount = 0) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000; // 1秒重试间隔
  
  
  const cachedProfile = await redisStorage.getToken(`ads_profile`);
  if (cachedProfile) {
    console.log('Using cached profile:', cachedProfile);
    return cachedProfile;
  }

  // 如果Redis中没有，调用API获取
  console.log('geting new profile...');
  try {
    // 2. 如果Redis中没有，调用API获取
    const allToken = await getAccessToken();
    const { access_token, refresh_token, expires_in } = allToken;
    //console.log('01 Access Token:', access_token);

    const endpoint = process.env.ADS_PROFILE_ENDPOINT || 'https://advertising-api.amazon.com/v2/profiles';
    const url = `${endpoint}`;
    const request = {
      method: 'GET',
      url,
      headers: {
        'Amazon-Advertising-API-ClientId': process.env.ADS_API_CLIENT_ID,
        Authorization: `Bearer ${access_token}`
      }
    };

    const profileId = await axios(request);
    // 假设返回的profileId是一个数组，取第一个
    console.log('Successfully obtained Profile ID:', profileId.data[0].profileId);

    // 将token存储到Redis（假设redisStorage是一个Redis存储实例）
    await redisStorage.storeToken('ads_profile', profileId.data, 0);
    
    // 这里可以继续调用广告API或处理业务逻辑
  } catch (error) {
    console.error('Token exchange failed:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to exchange authorization code',
      details: error.response?.data || error.message
    });
  }

}


// 获取广告活动数据
router.get('/campaigns', async (req, res) => {
  try {
    // 获取当前有效的access token
    const allToken = await getAccessToken();
    const { access_token, refresh_token, expires_in } = allToken;

    //let profileId = 'test'; // 默认值，实际使用时应从Redis或API获取
    const profileId = await getProfileID();

    //const apiUrl = `https://advertising-api.amazon.com/v2/campaigns`;
    //const { signature, timestamp } = generateSignature(accessToken, apiUrl);
    //console.log('Access Token:', access_token);
    //console.log('Refresh Token:', refresh_token);
    //console.log('Expires In:', expires_in);
    //console.log('Profile ID:', profileId);


    // 2. 
    const endpoint = process.env.ADS_ENDPOINT || 'https://advertising-api.amazon.com';
    const url = `${endpoint}/sp/campaigns/list`;
    const request = {
      method: 'POST',
      url,
      headers: {
        'Amazon-Advertising-API-ClientId': process.env.ADS_API_CLIENT_ID,
        'Amazon-Advertising-API-Scope': profileId[1].profileId, // 使用实际的Profile ID
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/vnd.spCampaign.v3+json',
        'Accept': 'application/vnd.spCampaign.v3+json'

      }
    };

    const response = await axios(request);

    res.json(response.data);
  } catch (error) {
    console.error('API request failed:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch campaigns',
      details: error.response?.data || error.message
    });
  }
});

// 获取广告活动数据
router.post('/budget', async (req, res) => {
  try {
    // 获取当前有效的access token
    const allToken = await getAccessToken();
    const { access_token, refresh_token, expires_in } = allToken;

    //let profileId = 'test'; // 默认值，实际使用时应从Redis或API获取
    const profileId = await getProfileID();

    // 2. 
    const endpoint = process.env.ADS_ENDPOINT || 'https://advertising-api.amazon.com';
    const url = `${endpoint}/sp/campaigns/budget/usage`;
    //const request = {
    //  method: 'POST',
    //  url,
    //  headers: {
    //    'Amazon-Advertising-API-ClientId': process.env.ADS_API_CLIENT_ID,
    //    'Amazon-Advertising-API-Scope': profileId[1].profileId, // 使用实际的Profile ID
    //    'Authorization': `Bearer ${access_token}`,
    //    'Accept': 'application/vnd.spcampaignbudgetusage.v1+json'

   //   },
   //   body: JSON.stringify(req.body) // 从请求体获取campaignIds
   //   //body: req.body // 从请求体获取campaignIds

  //  };

    console.log('Req Body:', req.body);
    //console.log('Request Body:', request.body);

    //const response = await axios(request);
    const response = await axios.post(url, req.body, {
      headers: {
        'Amazon-Advertising-API-ClientId': process.env.ADS_API_CLIENT_ID,
        'Amazon-Advertising-API-Scope': profileId[1].profileId, // 使用实际的Profile ID);
        'Authorization': `Bearer ${access_token}`,
        'Accept': 'application/vnd.spcampaignbudgetusage.v1+json'
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('API request failed:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch bugget usage',
      details: error.response?.data || error.message
    });
  }
});
module.exports = router;