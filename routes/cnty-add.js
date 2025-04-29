var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
    res.render('countryadd', { title: 'Jadehome Add Country Info' });
});

module.exports = router;
