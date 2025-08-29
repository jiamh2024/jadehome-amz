const express = require('express');
const router = express.Router();
const axios = require('axios');
const { getAccessToken } = require('./amz-api'); // 重用现有的获取访问令牌函数
const db = require('../../db/db'); // 引入数据库连接

// 亚马逊市场配置（包含美国、加拿大、英国、阿联酋和沙特）
const MARKETPLACES = {
  US: { id: 'ATVPDKIKX0DER', endpoint: process.env.SP_API_EP_NA, currency: 'USD', name: '美国', sellerid: 'A2Q56CIW8HZ8PF'},
  CA: { id: 'A2EUQ1WTGCTBG2', endpoint: process.env.SP_API_EP_NA, currency: 'CAD', name: '加拿大', sellerid: 'A2Q56CIW8HZ8PF' },
  UK: { id: 'A1F83G8C2ARO7P', endpoint: process.env.SP_API_EP_EU, currency: 'GBP', name: '英国', sellerid: 'AE1SVHWQCVX69' },
  AE: { id: 'A2VIGQ35RCS4UG', endpoint: process.env.SP_API_EP_EU, currency: 'AED', name: '阿联酋', sellerid: 'A2W0DT8T16LN3S' },
  SA: { id: 'A17E79C6D8DWNP', endpoint: process.env.SP_API_EP_EU, currency: 'SAR', name: '沙特', sellerid: 'A3AGV4FIOLIXNZ' },
};

/**
 * 从数据库获取所有需要处理的SKU数据
 */
async function getSkuDataFromDatabase(skuCode = null) {
  try {
    let query = 'SELECT * FROM product_sku WHERE is_active = 1';
    let params = [];
    
    if (skuCode) {
      query += ' AND sku_code = ?';
      params.push(skuCode);
    }
    
    const rows = await db.query(query, params);
    //onsole.log('查询SQL:', query);
    //console.log('查询参数:', params);
    //console.log('从数据库获取的SKU数据:', rows);
    return rows;
  } catch (error) {
    console.error('从数据库获取SKU数据失败:', error);
    throw new Error('Failed to get SKU data from database');
  }
}

/**
 * 检查产品在亚马逊上的发布状态
 */
async function checkProductListingStatus(marketplaceId, skuCode) {
  try {
    const accessToken = await getAccessToken(marketplaceId);
    const endpoint = MARKETPLACES[marketplaceId].endpoint;
    const url = `${endpoint}/listings/2021-08-01/items/${MARKETPLACES[marketplaceId].sellerid}/${skuCode}`;

    const response = await axios.get(url, {
      headers: {
        'x-amz-access-token': accessToken,
        'User-Agent': process.env.SP_API_USER_AGENT || 'My-App/1.0'
      },
      params: {
        marketplaceIds: MARKETPLACES[marketplaceId].id,
        includedData: 'summaries,attributes'
      }
    });
    
    // 从API响应中提取销售价格信息
    let price = null;
    
    // 优先从purchasable_offer中提取折扣价格
    if (response.data && response.data.attributes && response.data.attributes.purchasable_offer) {
      //console.log('API响应数据purchasable_offer:', response.data.attributes.purchasable_offer);
      
      // 遍历所有purchasable_offer
      for (const offer of response.data.attributes.purchasable_offer) {
        // 检查是否有折扣价格
        if (offer.discounted_price && offer.discounted_price.length > 0) {
          const discount = offer.discounted_price[0];
          
          // 检查折扣价格的schedule
          if (discount.schedule && discount.schedule.length > 0) {
            const schedule = discount.schedule[0];
            
            // 创建价格对象
            price = {
              CurrencyCode: offer.currency || MARKETPLACES[marketplaceId].currency,
              Amount: schedule.value_with_tax || 0
            };
            break; // 找到一个折扣价格后就退出循环
          }
        }
      }
    }
    
    // 如果API调用成功且有响应数据，则表示产品已发布
    const finalPrice = price || {
      CurrencyCode: MARKETPLACES[marketplaceId].currency,
      Amount: 0
    };
    //console.log(`产品发布状态检查成功 (${marketplaceId}, ${skuCode}, ${finalPrice.Amount})`);
    return {
      isListed: true,
      data: response.data,
      price: finalPrice
    };
  } catch (error) {
    // 如果返回404错误，说明产品未发布
    if (error.response && error.response.status === 404) {
      console.log(`产品未发布 (${marketplaceId}, ${skuCode})`);
      return {
        isListed: false,
        data: null
      };
    }
    
    // 处理获取Access Token失败的情况
    if (error.message === 'Failed to get access token') {
      console.warn(`无法检查产品发布状态 (${marketplaceId}, ${skuCode})：Access Token获取失败`);
      return {
        isListed: false,
        data: null,
        tokenError: true
      };
    }
    
    // 其他错误情况
    console.warn(`检查产品发布状态失败 (${marketplaceId}, ${skuCode})：${error.message}`);
    return {
      isListed: false,
      data: null,
      error: error.message
    };
  }
}

