const redis = require('redis');
const { promisify } = require('util');

class RedisStorage {
  constructor() {

    console.log('Initializing Redis storage...');
    console.log('Redis Host:', process.env.REDIS_HOST || 'localhost');
    console.log('Redis Port:', process.env.REDIS_PORT || 6379);

    this.client = redis.createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
      },
      password: process.env.REDIS_PASSWORD || '123',
      database: process.env.REDIS_DB || 0
    });
    
    // 将回调方法转为Promise
    //this.getAsync = promisify(this.client.get).bind(this.client);
    this.getAsync = this.client.get.bind(this.client);
    //this.setAsync = promisify(this.client.set).bind(this.client);
    this.setAsync = this.client.set.bind(this.client);
    //this.delAsync = promisify(this.client.del).bind(this.client);
    this.delAsync = this.client.del.bind(this.client);
    //this.expireAsync = promisify(this.client.expire).bind(this.client);
    this.expireAsync = this.client.expire.bind(this.client);
    
    this.client.on('error', (err) => {
      //console.error('Jadehome Redis error:', err);
    });

    try {
        this.client.connect();
        console.log('Connected to Redis successfully');
    } catch (err) {
        console.error('Failed to connect to Redis:', err);  
        throw new Error('Redis connection failed');
    }

  }

  async storeToken(key, tokenData, ttl) {
    try {

      console.log('Storing token in Redis:', key, tokenData);
      await this.setAsync(`amazon:${key}`, JSON.stringify(tokenData));
      if (ttl) {
        await this.expireAsync(`amazon:${key}`, ttl);
      }
      return true;
    } catch (err) {
      console.error('Failed to store token:', err);
      return false;
    }
  }

  async getToken(key) {
    try {
      console.log(`Retrieving ${key} from Redis:`, key);
      const data = await this.getAsync(`amazon:${key}`);
      console.log(`Retrieved ${key} from Redis:`, JSON.parse(data));
      return data ? JSON.parse(data) : null;
    } catch (err) {
      console.error('Failed to get token:', err);
      return null;
    }
  }

  async deleteToken(key) {
    try {
      await this.delAsync(`amazon:${key}`);
      return true;
    } catch (err) {
      console.error('Failed to delete token:', err);
      return false;
    }
  }
}

// 单例模式导出
module.exports = new RedisStorage();