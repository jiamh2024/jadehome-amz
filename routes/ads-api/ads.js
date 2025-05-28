const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');

// 获取亚马逊广告API访问令牌
async function getAccessToken() {
  try {
    const response = await axios.post(
      `https://api.amazon.com/auth/o2/token`,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: process.env.AMAZON_REFRESH_TOKEN,
        client_id: process.env.AMAZON_CLIENT_ID,
        client_secret: process.env.AMAZON_CLIENT_SECRET,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting access token:', error.response?.data || error.message);
    throw new Error('Failed to get access token');
  }
}

// 生成亚马逊广告API签名
function generateSignature(accessToken, request) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto.createHmac('sha256', process.env.AMAZON_CLIENT_SECRET)
    .update(`${accessToken}\n${timestamp}\n${request}`)
    .digest('base64');
    
  return { signature, timestamp };
}

// 获取广告活动数据
router.get('/campaigns', async (req, res) => {
  try {
    // 1. 获取访问令牌
    const accessToken = await getAccessToken();
    
    // 2. 准备请求参数
    const profileId = process.env.AMAZON_PROFILE_ID || req.query.profileId;
    if (!profileId) {
      return res.status(400).json({ error: 'Missing profile ID' });
    }
    
    const apiUrl = `https://advertising-api.amazon.com/v2/campaigns`;
    const queryParams = {
      portfolioIdFilter: req.query.portfolioId,
      campaignIdFilter: req.query.campaignId,
      nameFilter: req.query.name,
      stateFilter: req.query.state || 'enabled,paused',
      count: req.query.count || 1000,
    };
    
    // 3. 生成签名
    const { signature, timestamp } = generateSignature(accessToken, apiUrl);
    
    // 4. 调用亚马逊广告API
    const response = await axios.get(apiUrl, {
      params: queryParams,
      headers: {
        'Amazon-Advertising-API-ClientId': process.env.AMAZON_CLIENT_ID,
        'Amazon-Advertising-API-Scope': profileId,
        'Authorization': `Bearer ${accessToken}`,
        'Amazon-Advertising-API-Timestamp': timestamp,
        'X-Amz-Signature': signature,
      },
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching campaigns:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to fetch campaigns',
      details: error.response?.data || error.message 
    });
  }
});

module.exports = router;