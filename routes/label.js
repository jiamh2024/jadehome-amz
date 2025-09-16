var express = require('express');
var router = express.Router();
var db = require('../db/db');

// 标签生成页面
router.get('/generate', function(req, res, next) {
  // 使用Promise处理多个数据库查询
  Promise.all([
    // 查询所有SKU以供选择
    new Promise((resolve, reject) => {
      const sql = 'SELECT sku_code, product_name FROM product_sku WHERE is_active = 1';
      db.query(sql, function(error, skus) {
        if (error) {
          reject(error);
        } else {
          resolve(skus);
        }
      });
    }),
    
    // 查询所有国家以供选择
        new Promise((resolve, reject) => {
          const sql = 'SELECT id, country_name FROM country';
          db.query(sql, function(error, countries) {
            if (error) {
              reject(error);
            } else {
              // 转换列名，保持前端代码兼容性
              const formattedCountries = countries.map(country => ({
                id: country.id,
                name: country.country_name
              }));
              resolve(formattedCountries);
            }
          });
        }),
    
    // 查询所有标签模板以供选择
        new Promise((resolve, reject) => {
          const sql = 'SELECT id, length, width FROM label_template';
          db.query(sql, function(error, labelTemplates) {
            if (error) {
              reject(error);
            } else {
              resolve(labelTemplates);
            }
          });
        })
  ])
  .then(([skus, countries, labelTemplates]) => {
    res.render('generate', {
      title: '生成发货标签',
      skus: skus,
      countries: countries,
      labelTemplates: labelTemplates
    });
  })
  .catch(error => {
    next(error);
  });
});

// 标签模板列表页面
router.get('/ls', function(req, res, next) {
  res.render('label-ls', { title: '标签模板管理' });
});

// 添加标签模板页面
router.get('/add', function(req, res, next) {
  res.render('label-add', { title: '添加标签模板' });
});

// 编辑标签模板页面
router.get('/edit/:id', function(req, res, next) {
  res.render('label-edit', { title: '编辑标签模板', id: req.params.id });
});

// 获取产品详情API
router.get('/product-details/:skuCode', function(req, res, next) {
  const skuCode = req.params.skuCode;
  
  // 查询SKU基本信息
  const skuSql = 'SELECT * FROM product_sku WHERE sku_code = ?';
  db.query(skuSql, [skuCode], function(error, skuResults) {
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    if (skuResults.length === 0) {
      return res.status(404).json({ error: '未找到该SKU' });
    }
    
    const sku = skuResults[0];
    
    // 查询产品规格参数
    const specSql = 'SELECT spec_key, spec_value FROM amz_pd_kv WHERE sku_code = ?';
    db.query(specSql, [skuCode], function(error, specResults) {
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      
      const specs = {};
      specResults.forEach(item => {
        specs[item.spec_key] = item.spec_value;
      });
      
      // 查询SPU信息
      const spuSql = `
        SELECT spu.* FROM product_spu spu
        JOIN spu_sku ss ON spu.spu_id = ss.spu_id
        JOIN product_sku sku ON ss.sku_id = sku.sku_id
        WHERE sku.sku_code = ?
      `;
      
      db.query(spuSql, [skuCode], function(error, spuResults) {
        if (error) {
          return res.status(500).json({ error: error.message });
        }
        
        res.json({
          sku: sku,
          specs: specs,
          spu: spuResults.length > 0 ? spuResults[0] : null
        });
      });
    });
  });
});

module.exports = router;