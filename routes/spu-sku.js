var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
    res.render('spusku', { title: 'Jadehome Product Skus of Spu Info' });
});

module.exports = router;
