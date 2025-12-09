var express = require('express');
var router = express.Router();
var db = require('../db/db.js');

/* GET component edit page. */
router.get('/:id', async function(req, res, next) {
  try {
    const [component] = await db.query(
      `SELECT * FROM component 
       WHERE component_id = ? AND is_active = 1`,
      [req.params.id]
    );

    if (!component) {
      return res.status(404).send('零部件未找到');
    }

    res.render('component-edit', { title: '编辑零部件', component: component });
  } catch (err) {
    console.error(err);
    res.status(500).send('服务器错误');
  }
});

module.exports = router;
