// 配置参数（从环境变量获取）
const config = {
  clientId: process.env.SP_API_CLIENT_ID,
  clientSecret: process.env.SP_API_CLIENT_SECRET,
  refreshToken: process.env.SP_API_REFRESH_TOKEN,
  marketplaceId: 'ATVPDKIKX0DER', // 美国市场
  endpoint: process.env.SP_API_ENDPOINT || 'https://sandbox.sellingpartnerapi-na.amazon.com',
  roleArn: process.env.SP_API_ROLE_ARN,
  awsAccessKey: process.env.AWS_ACCESS_KEY,
  awsSecretKey: process.env.AWS_SECRET_KEY
};

// 缓存access token
let accessToken = null;
let tokenExpires = 0;

/**
 * 获取Access Token
 */
async function getAccessToken() {
  // 如果token未过期，直接返回缓存的token
  if (accessToken && Date.now() < tokenExpires) {
    return accessToken;
  }

  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('client_id', config.clientId);
    params.append('client_secret', config.clientSecret);
    params.append('refresh_token', config.refreshToken);

    const response = await axios.post('https://api.amazon.com/auth/o2/token', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    accessToken = response.data.access_token;
    tokenExpires = Date.now() + (response.data.expires_in - 60) * 1000; // 提前60秒过期

    return accessToken;
  } catch (error) {
    console.error('获取Access Token失败:', error.response?.data || error.message);
    throw new Error('Failed to get access token');
  }
}

/**
 * 生成SP-API请求签名
 */
function createSignature(request) {
  const { method, url, headers, body } = request;
  const canonicalUri = new URL(url).pathname;
  const canonicalQueryString = ''; // 简化示例，实际需要处理查询参数
  
  const canonicalHeaders = Object.entries(headers)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, value]) => `${key.toLowerCase()}:${value}\n`)
    .join('');
  
  const signedHeaders = Object.keys(headers)
    .map(h => h.toLowerCase())
    .sort()
    .join(';');
  
  const payloadHash = crypto.createHash('sha256')
    .update(body || '')
    .digest('hex');
  
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');
  
  // 简化签名过程，实际需要按照AWS SigV4规范实现
  return {
    signature: 'SimulatedSignatureForDemo', // 实际项目需要真实计算
    signedHeaders
  };
}


module.exports = {
  query: (sql, params) => {
    return new Promise((resolve, reject) => {
      pool.query(sql, params, (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
  },
  connect: callback => pool.getConnection(callback)
};