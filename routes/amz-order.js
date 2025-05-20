var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
    res.render('./sp-api/amz-order', { title: 'Jadehome AMZ Orders' });
});

module.exports = router;
