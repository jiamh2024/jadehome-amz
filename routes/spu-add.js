var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
    res.render('spuadd', { title: 'Jadehome Add Product Spu Info' });
});

module.exports = router;
