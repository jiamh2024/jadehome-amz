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

// 获取所有SKU标签关联（GET请求）
router.get('/', async (req, res) => {
  try {
    // 可以根据查询参数过滤结果
    const { sku_code, country_code, label_id } = req.query;
    
    let query = 'SELECT sl.id, sl.sku_code, sl.country_code, sl.label_id, sl.fnsku, sl.title, sl.left_text, sl.production_date, sl.created_at, '+
              'p.product_name, c.country_name, lt.length, lt.width ' +
              'FROM sku_label sl ' +
              'LEFT JOIN product_sku p ON sl.sku_code = p.sku_code ' +
              'LEFT JOIN country c ON sl.country_code = c.country_code ' +
              'LEFT JOIN label_template lt ON sl.label_id = lt.id ' +
              'WHERE 1=1';
    const queryParams = [];
    
    if (sku_code) {
      query += ' AND sl.sku_code = ?';
      queryParams.push(sku_code);
    }
    
    if (country_code) {
      query += ' AND sl.country_code = ?';
      queryParams.push(country_code);
    }
    
    if (label_id) {
      query += ' AND sl.label_id = ?';
      queryParams.push(label_id);
    }
    
    query += ' ORDER BY sl.created_at DESC';
    
    const results = await db.query(query, queryParams).catch(err => {
      console.error('Fetch all records failed:', err);
      return [[], null];
    });
    console.log(results);
    res.json({
      success: true,
      data: results || []
    });
  } catch (err) {
    handleServerError(res, err);
  }
});

