var express = require('express');
var router = express.Router();

/* GET component listing page. */
router.get('/', function(req, res, next) {
  res.render('component-ls', { title: '零部件管理' });
});

module.exports = router;
