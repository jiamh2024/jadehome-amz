const express = require('express');
const router = express.Router();
const db = require('../db/db.js');

// 渲染SKU标签管理页面
router.get('/', async (req, res) => {
  try {
    // 获取SKU列表
    const [skuList] = await db.query('SELECT sku_code FROM product_sku WHERE is_active = 1 ORDER BY sku_code');
    
    // 获取国家列表
    const [countryList] = await db.query('SELECT country_code, country_name FROM country ORDER BY country_name');
    
    // 获取标签模板列表
    const [labelTemplateList] = await db.query('SELECT id, length, width FROM label_template ORDER BY id');
    
    res.render('sku-label', {
      skuList,
      countryList,
      labelTemplateList,
      currentPage: 'sku-label'
    });
  } catch (err) {
    console.error('Error rendering SKU label management page:', err);
    res.status(500).send('服务器错误');
  }
});

// 获取SKU标签关联列表数据（用于表格数据加载）
router.get('/list', async (req, res) => {
  try {
    // 可以根据查询参数过滤结果
    const { sku_code, country_code, label_id } = req.query;
    
    let query = 'SELECT sl.id, sl.sku_code, sl.country_code, sl.label_id, sl.fnsku, sl.title, sl.left_text, sl.production_date, sl.created_at '+
              ', p.sku_code, c.country_name, lt.length, lt.width ' +
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
    
    const [results] = await db.query(query, queryParams);
    
    res.json({
      success: true,
      data: results
    });
  } catch (err) {
    console.error('Error fetching SKU label list:', err);
    res.status(500).json({
      success: false,
      message: '服务器错误，请稍后再试'
    });
  }
});

// 获取单个SKU标签关联数据（用于编辑表单填充）
router.get('/edit/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'SELECT sl.id, sl.sku_code, sl.country_code, sl.label_id, sl.fnsku, sl.title, sl.left_text, sl.production_date '+
                ', p.sku_code, c.country_name, lt.length, lt.width ' +
                'FROM sku_label sl ' +
                'LEFT JOIN product_sku p ON sl.sku_code = p.sku_code ' +
                'LEFT JOIN country c ON sl.country_code = c.country_code ' +
                'LEFT JOIN label_template lt ON sl.label_id = lt.id ' +
                'WHERE sl.id = ?';
    
    const [results] = await db.query(query, [id]);
    
    if (results.length === 0) {
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
    console.error('Error fetching SKU label data:', err);
    res.status(500).json({
      success: false,
      message: '服务器错误，请稍后再试'
    });
  }
});

module.exports = router;