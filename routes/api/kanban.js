var express = require('express');
var router = express.Router();
const db = require('../../db/db.js');

// 创建看板信息
router.post('/', async (req, res) => {
    try {
      const { content, urgency_level, valid_until, notes } = req.body;
      
      // 必填字段验证
      if (!content || !valid_until) {
        return res.status(400).json({ 
          success: false,
          message: '缺少必填字段：content 和 valid_until'
        });
      }
  
      const result = await db.query(
        `INSERT INTO kanban 
         (content, urgency_level, valid_until, notes)
         VALUES (?, ?, ?, ?)`,
        [content, urgency_level || 'm', valid_until, notes]
      );
  
      res.status(201).json({
        success: true,
        data: { id: result.insertId }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ 
        success: false,
        message: '服务器错误'
      });
    }
  });
  
  // 获取看板信息（带分页）
  router.get('/', async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;
  
      const [items, total] = await Promise.all([
        db.query(
          `SELECT * FROM kanban 
           ORDER BY create_time DESC
           LIMIT ? OFFSET ?`,
          [limit, offset]
        ),
        db.query('SELECT COUNT(*) AS total FROM kanban')
      ]);
  
      res.json({
        success: true,
        data: {
          items,
          pagination: {
            page,
            limit,
            total: total[0].total
          }
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ 
        success: false,
        message: '获取数据失败'
      });
    }
  });
  
  // 删除看板信息
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await db.query(
        'DELETE FROM kanban WHERE id = ?',
        [id]
      );
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ 
          success: false,
          message: '未找到对应记录'
        });
      }
  
      res.json({ 
        success: true,
        message: '删除成功'
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ 
        success: false,
        message: '删除失败'
      });
    }
  });
  
  module.exports = router;
