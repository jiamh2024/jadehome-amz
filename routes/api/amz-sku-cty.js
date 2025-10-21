var express = require('express');
var router = express.Router();
var db = require('../../db/db');

// 获取指定SKU的所有国家SKU信息
router.get('/:skuId', async function(req, res, next) {
  try {
    const skuId = req.params.skuId;
    const sql = `
      SELECT a.id, a.sku_id, a.country_id, a.country_sku, 
             c.country_name, c.country_code 
      FROM amz_sku_cty a
      JOIN country c ON a.country_id = c.id
      WHERE a.sku_id = ?
      ORDER BY c.country_name
    `;
    const results = await db.query(sql, [skuId]);
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Error fetching country SKUs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch country SKUs' });
  }
});

// 创建新的国家SKU
router.post('/', async function(req, res, next) {
  try {
    const { sku_id, country_id, country_sku } = req.body;
    
    // 检查是否已存在
    const checkSql = 'SELECT id FROM amz_sku_cty WHERE sku_id = ? AND country_id = ?';
    const checkResult = await db.query(checkSql, [sku_id, country_id]);
    
    if (checkResult.length > 0) {
      return res.status(400).json({ success: false, message: 'Country SKU already exists for this combination' });
    }
    
    const sql = 'INSERT INTO amz_sku_cty (sku_id, country_id, country_sku) VALUES (?, ?, ?)';
    const result = await db.query(sql, [sku_id, country_id, country_sku]);
    
    // 获取刚插入的数据
    const newSql = `
      SELECT a.id, a.sku_id, a.country_id, a.country_sku, 
             c.country_name, c.country_code 
      FROM amz_sku_cty a
      JOIN country c ON a.country_id = c.id
      WHERE a.id = ?
    `;
    const newResult = await db.query(newSql, [result.insertId]);
    
    res.json({ success: true, data: newResult[0] });
  } catch (error) {
    console.error('Error creating country SKU:', error);
    res.status(500).json({ success: false, message: 'Failed to create country SKU' });
  }
});

// 更新国家SKU
router.put('/:id', async function(req, res, next) {
  try {
    const id = req.params.id;
    const { country_sku } = req.body;
    
    const sql = 'UPDATE amz_sku_cty SET country_sku = ? WHERE id = ?';
    const result = await db.query(sql, [country_sku, id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Country SKU not found' });
    }
    
    // 获取更新后的数据
    const updatedSql = `
      SELECT a.id, a.sku_id, a.country_id, a.country_sku, 
             c.country_name, c.country_code 
      FROM amz_sku_cty a
      JOIN country c ON a.country_id = c.id
      WHERE a.id = ?
    `;
    const updatedResult = await db.query(updatedSql, [id]);
    
    res.json({ success: true, data: updatedResult[0] });
  } catch (error) {
    console.error('Error updating country SKU:', error);
    res.status(500).json({ success: false, message: 'Failed to update country SKU' });
  }
});

// 删除国家SKU
router.delete('/:id', async function(req, res, next) {
  try {
    const id = req.params.id;
    const sql = 'DELETE FROM amz_sku_cty WHERE id = ?';
    const result = await db.query(sql, [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Country SKU not found' });
    }
    
    res.json({ success: true, message: 'Country SKU deleted successfully' });
  } catch (error) {
    console.error('Error deleting country SKU:', error);
    res.status(500).json({ success: false, message: 'Failed to delete country SKU' });
  }
});

// 获取所有可用国家列表（用于下拉选择）
router.get('/countries/all', async function(req, res, next) {
  try {
    const sql = 'SELECT id, country_name, country_code FROM country ORDER BY country_name';
    const results = await db.query(sql);
    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch countries' });
  }
});

module.exports = router;