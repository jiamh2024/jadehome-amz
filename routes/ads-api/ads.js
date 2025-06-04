const express = require('express');
const router = express.Router();
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const _ = require('lodash');
const redisStorage = require('../../db/redis');

// 国家配置
const SUPPORTED_COUNTRIES = [
  { code: 'US', name: '美国', endpoint: 'https://advertising-api.amazon.com' },
  { code: 'CA', name: '加拿大', endpoint: 'https://advertising-api.amazon.com' },
  { code: 'UK', name: '英国', endpoint: 'https://advertising-api-eu.amazon.com' },
  { code: 'AE', name: '阿联酋', endpoint: 'https://advertising-api-eu.amazon.com' },
  { code: 'SA', name: '沙特', endpoint: 'https://advertising-api-eu.amazon.com' }
];
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

// 获取1个国家的广告活动数据
router.get('/campaigns', async (req, res) => {
  try {
    // 0. 获取国家参数
    const { country } = req.query;
    if (!country) {
      return res.status(400).json({ 
        success: false,
        message: 'No country supplied!' 
      });
    }
    // 1. 获取所有国家的Profile ID
    const countryProfiles = await getCountryProfiles();
    // 查找匹配的国家Profile
    const profile = countryProfiles.find(profile => 
      profile.countryCode === country.toUpperCase()
    );

    const {profileId, endpoint, countryCode} = profile;
    
    // 2. 获取该国家的广告活动
    try {
      const campaigns = await fetchCampaignsForCountry(profileId, endpoint);
      res.json(campaigns);

    } catch (error) {
      console.error(`Failed to fetch campaigns for ${countryCode}:`, error);
      return { countryCode, campaigns: [], error: error.message };
    }
    
  } catch (error) {
    console.error('Failed to fetch campaigns of your country:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaigns of your country!',
      details: error.message
    });
  }
});

// 获取所有国家的广告活动数据
router.get('/campaigns/all', async (req, res) => {
  try {
    // 1. 获取所有国家的Profile ID
    const countryProfiles = await getCountryProfiles();
    
    // 2. 并行获取所有国家的广告活动
    const campaignsByCountry = await Promise.all(
      countryProfiles.map(async ({ countryCode, profileId, endpoint }) => {
        try {
          const campaigns = await fetchCampaignsForCountry(profileId, endpoint);
          return { countryCode, campaigns };
        } catch (error) {
          console.error(`Failed to fetch campaigns for ${countryCode}:`, error);
          return { countryCode, campaigns: [], error: error.message };
        }
      })
    );
    
    // 3. 组织响应数据
    const result = {
      success: true,
      data: _.keyBy(campaignsByCountry, 'countryCode'),
      timestamp: new Date().toISOString()
    };
    
    res.json(result);
  } catch (error) {
    console.error('Failed to fetch multi-country campaigns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch multi-country campaigns',
      details: error.message
    });
  }
});

// 获取所有国家的Profile ID
async function getCountryProfiles() {
  // 尝试从缓存获取
  const cachedProfiles = await redisStorage.getToken('country_profiles');
  if (cachedProfiles) return cachedProfiles;
  
  // 2. 如果Redis中没有，调用API获取
  const allToken = await getAccessToken();
  const { access_token, refresh_token, expires_in } = allToken;
  const endpoint1 = SUPPORTED_COUNTRIES[0].endpoint; // NA
  const endpoint2 = SUPPORTED_COUNTRIES[2].endpoint; // EU
  const response1 = await axios.get(
    `${endpoint1}/v2/profiles`,
    {
      headers: {
        'Amazon-Advertising-API-ClientId': process.env.ADS_API_CLIENT_ID,
        'Authorization': `Bearer ${access_token}`
      }
    }
  );
  const response2 = await axios.get(
    `${endpoint2}/v2/profiles`,
    {
      headers: {
        'Amazon-Advertising-API-ClientId': process.env.ADS_API_CLIENT_ID,
        'Authorization': `Bearer ${access_token}`
      }
    }
  );
  
  // 合并两个响应的数据
  const allProfiles = [...response1.data, ...response2.data];
  // 过滤出我们需要的国家
  const countryProfiles = allProfiles
    .filter(profile => SUPPORTED_COUNTRIES.some(c => c.code === profile.countryCode))
    .map(profile => {
      const countryConfig = SUPPORTED_COUNTRIES.find(c => c.code === profile.countryCode);
      return {
        countryCode: profile.countryCode,
        profileId: profile.profileId,
        endpoint: countryConfig.endpoint
      };
    });
  
  // 存储到缓存
  await redisStorage.storeToken('country_profiles', countryProfiles, 360000); // 缓存100小时
  
  return countryProfiles;
}

