//- routes/web/bom.js
const express = require('express');
const router = express.Router();
const db = require('../../db/db');
const { check, validationResult } = require('express-validator');

// BOM列表页面
router.get('/bom-ls', async (req, res) => {
  try {
    // 获取分页参数
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    // 查询BOM列表，包含产品和零部件信息
    const query = `
      SELECT 
        b.bom_id, 
        b.sku_id, 
        b.component_id, 
        b.quantity, 
        b.unit, 
        b.usage_note, 
        b.is_active, 
        b.created_at, 
        b.updated_at, 
        p.sku_code as product_sku, 
        p.product_name, 
        c.sku_code as component_sku, 
        c.core_specs 
      FROM bom b
      LEFT JOIN product_sku p ON b.sku_id = p.sku_id
      LEFT JOIN component c ON b.component_id = c.component_id
      WHERE b.is_active = 1
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const boms = await db.query(query, [pageSize, offset]);

    // 查询总数
    const totalQuery = `SELECT COUNT(*) as total FROM bom WHERE is_active = 1`;
    const totalResult = await db.query(totalQuery);
    const total = totalResult[0].total;
    const totalPages = Math.ceil(total / pageSize);

    res.render('bom-ls', {
      boms,
      pagination: {
        page,
        pageSize,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('BOM列表查询失败:', error);
    res.status(500).send('服务器错误');
  }
});

// BOM添加页面
router.get('/bom-add', (req, res) => {
  res.render('bom-add');
});

// BOM编辑页面
router.get('/bom-edit', (req, res) => {
  // 编辑页面的数据通过前端AJAX加载
  res.render('bom-edit');
});

// BOM删除功能（Web端软删除）
router.delete('/bom/:id', async (req, res) => {
  try {
    const bomId = req.params.id;
    const query = `UPDATE bom SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE bom_id = ?`;
    await db.query(query, [bomId]);
    res.status(200).json({ success: true, message: 'BOM删除成功' });
  } catch (error) {
    console.error('BOM删除失败:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

module.exports = router;


