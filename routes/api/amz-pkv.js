// productSpecs.js
const express = require('express');
const db = require('../../db/db.js'); // Import your existing db module

// 创建路由
const router = express.Router();


// 1. 创建产品规格
router.post('/', async (req, res, next) => {
  try {
    const { sku_code, country_code, spec_key, spec_value } = req.body;
    
    if (!sku_code || !country_code || !spec_key) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await db.query(
      `INSERT INTO amz_pd_kv (sku_code, country_code, spec_key, spec_value)
       VALUES (?, ?, ?, ?)`,
      [sku_code, country_code, spec_key, spec_value || null]
    );

    res.status(201).json({
      id: result.insertId,
      sku_code,
      country_code,
      spec_key,
      spec_value,
      message: 'Product spec created successfully'
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'This spec already exists for the given SKU and country' });
    }
    next(error);
  }
});

// 2. 获取产品规格
router.get('/', async (req, res, next) => {
  try {
    const { sku_code, country_code, spec_key } = req.query;
    
    let sql = 'SELECT * FROM amz_pd_kv WHERE 1=1';
    const params = [];
    
    if (sku_code) {
      sql += ' AND sku_code = ?';
      params.push(sku_code);
    }
    
    if (country_code) {
      sql += ' AND country_code = ?';
      params.push(country_code);
    }
    
    if (spec_key) {
      sql += ' AND spec_key = ?';
      params.push(spec_key);
    }
    
    sql += ' ORDER BY updated_at DESC';
    
    const rows = await db.query(sql, params);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

// 3. 更新产品规格（新增）
router.put('/', async (req, res, next) => {
  try {
    const { sku_code, country_code, spec_key, spec_value } = req.body;
    
    if (!sku_code || !country_code || !spec_key) {
      return res.status(400).json({ 
        error: '缺少必要字段: sku_code, country_code 和 spec_key' 
      });
    }

    const result = await db.query(
      `UPDATE amz_pd_kv 
       SET spec_value = ?, updated_at = CURRENT_TIMESTAMP
       WHERE sku_code = ? AND country_code = ? AND spec_key = ?`,
      [spec_value || null, sku_code, country_code, spec_key]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        error: '未找到匹配的产品规格',
        suggestion: '请使用POST方法创建新规格'
      });
    }
    
    res.json({ 
      message: '产品规格更新成功',
      updated: {
        sku_code,
        country_code,
        spec_key,
        spec_value
      }
    });
  } catch (error) {
    next(error);
  }
});

// 4. 删除产品规格（修改为基于国家、SKU和Key）
router.delete('/', async (req, res, next) => {
  try {
    const { sku_code, country_code, spec_key } = req.query;
    
    if (!sku_code || !country_code || !spec_key) {
      return res.status(400).json({ 
        error: '缺少必要参数: sku_code, country_code 和 spec_key 都是必需的' 
      });
    }

    const result = await db.query(
      'DELETE FROM amz_pd_kv WHERE sku_code = ? AND country_code = ? AND spec_key = ?',
      [sku_code, country_code, spec_key]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ 
        error: '未找到匹配的产品规格',
        details: {
          sku_code,
          country_code, 
          spec_key
        }
      });
    }
    
    res.json({ 
      message: '产品规格删除成功',
      deleted: {
        sku_code,
        country_code,
        spec_key
      }
    });
  } catch (error) {
    next(error);
  }
});

// 5. 批量查询特定SKU的所有国家规格
router.get('/sku/:sku_code', async (req, res, next) => {
  try {
    const { sku_code } = req.params;
    
    const rows = await db.query(
      `SELECT * FROM amz_pd_kv 
       WHERE sku_code = ? 
       ORDER BY country_code, spec_key`,
      [sku_code]
    );
    
    // 按国家分组返回
    const result = rows.reduce((acc, row) => {
      if (!acc[row.country_code]) {
        acc[row.country_code] = [];
      }
      acc[row.country_code].push({
        spec_key: row.spec_key,
        spec_value: row.spec_value,
        updated_at: row.updated_at
      });
      return acc;
    }, {});
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;