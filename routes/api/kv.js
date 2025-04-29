const express = require('express');
const router = express.Router();
const db = require('../../db/db.js');
//const bodyParser = require('body-parser');

// 规格API路由
//router.use(bodyParser.json());

/**
 * 创建/更新产品规格
 * POST /api/specs
 * Body: { sku_code, country_code, spec_key, spec_value, [created_by] }
 */
router.post('/', async (req, res) => {
  try {
    const { sku_code, country_code, spec_key, spec_value, created_by = 'system' } = req.body;
    
    // 参数校验
    if (!sku_code || !country_code || !spec_key) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 使用ON DUPLICATE KEY UPDATE实现创建或更新
    const result = await db.query(
      `INSERT INTO amz_pd_kv 
       (sku_code, country_code, spec_key, spec_value, created_by) 
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
       spec_value = VALUES(spec_value), 
       updated_at = CURRENT_TIMESTAMP`,
      [sku_code, country_code, spec_key, spec_value, created_by]
    );

    res.json({ 
      success: true,
      id: result.insertId || `${sku_code}-${country_code}-${spec_key}`
    });
  } catch (error) {
    console.error('Create spec error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * 查询产品规格
 * GET /api/specs?sku_code=&country_code=&spec_key=
 */
router.get('/', async (req, res) => {
  try {
    const { sku_code, country_code, spec_key } = req.query;
    const conditions = [];
    const params = [];

    if (sku_code) {
      conditions.push('sku_code = ?');
      params.push(sku_code);
    }
    if (country_code) {
      conditions.push('country_code = ?');
      params.push(country_code);
    }
    if (spec_key) {
      conditions.push('spec_key = ?');
      params.push(spec_key);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')} AND is_active = 1` : '';
    const { rows } = await db.query(
      `SELECT * FROM amz_pd_kv ${where}`,
      params
    );

    res.json(rows);
  } catch (error) {
    console.error('Query specs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * 删除产品规格（软删除）
 * DELETE /api/specs/:sku_code/:country_code/:spec_key
 */
router.delete('/:sku_code/:country_code/:spec_key', async (req, res) => {
  try {
    const { sku_code, country_code, spec_key } = req.params;
    
    const { affectedRows } = await db.query(
      `UPDATE amz_pd_kv SET is_active = 0 
       WHERE sku_code = ? AND country_code = ? AND spec_key = ?`,
      [sku_code, country_code, spec_key]
    );

    if (affectedRows > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Spec not found' });
    }
  } catch (error) {
    console.error('Delete spec error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;