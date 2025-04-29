var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
    res.render('countryls', { title: 'Jadehome Products Info' });
});

module.exports = router;
