var express = require('express');
var router = express.Router();

/* GET component add page. */
router.get('/', function(req, res, next) {
  res.render('component-add', { title: '添加零部件' });
});

module.exports = router;
