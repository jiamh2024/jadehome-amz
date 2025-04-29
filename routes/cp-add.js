var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
    res.render('cpadd', { title: 'Jadehome Add Compitor Info' });
});

module.exports = router;
