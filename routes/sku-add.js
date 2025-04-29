var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
    res.render('skuadd', { title: 'Jadehome Add Product Info' });
});

module.exports = router;
