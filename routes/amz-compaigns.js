var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
    res.render('./ads-api/compaigns', { title: 'Jadehome AMZ Compaigns' });
});

module.exports = router;
