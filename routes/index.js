// routes/index.js
const express = require('express');
const router = express.Router();
const db = require('../db/db.js');

router.get('/', async (req, res) => {
  try {
    // 获取看板信息（最近5条）
    const [kanbanItems] = await db.query('SELECT * FROM kanban ORDER BY create_time DESC LIMIT 5');
    //console.log(kanbanItems);

    // 获取产品SKU信息（最近6条）
    const [skuItems] = await db.query('SELECT * FROM product_sku WHERE is_active = 1 ORDER BY created_at DESC LIMIT 6');

    res.render('index', {
      kanbanItems,
      skuItems,
      currentDate: new Date()
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('服务器错误');
  }
});

module.exports = router;