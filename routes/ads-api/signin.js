const express = require('express');
const axios = require('axios');
const qs = require('querystring');
const router = express.Router();
const redisStorage = require('../../db/redis');
const { randomBytes, timingSafeEqual } = require('crypto');

router.get('/start', (req, res) => {
  if (!process.env.ADS_API_CLIENT_ID || !process.env.ADS_SIGNIN_URL) {
    return res.status(500).send('Amazon Ads authentication is not configured.');
  }

  const state = randomBytes(32).toString('hex');
  const redirectUri = new URL(process.env.ADS_SIGNIN_URL);
  const authorizationUrl = new URL('https://www.amazon.com/ap/oa');
  authorizationUrl.search = new URLSearchParams({
    client_id: process.env.ADS_API_CLIENT_ID,
    scope: 'advertising::campaign_management',
    response_type: 'code',
    redirect_uri: redirectUri.toString(),
    state
  }).toString();

  res.cookie('ads_oauth_state', state, {
    httpOnly: true,
    secure: redirectUri.protocol === 'https:',
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000,
    path: '/signin'
  });
  return res.redirect(authorizationUrl.toString());
});

// 处理亚马逊回调（GET /signin?code=xxx&scope=xxx）
router.get('/', async (req, res) => {
  const { code, scope, state } = req.query;

  // 验证必要参数
  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' });
  }
  const expectedState = req.cookies.ads_oauth_state;
  res.clearCookie('ads_oauth_state', { path: '/signin' });
  const receivedStateBuffer = typeof state === 'string' ? Buffer.from(state) : null;
  const expectedStateBuffer = typeof expectedState === 'string' ? Buffer.from(expectedState) : null;
  if (
    !receivedStateBuffer ||
    !expectedStateBuffer ||
    receivedStateBuffer.length !== expectedStateBuffer.length ||
    !timingSafeEqual(receivedStateBuffer, expectedStateBuffer)
  ) {
    return res.status(400).send('Amazon Ads authorization state is invalid or expired. Start authorization again.');
  }

  try {
    // 用授权码交换access token
    console.log('Exchanging authorization code for access token...');

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
    const accessTokenStored = await redisStorage.storeToken(
      'ads_access_token',
      { access_token, refresh_token, expires_in },
      expires_in
    );
    if (!accessTokenStored) {
      throw new Error('Failed to store Amazon Ads access token');
    }
    if (refresh_token) {
      const refreshTokenStored = await redisStorage.storeToken('ads_refresh_token', refresh_token, 0);
      if (!refreshTokenStored) {
        throw new Error('Failed to store Amazon Ads refresh token');
      }
    }
    const authenticatedAtStored = await redisStorage.storeToken(
      'ads_authenticated_at',
      new Date().toISOString(),
      0
    );
    if (!authenticatedAtStored) {
      throw new Error('Failed to store Amazon Ads authentication time');
    }

    //res.json({
    //  redirect: '/compaigns',
    //  message: 'Authentication successful',
    //  access_token: access_token,
    //  refresh_token: refresh_token,
    //  expires_in: expires_in,
    //  scope: scope
    //});
    res.redirect('/campaigns');
    
  } catch (error) {
    console.error('Token exchange failed:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to exchange authorization code',
      details: error.response?.data || error.message
    });
  }
});

module.exports = router;