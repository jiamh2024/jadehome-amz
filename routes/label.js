var express = require('express');
var router = express.Router();
var db = require('../db/db');

// 标签生成页面
router.get('/generate', function(req, res, next) {
  // 查询所有SKU以供选择
  const sql = 'SELECT sku_code, product_name FROM product_sku WHERE is_active = 1';
  db.query(sql, function(error, skus) {
    if (error) {
      return next(error);
    }
    res.render('generate', { title: '生成发货标签', skus: skus });
  });
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