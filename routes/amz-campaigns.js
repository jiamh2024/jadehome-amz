var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
    res.render('./ads-api/campaigns', { title: 'Jadehome AMZ Campaigns' });
});

module.exports = router;
