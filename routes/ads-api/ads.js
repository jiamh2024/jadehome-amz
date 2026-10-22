const express = require('express');
const router = express.Router();
const axios = require('axios');
const qs = require('querystring');
const { body, validationResult } = require('express-validator');
const _ = require('lodash');
const redisStorage = require('../../db/redis');
const { gunzipSync } = require('zlib');

// 国家配置
const SUPPORTED_COUNTRIES = [
  { code: 'US', name: '美国', endpoint: 'https://advertising-api.amazon.com' },
  { code: 'CA', name: '加拿大', endpoint: 'https://advertising-api.amazon.com' },
  { code: 'UK', name: '英国', endpoint: 'https://advertising-api-eu.amazon.com' },
  { code: 'AE', name: '阿联酋', endpoint: 'https://advertising-api-eu.amazon.com' },
  { code: 'SA', name: '沙特', endpoint: 'https://advertising-api-eu.amazon.com' }
];
// 获取访问令牌（使用client credentials方式）
async function getAccessToken() {
  try {
    const cachedToken = await redisStorage.getToken('ads_access_token');
    if (cachedToken?.access_token) {
      return cachedToken;
    }

    const refreshToken = await redisStorage.getToken('ads_refresh_token');
    if (!refreshToken) {
      const error = new Error('Amazon Ads authentication is required');
      error.code = 'ADS_AUTH_REQUIRED';
      throw error;
    }

    const response = await axios.post(
      'https://api.amazon.com/auth/o2/token',
      qs.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.ADS_API_CLIENT_ID,
        client_secret: process.env.ADS_API_CLIENT_SECRET
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, timeout: 15000 }
    );

    const token = response.data;
    if (!token?.access_token || !token.expires_in) {
      throw new Error('Amazon Ads returned an invalid access token response');
    }
    const stored = await redisStorage.storeToken('ads_access_token', token, token.expires_in);
    if (!stored) {
      throw new Error('Failed to cache refreshed Amazon Ads access token');
    }
    if (token.refresh_token) {
      const refreshTokenStored = await redisStorage.storeToken('ads_refresh_token', token.refresh_token, 0);
      if (!refreshTokenStored) {
        throw new Error('Failed to cache refreshed Amazon Ads refresh token');
      }
    }
    return token;
  } catch (error) {
    console.error('Amazon Ads access token request failed:', error.response?.data || error.message);
    throw error;
  }
}

