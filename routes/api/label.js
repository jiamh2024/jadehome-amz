const express = require('express');
const router = express.Router();
const db = require('../../db/db.js');

// 处理服务器错误的辅助函数
function handleServerError(res, err) {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: '服务器错误，请稍后再试'
  });
}

// 获取所有标签模板（GET请求）
router.get('/', async (req, res) => {
  try {
    const query = 'SELECT * FROM label_template ORDER BY created_at DESC';
    const results = await db.query(query);
    res.json({
      success: true,
      data: results
    });
  } catch (err) {
    handleServerError(res, err);
  }
});

// 获取单个标签模板（GET请求，带ID参数）
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = 'SELECT * FROM label_template WHERE id = ?';
    const results = await db.query(query, [id]);
    
    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: '未找到标签模板'
      });
    }
    
    res.json({
      success: true,
      data: results[0]
    });
  } catch (err) {
    handleServerError(res, err);
  }
});

// 创建新的标签模板（POST请求）
router.post('/', async (req, res) => {
  try {
    const { length, width, logo_path, email, website, qr_code_link, scan_icon_link } = req.body;
    
    // 验证必填字段
    if (!length || !width) {
      return res.status(400).json({
        success: false,
        message: '标签长度和宽度为必填项'
      });
    }
    
    const query = 'INSERT INTO label_template (length, width, logo_path, email, website, qr_code_link, scan_icon_link) VALUES (?, ?, ?, ?, ?, ?, ?)';
    const values = [length, width, logo_path || null, email || null, website || null, qr_code_link || null, scan_icon_link || null];
    const result = await db.query(query, values);
    
    res.status(201).json({
      success: true,
      data: {
        id: result.insertId,
        length,
        width,
        logo_path,
        email,
        website,
        qr_code_link,
        scan_icon_link
      }
    });
  } catch (err) {
    handleServerError(res, err);
  }
});

// 更新标签模板（PUT请求）
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { length, width, logo_path, email, website, qr_code_link, scan_icon_link } = req.body;
    
    // 验证必填字段
    if (!length || !width) {
      return res.status(400).json({
        success: false,
        message: '标签长度和宽度为必填项'
      });
    }
    
    // 先检查标签模板是否存在
    const checkQuery = 'SELECT id FROM label_template WHERE id = ?';
    const checkResult = await db.query(checkQuery, [id]);
    
    if (checkResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: '未找到标签模板'
      });
    }
    
    const updateQuery = 'UPDATE label_template SET length = ?, width = ?, logo_path = ?, email = ?, website = ?, qr_code_link = ?, scan_icon_link = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    const updateValues = [length, width, logo_path || null, email || null, website || null, qr_code_link || null, scan_icon_link || null, id];
    
    await db.query(updateQuery, updateValues);
    
    res.json({
      success: true,
      message: '标签模板更新成功',
      data: {
        id,
        length,
        width,
        logo_path,
        email,
        website,
        qr_code_link,
        scan_icon_link
      }
    });
  } catch (err) {
    handleServerError(res, err);
  }
});

// 删除标签模板（DELETE请求）
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 先检查标签模板是否存在
    const checkQuery = 'SELECT id FROM label_template WHERE id = ?';
    const checkResult = await db.query(checkQuery, [id]);
    
    if (checkResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: '未找到标签模板'
      });
    }
    
    // 检查是否有SKU关联到此标签模板
    const skuLabelQuery = 'SELECT id FROM sku_label WHERE label_id = ?';
    const skuLabelResult = await db.query(skuLabelQuery, [id]);
    
    if (skuLabelResult.length > 0) {
      return res.status(400).json({
        success: false,
        message: '该标签模板已有SKU关联，无法删除'
      });
    }
    
    const deleteQuery = 'DELETE FROM label_template WHERE id = ?';
    await db.query(deleteQuery, [id]);
    
    res.json({
      success: true,
      message: '标签模板删除成功'
    });
  } catch (err) {
    handleServerError(res, err);
  }
});

module.exports = router;