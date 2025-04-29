var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
    res.render('amzkv', { title: 'Jadehome Add AMZ Product Info' });
});

module.exports = router;
