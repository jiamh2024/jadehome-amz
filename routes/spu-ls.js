var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
    res.render('spuls', { title: 'Jadehome Product Spu Info' });
});

module.exports = router;
