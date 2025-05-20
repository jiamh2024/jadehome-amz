var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
    res.render('amzfile', { title: 'Jadehome Make Upload File!' });
});

module.exports = router;