// 获取单个SKU标签关联（GET请求，带ID参数）
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const query = 'SELECT sl.id, sl.sku_code, sl.country_code, sl.label_id, sl.fnsku, sl.title, sl.left_text, sl.production_date, sl.created_at, '+
                'p.product_name, c.country_name, lt.length, lt.width ' +
                'FROM sku_label sl ' +
                'LEFT JOIN product_sku p ON sl.sku_code = p.sku_code ' +
                'LEFT JOIN country c ON sl.country_code = c.country_code ' +
                'LEFT JOIN label_template lt ON sl.label_id = lt.id ' +
                'WHERE sl.id = ?';
    const [results] = await db.query(query, [id]).catch(err => {
      console.error('Fetch single record failed:', err);
      return [[], null];
    });
    
    if (!results || results.length === 0) {
      return res.status(404).json({
        success: false,
        message: '未找到SKU标签关联'
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

// 创建新的SKU标签关联（POST请求）
router.post('/', async (req, res) => {
  try {
    const { sku_code, country_code, label_id, fnsku, title, left_text, production_date } = req.body;
    
    // 验证必填字段
    if (!sku_code || !country_code || !label_id || !fnsku || !title) {
      return res.status(400).json({
        success: false,
        message: 'SKU编码、国家代码、标签模板ID、FNSKU编号和标签标题为必填项'
      });
    }
    
    // 检查SKU是否存在
    const skuCheckQuery = 'SELECT sku_code FROM product_sku WHERE sku_code = ?';
    const [skuCheckResult] = await db.query(skuCheckQuery, [sku_code]).catch(err => {
      console.error('SKU check failed:', err);
      return [[], null];
    });
    
    if (!skuCheckResult || skuCheckResult.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'SKU不存在'
      });
    }
    
    // 检查国家是否存在
    const countryCheckQuery = 'SELECT country_code FROM country WHERE country_code = ?';
    const [countryCheckResult] = await db.query(countryCheckQuery, [country_code]).catch(err => {
      console.error('Country check failed:', err);
      return [[], null];
    });
    
    if (!countryCheckResult || countryCheckResult.length === 0) {
      return res.status(400).json({
        success: false,
        message: '国家不存在'
      });
    }
    
    // 检查标签模板是否存在
    const labelCheckQuery = 'SELECT id FROM label_template WHERE id = ?';
    const [labelCheckResult] = await db.query(labelCheckQuery, [label_id]).catch(err => {
      console.error('Label template check failed:', err);
      return [[], null];
    });
    
    if (!labelCheckResult || labelCheckResult.length === 0) {
      return res.status(400).json({
        success: false,
        message: '标签模板不存在'
      });
    }
    
    // 检查是否已存在相同的SKU、标签模板和国家的关联（根据唯一键）
    const duplicateCheckQuery = 'SELECT id FROM sku_label WHERE sku_code = ? AND label_id = ? AND country_code = ?';
    const [duplicateCheckResult] = await db.query(duplicateCheckQuery, [sku_code, label_id, country_code]).catch(err => {
      console.error('Duplicate check failed:', err);
      return [[], null];
    });
    
    if (duplicateCheckResult && duplicateCheckResult.length > 0) {
      return res.status(400).json({
        success: false,
        message: '该SKU在指定国家已有相同的标签模板关联'
      });
    }
    
    const insertQuery = 'INSERT INTO sku_label (sku_code, country_code, label_id, fnsku, title, left_text, production_date) VALUES (?, ?, ?, ?, ?, ?, ?)';
    const insertValues = [sku_code, country_code, label_id, fnsku, title, left_text || null, production_date || null];
    const insertResult = await db.query(insertQuery, insertValues).catch(err => {
      console.error('Insert failed:', err);
      throw err; // 重新抛出错误以便在catch块中处理
    });
    
    if (!insertResult || !insertResult.insertId) {
      throw new Error('Insert operation did not return an insertId');
    }
    
    // 获取新创建的记录
    const newRecordQuery = 'SELECT sl.id, sl.sku_code, sl.country_code, sl.label_id, sl.fnsku, sl.title, sl.left_text, sl.production_date, sl.created_at, '+
                          'p.product_name, c.country_name, lt.length, lt.width ' +
                          'FROM sku_label sl ' +
                          'LEFT JOIN product_sku p ON sl.sku_code = p.sku_code ' +
                          'LEFT JOIN country c ON sl.country_code = c.country_code ' +
                          'LEFT JOIN label_template lt ON sl.label_id = lt.id ' +
                          'WHERE sl.id = ?';
    const [newRecordResult] = await db.query(newRecordQuery, [insertResult.insertId]).catch(err => {
      console.error('Fetch new record failed:', err);
      return [[], null];
    });
    
    if (!newRecordResult || newRecordResult.length === 0) {
      throw new Error('Failed to retrieve the newly created record');
    }
    
    res.status(201).json({
      success: true,
      message: 'SKU标签关联创建成功',
      data: newRecordResult[0]
    });
  } catch (err) {
    handleServerError(res, err);
  }
});

// 更新SKU标签关联（PUT请求）
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { label_id, fnsku, title, left_text, production_date } = req.body;
    
    // 验证必填字段
    if (!label_id || !fnsku || !title) {
      return res.status(400).json({
        success: false,
        message: '标签模板ID、FNSKU编号和标签标题为必填项'
      });
    }
    
    // 先检查SKU标签关联是否存在
    const checkQuery = 'SELECT sku_code, country_code, label_id FROM sku_label WHERE id = ?';
    const [checkResult] = await db.query(checkQuery, [id]).catch(err => {
      console.error('Check record existence failed:', err);
      return [[], null];
    });
    
    if (!checkResult || checkResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: '未找到SKU标签关联'
      });
    }
    
    // 检查标签模板是否存在
    const labelCheckQuery = 'SELECT id FROM label_template WHERE id = ?';
    const [labelCheckResult] = await db.query(labelCheckQuery, [label_id]).catch(err => {
      console.error('Label template check failed:', err);
      return [[], null];
    });
    
    if (!labelCheckResult || labelCheckResult.length === 0) {
      return res.status(400).json({
        success: false,
        message: '标签模板不存在'
      });
    }
    
    const { sku_code, country_code } = checkResult[0];
    
    // 检查是否会导致唯一键冲突（如果更改了label_id）
    if (label_id !== checkResult[0].label_id) {
      const conflictCheckQuery = 'SELECT id FROM sku_label WHERE sku_code = ? AND label_id = ? AND country_code = ? AND id != ?';
      const [conflictCheckResult] = await db.query(conflictCheckQuery, [sku_code, label_id, country_code, id]).catch(err => {
        console.error('Conflict check failed:', err);
        return [[], null];
      });
      
      if (conflictCheckResult && conflictCheckResult.length > 0) {
        return res.status(400).json({
          success: false,
          message: '该SKU在指定国家已有相同的标签模板关联'
        });
      }
    }
    
    const updateQuery = 'UPDATE sku_label SET label_id = ?, fnsku = ?, title = ?, left_text = ?, production_date = ? WHERE id = ?';
    const updateValues = [label_id, fnsku, title, left_text || null, production_date || null, id];
    
    const [updateResult] = await db.query(updateQuery, updateValues).catch(err => {
      console.error('Update failed:', err);
      throw err; // 重新抛出错误以便在catch块中处理
    });
    
    // 获取更新后的记录
    const updatedRecordQuery = 'SELECT sl.id, sl.sku_code, sl.country_code, sl.label_id, sl.fnsku, sl.title, sl.left_text, sl.production_date, sl.created_at, '+
                             'p.product_name, c.country_name, lt.length, lt.width ' +
                             'FROM sku_label sl ' +
                             'LEFT JOIN product_sku p ON sl.sku_code = p.sku_code ' +
                             'LEFT JOIN country c ON sl.country_code = c.country_code ' +
                             'LEFT JOIN label_template lt ON sl.label_id = lt.id ' +
                             'WHERE sl.id = ?';
    const [updatedRecordResult] = await db.query(updatedRecordQuery, [id]).catch(err => {
      console.error('Fetch updated record failed:', err);
      return [[], null];
    });
    
    if (!updatedRecordResult || updatedRecordResult.length === 0) {
      throw new Error('Failed to retrieve the updated record');
    }
    
    res.json({
      success: true,
      message: 'SKU标签关联更新成功',
      data: updatedRecordResult[0]
    });
  } catch (err) {
    handleServerError(res, err);
  }
});

// 删除SKU标签关联（DELETE请求）
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 先检查SKU标签关联是否存在
    const checkQuery = 'SELECT id FROM sku_label WHERE id = ?';
    const checkResult = await db.query(checkQuery, [id]).catch(err => {
      console.error('Check record existence failed:', err);
      return [[], null];
    });
    
    if (!checkResult || checkResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: '未找到SKU标签关联'
      });
    }
    
    const deleteQuery = 'DELETE FROM sku_label WHERE id = ?';
    const deleteResult = await db.query(deleteQuery, [id]).catch(err => {
      console.error('Delete failed:', err);
      throw err; // 重新抛出错误以便在catch块中处理
    });
    
    res.json({
      success: true,
      message: 'SKU标签关联删除成功'
    });
  } catch (err) {
    handleServerError(res, err);
  }
});

module.exports = router;