// 获取单个国家的广告活动
async function fetchCampaignsForCountry(profileId, endpoint) {
    // 获取当前有效的access token
    const allToken = await getAccessToken();
    const { access_token, refresh_token, expires_in } = allToken;
  
  const response = await axios.post(
    `${endpoint}/sp/campaigns/list`,
    {}, // 可以根据需要添加请求体
    {
      headers: {
        'Amazon-Advertising-API-ClientId': process.env.ADS_API_CLIENT_ID,
        'Amazon-Advertising-API-Scope': profileId,
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/vnd.spCampaign.v3+json',
        'Accept': 'application/vnd.spCampaign.v3+json'
      },
      timeout: 10000
    }
  );
  
  return response.data;
}

// 获取某个国家的预算使用情况
router.post('/budget/v0', [
  body().isObject().custom(value => {
    // 验证每个国家的campaignIds数组
    return Object.values(value).every(ids => Array.isArray(ids) && ids.every(id => typeof id === 'string'));
  })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }
  
  try {
    // 1. 获取所有国家的Profile ID
    const countryProfiles = await getCountryProfiles();
    
    // 2. 组织请求数据
    const requests = countryProfiles.map(async ({ countryCode, profileId, endpoint }) => {
      const campaignIds = req.body[countryCode] || [];
      if (campaignIds.length === 0) {
        return Promise.resolve({ countryCode, data: [] });
      }
      
      try {
        const data = await fetchBudgetUsageForCountry(profileId, endpoint, campaignIds);
        return ({ countryCode, data });
      } catch (error) {
        console.error(`Failed to fetch budget for ${countryCode}:`, error);
        return { countryCode, data: [], error: error.message };
      }
    });
    
    // 3. 并行执行所有请求
    const results = await Promise.all(requests);
    res.json(results.data);
  } catch (error) {
    console.error('Failed to fetch your budget usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch your budget usage',
      details: error.message
    });
  }
});

// 获取所有国家的预算使用情况
router.post('/budget', async (req, res) => {
  
  try {
    // 0. 获取国家参数
    const { country } = req.query;
    if (!country) {
      return res.status(400).json({ 
        success: false,
        message: 'No country supplied!' 
      });
    }

    // 1. 获取所有国家的Profile ID
    const countryProfiles = await getCountryProfiles();
    const { profileId, endpoint } = countryProfiles.find(profile => profile.countryCode === country.toUpperCase());
    const { access_token } = await getAccessToken();
    
    const response = await axios.post(
      `${endpoint}/sp/campaigns/budget/usage`,
      req.body,
      {
        headers: {
          'Amazon-Advertising-API-ClientId': process.env.ADS_API_CLIENT_ID,
          'Amazon-Advertising-API-Scope': profileId,
          'Authorization': `Bearer ${access_token}`,
          'Accept': 'application/vnd.spcampaignbudgetusage.v1+json'
        },
        timeout: 10000
      }
    );
    
    // 3. 组织响应数据
    res.json(response.data);
  } catch (error) {
    console.error('Failed to fetch multi-country budget usage:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch multi-country budget usage',
      details: error.message
    });
  }
});


module.exports = router;