router.get('/auth/status', async (req, res) => {
  try {
    await getAccessToken();
    const authenticatedAt = await redisStorage.getToken('ads_authenticated_at');
    res.json({
      authenticated: true,
      authenticatedAt: typeof authenticatedAt === 'string' ? authenticatedAt : null
    });
  } catch (error) {
    if (error.code === 'ADS_AUTH_REQUIRED' || [400, 401].includes(error.response?.status)) {
      return res.status(401).json({ authenticated: false });
    }
    console.error('Failed to verify Amazon Ads authentication:', error.response?.data || error.message);
    return res.status(503).json({
      authenticated: false,
      message: 'Unable to verify Amazon Ads authentication right now'
    });
  }
});

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
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: `No Amazon Ads profile found for ${country.toUpperCase()}`
      });
    }

    const {profileId, endpoint, countryCode} = profile;
    
    // 2. 获取该国家的广告活动
    try {
      const campaigns = await fetchCampaignsForCountry(profileId, endpoint);
      res.json(campaigns);

    } catch (error) {
      console.error(`Failed to fetch campaigns for ${countryCode}:`, error);
      return res.status(error.response?.status || 502).json({
        success: false,
        countryCode,
        campaigns: [],
        error: error.message
      });
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
  const { access_token } = await getAccessToken();
  const campaigns = [];
  const seenNextTokens = new Set();
  let nextToken;

  do {
    const requestBody = {
      adProductFilter: { include: ['SPONSORED_PRODUCTS'] },
      maxResults: 1000
    };
    if (nextToken) {
      requestBody.nextToken = nextToken;
    }

    const response = await axios.post(
      `${endpoint}/adsApi/v1/query/campaigns`,
      requestBody,
      {
        headers: {
          'Amazon-Advertising-API-ClientId': process.env.ADS_API_CLIENT_ID,
          'Amazon-Advertising-API-Scope': String(profileId),
          Authorization: `Bearer ${access_token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    if (!Array.isArray(response.data?.campaigns)) {
      throw new Error('Amazon Ads v1 campaign query returned an invalid response');
    }
    campaigns.push(...response.data.campaigns.map(campaign => {
      const monetaryBudget = campaign.budgets?.[0]?.budgetValue
        ?.monetaryBudgetValue?.monetaryBudget;
      return {
        ...campaign,
        campaignId: String(campaign.campaignId),
        startDate: campaign.startDateTime?.slice(0, 10),
        endDate: campaign.endDateTime?.slice(0, 10),
        budget: {
          ...(campaign.budget || {}),
          budget: monetaryBudget?.value ?? 0,
          currencyCode: monetaryBudget?.currencyCode,
          recurrenceTimePeriod: campaign.budgets?.[0]?.recurrenceTimePeriod
        }
      };
    }));

    nextToken = response.data.nextToken || null;
    if (nextToken) {
      if (seenNextTokens.has(nextToken)) {
        throw new Error('Amazon Ads v1 campaign query returned a repeated nextToken');
      }
      seenNextTokens.add(nextToken);
    }
  } while (nextToken);

  return { campaigns };
}

function getCampaignReportDateRange(period) {
  const days = { day: 1, week: 7, month: 30 }[period];
  if (!days) {
    throw new Error('Invalid campaign order period');
  }

  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setUTCDate(startDate.getUTCDate() - days + 1);
  return {
    startDate: startDate.toISOString().slice(0, 10),
    endDate: endDate.toISOString().slice(0, 10)
  };
}

async function createCampaignSalesReport(profileId, endpoint, period) {
  const token = await getAccessToken();
  const headers = {
    'Amazon-Advertising-API-ClientId': process.env.ADS_API_CLIENT_ID,
    'Amazon-Advertising-API-Scope': String(profileId),
    Authorization: `Bearer ${token.access_token}`,
    Accept: 'application/vnd.createasyncreportrequest.v3+json',
    'Content-Type': 'application/vnd.createasyncreportrequest.v3+json'
  };
  const { startDate, endDate } = getCampaignReportDateRange(period);
  let reportId;

  try {
    const response = await axios.post(`${endpoint}/reporting/reports`, {
      name: `Campaign sales ${period} ${endDate}`,
      startDate,
      endDate,
      configuration: {
        adProduct: 'SPONSORED_PRODUCTS',
        groupBy: ['campaign'],
        columns: ['campaignId', 'sales14d'],
        reportTypeId: 'spCampaigns',
        timeUnit: 'SUMMARY',
        format: 'GZIP_JSON'
      }
    }, { headers, timeout: 30000 });
    reportId = response.data?.reportId;
  } catch (error) {
    const duplicateDetail = error.response?.data?.detail;
    const duplicateMatch = typeof duplicateDetail === 'string'
      ? duplicateDetail.match(/The Request is a duplicate of\s*:\s*([a-f\d-]+)/i)
      : null;
    if (error.response?.status !== 425 || !duplicateMatch) {
      throw error;
    }
    reportId = duplicateMatch[1];
  }

  if (!reportId) {
    throw new Error('Amazon Ads did not return a campaign sales report ID');
  }
  return reportId;
}

async function getCampaignSalesReport(profileId, endpoint, reportId) {
  const token = await getAccessToken();
  const response = await axios.get(
    `${endpoint}/reporting/reports/${encodeURIComponent(reportId)}`,
    {
      headers: {
        'Amazon-Advertising-API-ClientId': process.env.ADS_API_CLIENT_ID,
        'Amazon-Advertising-API-Scope': String(profileId),
        Authorization: `Bearer ${token.access_token}`,
        Accept: 'application/vnd.getasyncreportresponse.v3+json'
      },
      timeout: 15000
    }
  );
  const report = response.data;

  if (report.status === 'FAILURE' || report.status === 'CANCELLED') {
    throw new Error(report.statusDetails || `Amazon Ads report ${report.status.toLowerCase()}`);
  }
  if (report.status !== 'COMPLETED') {
    return { status: report.status || 'PROCESSING' };
  }
  if (!report.url) {
    throw new Error('Completed Amazon Ads report did not include a download URL');
  }

  const download = await axios.get(report.url, {
    responseType: 'arraybuffer',
    timeout: 30000
  });
  const rows = JSON.parse(gunzipSync(download.data).toString('utf8'));
  if (!Array.isArray(rows)) {
    throw new Error('Amazon Ads campaign sales report returned an invalid format');
  }

  return {
    status: 'COMPLETED',
    data: rows.map(row => ({
      campaignId: String(row.campaignId),
      sales: Number(row.sales14d) || 0
    }))
  };
}

router.post('/campaigns/:campaignId/sales', async (req, res) => {
  try {
    const { country } = req.query;
    const { period } = req.body;
    if (!country) {
      return res.status(400).json({ success: false, message: 'No country supplied!' });
    }
    if (!['day', 'week', 'month'].includes(period)) {
      return res.status(400).json({ success: false, message: 'Invalid campaign sales period' });
    }
    if (!/^\d+$/.test(req.params.campaignId)) {
      return res.status(400).json({ success: false, message: 'Invalid campaign ID' });
    }

    const profile = (await getCountryProfiles()).find(
      item => item.countryCode === country.toUpperCase()
    );
    if (!profile) {
      return res.status(400).json({ success: false, message: 'Unsupported country' });
    }

    const reportId = await createCampaignSalesReport(profile.profileId, profile.endpoint, period);
    res.status(202).json({ success: true, pending: true, reportId });
  } catch (error) {
    console.error('Failed to create campaign sales report:', error.response?.data || error.message);
    const upstreamDetails = error.response?.data;
    res.status(500).json({
      success: false,
      message: error.response
        ? `Amazon Ads report creation failed (HTTP ${error.response.status})`
        : error.message || 'Failed to create campaign sales report',
      stage: 'create_report',
      upstreamStatus: error.response?.status || null,
      details: upstreamDetails || null
    });
  }
});

router.get('/campaigns/sales/:reportId', async (req, res) => {
  try {
    const { country, campaignId } = req.query;
    const { reportId } = req.params;
    if (!country || !campaignId) {
      return res.status(400).json({ success: false, message: 'Country and campaignId are required' });
    }
    if (!/^[a-f\d-]+$/i.test(reportId) || !/^\d+$/.test(campaignId)) {
      return res.status(400).json({ success: false, message: 'Invalid report or campaign ID' });
    }

    const profile = (await getCountryProfiles()).find(
      item => item.countryCode === country.toUpperCase()
    );
    if (!profile) {
      return res.status(400).json({ success: false, message: 'Unsupported country' });
    }

    const report = await getCampaignSalesReport(profile.profileId, profile.endpoint, reportId);
    if (report.status !== 'COMPLETED') {
      return res.status(202).json({ success: true, pending: true, status: report.status });
    }

    const campaignSales = report.data.find(item => item.campaignId === campaignId) || {
      campaignId,
      sales: 0
    };
    const currencyCodes = { US: 'USD', CA: 'CAD', UK: 'GBP', AE: 'AED', SA: 'SAR' };
    res.json({
      success: true,
      pending: false,
      data: {
        ...campaignSales,
        currencyCode: campaignSales.currencyCode || currencyCodes[country.toUpperCase()]
      }
    });
  } catch (error) {
    console.error('Failed to fetch campaign sales report:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: error.response
        ? `Amazon Ads report status lookup failed (HTTP ${error.response.status})`
        : error.message || 'Failed to fetch campaign sales report',
      stage: 'get_report',
      upstreamStatus: error.response?.status || null,
      details: error.response?.data || null
    });
  }
});

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