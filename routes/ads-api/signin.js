const express = require('express');
const axios = require('axios');
const qs = require('querystring');
const router = express.Router();
const redisStorage = require('../../db/redis');


// 处理亚马逊回调（GET /signin?code=xxx&scope=xxx）
router.get('/', async (req, res) => {
  const { code, scope } = req.query;

  // 验证必要参数
  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }

  try {
    // 用授权码交换access token
    console.log('Exchanging authorization code for access token...');
    console.log('Authorization code:', code); 
    console.log('Scope:', scope);
    console.log('Redirect URI:', process.env.ADS_SIGNIN_URL);

    const tokenResponse = await axios.post(
      'https://api.amazon.com/auth/o2/token',
      qs.stringify({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.ADS_SIGNIN_URL, // 必须与请求时一致
        client_id: process.env.ADS_API_CLIENT_ID,
        client_secret: process.env.ADS_API_CLIENT_SECRET
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    // 成功获取token（实际生产环境应安全存储）
    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    console.log('Successfully obtained access token');

    // 将token存储到Redis（假设redisStorage是一个Redis存储实例）
    await redisStorage.storeToken('ads_access_token', { access_token, refresh_token, expires_in }, expires_in);

    //res.json({
    //  redirect: '/compaigns',
    //  message: 'Authentication successful',
    //  access_token: access_token,
    //  refresh_token: refresh_token,
    //  expires_in: expires_in,
    //  scope: scope
    //});
    res.redirect(process.env.ADS_RETURN_URL); // 重定向到主页或其他页面
    
  } catch (error) {
    console.error('Token exchange failed:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to exchange authorization code',
      details: error.response?.data || error.message
    });
  }
});

module.exports = router;