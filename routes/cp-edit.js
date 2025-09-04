var express = require('express');
var router = express.Router();
const db = require('../db/db.js');

/* GET competitor edit page. */
router.get('/:id', async function(req, res, next) {
  try {
    const { id } = req.params;
    
    // 查询竞品详情
    const sql = 'SELECT * FROM product_cp WHERE id = ?';
    const [competitor] = await db.query(sql, [id]);
    
    if (!competitor) {
      // 如果没有找到，重定向到列表页并显示错误消息
      res.redirect('/cp-ls?error=竞品不存在');
      return;
    }
    
    // 转换has_battery为布尔值
    competitor.has_battery = Boolean(competitor.has_battery);
    
    // 渲染编辑页面
    res.render('cpedit', {
      title: '编辑竞品信息',
      competitor: competitor
    });
  } catch (error) {
    console.error('获取竞品详情错误:', error);
    res.status(500).send('服务器错误');
  }
});

module.exports = router;