/**
 * 批量检查多个产品在特定市场的发布状态
 */
async function batchCheckListingStatuses(marketplaceId, skuCodes) {
  try {
    const statusPromises = skuCodes.map(skuCode => 
      checkProductListingStatus(marketplaceId, skuCode).catch(error => ({
        skuCode,
        isListed: false,
        error: error.message
      }))
    );
    
    const results = await Promise.all(statusPromises);
    
    // 整理结果为对象，键为SKU编码
    const statusMap = {};
    results.forEach((result, index) => {
      statusMap[skuCodes[index]] = result;
    });
    
    return statusMap;
  } catch (error) {
    console.error('批量检查发布状态失败:', error);
    throw new Error('Failed to batch check listing statuses');
  }
}

/**
 * 从数据库获取产品属性
 */
async function getProductAttributes(skuCode, countryCode) {
  try {
    // 使用amz_pd_kv表（从之前的表结构看，这个表存储了产品规格键值对）
    const [rows] = await db.query(
      `SELECT spec_key, spec_value FROM amz_pd_kv WHERE sku_code = ? AND country_code = ?`,
      [skuCode, countryCode.toLowerCase()]
    );
    
    const attributes = {};
    rows.forEach(row => {
      attributes[row.spec_key] = row.spec_value;
    });
    
    return attributes;
  } catch (error) {
    console.error(`获取产品属性失败 (${skuCode}, ${countryCode}):`, error);
    throw new Error('Failed to get product attributes');
  }
}

/**
 * 使用Listings Items API发布产品到亚马逊平台
 */
async function publishProductUsingListingsAPI(marketplaceId, skuData) {
  try {
    const { sku_code: skuCode, product_name, length, width, height, weight, has_battery, battery_type } = skuData;
    
    // 1. 获取访问令牌
    const accessToken = await getAccessToken(marketplaceId);
    
    // 2. 获取产品属性
    const attributes = await getProductAttributes(skuCode, marketplaceId);
    
    // 3. 准备API请求数据
    const endpoint = MARKETPLACES[marketplaceId].endpoint;
    const url = `${endpoint}/listings/2021-08-01/items/${MARKETPLACES[marketplaceId].sellerid}/${skuCode}`;
    
    const productData = {
      productType: 'PRODUCT',
      requirements: 'LISTING',
      attributes: {
        // 基础信息
        sku: skuCode,
        title: product_name,
        description: attributes.description || `${product_name} 详细描述`,
        brandName: attributes.brandName || 'Generic',
        manufacturer: attributes.manufacturer || 'Generic',
        // 分类信息
        productCategory: attributes.productCategory || 'Home & Kitchen',
        // 库存信息
        fulfillmentLatency: '2', // 默认2天发货
        // 销售条款
        conditionType: 'New',
        // 图片信息（如果有）
        ...(attributes.main_image_url ? { main_image_url: attributes.main_image_url } : {}),
        // 其他属性
        ...attributes
      },
      dimensions: {
        length: length.toString(),
        width: width.toString(),
        height: height.toString(),
        unit: 'CENTIMETERS'
      },
      weight: {
        value: weight.toString(),
        unit: 'KILOGRAMS'
      },
      // 电池信息（如果产品含电池）
      ...(has_battery ? {
        battery: {
          type: battery_type,
          is_contained: true
        }
      } : {})
    };
    
    console.log('准备发布的产品数据:', productData);
    
    // 4. 调用Amazon Listings Items API
    const response = await axios.post(url, productData, {
      headers: {
        'x-amz-access-token': accessToken,
        'User-Agent': process.env.SP_API_USER_AGENT || 'My-App/1.0',
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`产品发布成功 (${marketplaceId}, ${skuCode}):`, response.data);
    
    // 5. 如果产品有ASIN，更新数据库
    if (response.data.asin) {
      await db.execute(
        'UPDATE product_sku SET asin = ? WHERE sku_code = ?',
        [response.data.asin, skuCode]
      );
    }
    
    return response.data;
  } catch (error) {
    console.error(`发布产品失败 (${marketplaceId}, ${skuCode}):`, error.response?.data || error.message);
    throw new Error(`Failed to publish product to Amazon: ${error.message}`);
  }
}

/**
 * 使用Listings Items API更新产品信息
 */
async function updateProductUsingListingsAPI(marketplaceId, skuCode, updateData) {
  try {
    // 1. 获取访问令牌
    const accessToken = await getAccessToken(marketplaceId);
    
    // 2. 准备API请求数据
    const endpoint = MARKETPLACES[marketplaceId].endpoint;
    const url = `${endpoint}/listings/2021-08-01/items/${MARKETPLACES[marketplaceId].sellerid}/${skuCode}`;
    
    // 3. 调用Amazon Listings Items API进行更新
    const response = await axios.put(url, updateData, {
      headers: {
        'x-amz-access-token': accessToken,
        'User-Agent': process.env.SP_API_USER_AGENT || 'My-App/1.0',
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`产品更新成功 (${marketplaceId}, ${skuCode}):`, response.data);
    return response.data;
  } catch (error) {
    console.error(`更新产品失败 (${marketplaceId}, ${skuCode}):`, error.response?.data || error.message);
    throw new Error(`Failed to update product: ${error.message}`);
  }
}

/**
 * 一次性获取所有5个市场的产品价格
 * 使用Listings Items API中的折扣价格数据，避免额外的API调用
 */
async function getProductPricesInAllMarketplaces(skuCode) {
  try {
    // 并行获取所有市场的价格 - 使用checkProductListingStatus函数，该函数已经从Listings Items API中提取折扣价格
    const marketplaceIds = Object.keys(MARKETPLACES);
    const pricePromises = marketplaceIds.map(async (marketplaceId) => {
      try {
        // 使用Listings Items API获取价格信息
        const statusResult = await checkProductListingStatus(marketplaceId, skuCode);
        
        // 构建与原getProductPriceInMarketplace相同格式的返回数据
        if (statusResult.isListed && statusResult.price) {
          return {
            marketplaceId,
            status: 'success',
            price: {
              amount: statusResult.price.Amount,
              currencyCode: statusResult.price.CurrencyCode
            },
            listingStatus: 'listed'
          };
        } else {
          return {
            marketplaceId,
            status: 'not_listed',
            price: {
              amount: 0,
              currencyCode: MARKETPLACES[marketplaceId].currency
            },
            listingStatus: 'not_listed'
          };
        }
      } catch (error) {
        console.warn(`获取市场${marketplaceId}的价格失败:`, error);
        return {
          marketplaceId,
          status: 'error',
          price: {
            amount: 0,
            currencyCode: MARKETPLACES[marketplaceId].currency
          },
          error: error.message
        };
      }
    });
    
    const prices = await Promise.all(pricePromises);
    
    // 整理结果
    const result = {};
    prices.forEach(priceData => {
      result[priceData.marketplaceId] = priceData;
    });
    
    return result;
  } catch (error) {
    console.error('获取多市场价格失败:', error);
    throw new Error('Failed to get prices from all marketplaces');
  }
}

/**
 * 设置产品价格
 */
async function setProductPrice(marketplaceId, skuCode, price) {
  try {
    const accessToken = await getAccessToken(marketplaceId);
    const endpoint = MARKETPLACES[marketplaceId].endpoint;
    const url = `${endpoint}/listings/2021-08-01/items/${MARKETPLACES[marketplaceId].sellerid}/${skuCode}`;
    
    const currency = MARKETPLACES[marketplaceId].currency;
    const requestBody = {
      "productType": "STRING_LIGHT",
      "patches": [
        {
          "op": "replace",
          "path": "/attributes/purchasable_offer",
          "value": [
                {
                  "discounted_price": [
                      {
                        "schedule": [
                            {
                                "end_at": "2028-08-01T07:00:00.000Z",
                                "start_at": "2025-06-01T07:00:00.000Z",
                                "value_with_tax": price
                            }
                          ]
                      }
                    ]
                }
            ]
        }
      ]
    };
    
    const response = await axios.patch(url, requestBody, {
      headers: {
        'x-amz-access-token': accessToken,
        'User-Agent': process.env.SP_API_USER_AGENT || 'My-App/1.0',
        'Content-Type': 'application/json'
      },
      params: {
        marketplaceIds: MARKETPLACES[marketplaceId].id,
        includedData: 'issues'
      }
    });
    
    console.log(`设置产品价格成功 (${marketplaceId}, ${skuCode}, ${price} ${currency}):`, response.data);
    
    return {
      success: true,
      message: '价格设置成功',
      newPrice: {
        amount: price,
        currencyCode: currency
      }
    };
  } catch (error) {
    console.error(`设置产品价格失败 (${marketplaceId}, ${skuCode}):`, error.response?.data || error.message);
    throw new Error(`Failed to set product price: ${error.message}`);
  }
}

/**
 * 获取市场列表（包含ID和名称）
 */
function getMarketplaceList() {
  return Object.keys(MARKETPLACES).map(key => ({
    id: key,
    name: MARKETPLACES[key].name,
    currency: MARKETPLACES[key].currency
  }));
}

// 路由定义

// 渲染SKU信息页面
router.get('/', async (req, res) => {
  try {
    // 获取市场列表传递给前端
    const marketplaces = getMarketplaceList();
    
    res.render('sp-api/amz-sku', {
      title: '亚马逊多国SKU信息',
      marketplaces: marketplaces
    });
  } catch (error) {
    console.error('渲染SKU页面失败:', error);
    res.status(500).send('服务器错误');
  }
});

// API: 获取数据库中的SKU数据及其在各市场的发布状态
router.get('/api/database-skus', async (req, res) => {
  try {
    // 获取数据库中的SKU数据
    const skus = await getSkuDataFromDatabase();
    
    // 如果没有SKU数据，直接返回
    if (!skus || skus.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }
    
    // 并行处理每个市场的发布状态检查
    const marketplaceIds = Object.keys(MARKETPLACES);
    const skuCodes = skus.map(sku => sku.sku_code);
    
    // 为每个市场创建一个Promise来检查所有SKU的发布状态
    const marketStatusPromises = marketplaceIds.map(async (marketplaceId) => {
      try {
        const statusMap = await batchCheckListingStatuses(marketplaceId, skuCodes);
        return {
          marketplaceId,
          statusMap
        };
      } catch (error) {
        console.error(`获取市场${marketplaceId}的发布状态失败:`, error);
        // 如果获取状态失败，返回空的状态映射
        return {
          marketplaceId,
          statusMap: {}
        };
      }
    });
    
    // 等待所有市场的发布状态检查完成
    const marketStatusResults = await Promise.all(marketStatusPromises);
    
    // 将发布状态和价格信息整合到SKU数据中
    const skusWithStatus = skus.map(sku => {
      const skuWithStatus = { ...sku };
      
      // 为每个市场添加发布状态、价格信息和可能的错误信息
      marketplaceIds.forEach(marketplaceId => {
        const marketResult = marketStatusResults.find(result => result.marketplaceId === marketplaceId);
        const skuStatus = marketResult?.statusMap[sku.sku_code] || { isListed: false };
        
        // 以marketplaceId为键存储发布状态
        skuWithStatus[`is_listed_${marketplaceId}`] = skuStatus.isListed;
        
        // 存储价格信息
        if (skuStatus.price) {
          skuWithStatus[`price_${marketplaceId}`] = skuStatus.price;
          skuWithStatus[`selling_price_${marketplaceId}`] = skuStatus.price.Amount; // 额外存储一个直接的价格数值
          //console.log(`已为SKU ${sku.sku_code}的${marketplaceId}市场设置价格:`, skuStatus.price);
        } else {
          // 如果没有价格信息，设置默认值
          skuWithStatus[`price_${marketplaceId}`] = {
            CurrencyCode: MARKETPLACES[marketplaceId].currency,
            Amount: 0
          };
          skuWithStatus[`selling_price_${marketplaceId}`] = 0;
          console.log(`SKU ${sku.sku_code}的${marketplaceId}市场未找到价格信息，设置默认值`);
        }
        
        // 存储可能的错误信息
        if (skuStatus.tokenError) {
          skuWithStatus[`has_token_error_${marketplaceId}`] = true;
        }
        
        if (skuStatus.error) {
          skuWithStatus[`error_${marketplaceId}`] = skuStatus.error;
        }
      });
      
      return skuWithStatus;
    });
    
    res.json({
      success: true,
      data: skusWithStatus
    });
  } catch (error) {
    console.error('获取数据库SKU数据失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取数据库SKU数据失败'
    });
  }
});

// API: 获取市场列表
router.get('/api/marketplaces', (req, res) => {
  try {
    const marketplaces = getMarketplaceList();
    
    res.json({
      success: true,
      data: marketplaces
    });
  } catch (error) {
    console.error('获取市场列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取市场列表失败'
    });
  }
});

// API: 发布产品到亚马逊平台
router.post('/api/publish', async (req, res) => {
  try {
    const { marketplaceId, skuCode } = req.body;
    
    if (!marketplaceId || !skuCode) {
      return res.status(400).json({
        success: false,
        message: 'marketplaceId 和 skuCode 是必填项'
      });
    }
    
    if (!MARKETPLACES[marketplaceId]) {
      return res.status(400).json({
        success: false,
        message: '无效的 marketplaceId'
      });
    }
    
    // 获取SKU数据
    const skuData = (await getSkuDataFromDatabase(skuCode))[0];
    if (!skuData) {
      return res.status(404).json({
        success: false,
        message: `SKU ${skuCode} 不存在或未启用`
      });
    }
    
    // 发布产品
    const result = await publishProductUsingListingsAPI(marketplaceId, skuData);
    
    res.json({
      success: true,
      message: '产品发布成功',
      data: result
    });
  } catch (error) {
    console.error('发布产品API错误:', error);
    res.status(500).json({
      success: false,
      message: error.message || '发布产品失败'
    });
  }
});

// API: 更新产品信息
router.post('/api/update', async (req, res) => {
  try {
    const { marketplaceId, skuCode, updateData } = req.body;
    
    if (!marketplaceId || !skuCode || !updateData) {
      return res.status(400).json({
        success: false,
        message: 'marketplaceId、skuCode 和 updateData 是必填项'
      });
    }
    
    if (!MARKETPLACES[marketplaceId]) {
      return res.status(400).json({
        success: false,
        message: '无效的 marketplaceId'
      });
    }
    
    const result = await updateProductUsingListingsAPI(marketplaceId, skuCode, updateData);
    
    res.json({
      success: true,
      message: '产品更新成功',
      data: result
    });
  } catch (error) {
    console.error('更新产品API错误:', error);
    res.status(500).json({
      success: false,
      message: error.message || '更新产品失败'
    });
  }
});

// API: 获取单个市场的产品价格
router.get('/api/price', async (req, res) => {
  try {
    const { marketplaceId, skuCode } = req.query;
    
    if (!marketplaceId || !skuCode) {
      return res.status(400).json({
        success: false,
        message: 'marketplaceId 和 skuCode 是必填项'
      });
    }
    
    if (!MARKETPLACES[marketplaceId]) {
      return res.status(400).json({
        success: false,
        message: '无效的 marketplaceId'
      });
    }
    
    // 使用Listings Items API获取价格信息，避免额外调用products/pricing/v0/price接口
    const statusResult = await checkProductListingStatus(marketplaceId, skuCode);
    
    // 构建与原getProductPriceInMarketplace相同格式的返回数据
    let result;
    if (statusResult.isListed && statusResult.price) {
      result = {
        marketplaceId,
        status: 'success',
        price: {
          amount: statusResult.price.Amount,
          currencyCode: statusResult.price.CurrencyCode
        },
        listingStatus: 'listed'
      };
    } else {
      result = {
        marketplaceId,
        status: 'not_listed',
        price: {
          amount: 0,
          currencyCode: MARKETPLACES[marketplaceId].currency
        },
        listingStatus: 'not_listed'
      };
    }
    
    res.json({
      success: result.status === 'success',
      data: result
    });
  } catch (error) {
    console.error('获取产品价格API错误:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取产品价格失败'
    });
  }
});

// API: 一次性获取所有市场的产品价格
router.get('/api/prices/all', async (req, res) => {
  try {
    const { skuCode } = req.query;
    
    if (!skuCode) {
      return res.status(400).json({
        success: false,
        message: 'skuCode 是必填项'
      });
    }
    
    const result = await getProductPricesInAllMarketplaces(skuCode);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取多市场价格API错误:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取多市场价格失败'
    });
  }
});

// API: 设置产品价格
router.post('/api/price', async (req, res) => {
  try {
    const { marketplaceId, skuCode, price } = req.body;
    
    if (!marketplaceId || !skuCode || !price) {
      return res.status(400).json({
        success: false,
        message: 'marketplaceId、skuCode 和 price 是必填项'
      });
    }
    
    if (!MARKETPLACES[marketplaceId]) {
      return res.status(400).json({
        success: false,
        message: '无效的 marketplaceId'
      });
    }
    
    // 验证价格格式
    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue <= 0) {
      return res.status(400).json({
        success: false,
        message: '请输入有效的价格'
      });
    }
    
    const result = await setProductPrice(marketplaceId, skuCode, priceValue);
    
    res.json(result);
  } catch (error) {
    console.error('设置产品价格API错误:', error);
    res.status(500).json({
      success: false,
      message: error.message || '设置产品价格失败'
    });
  }
});

module.exports = router;