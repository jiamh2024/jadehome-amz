var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
    res.render('tools/v-cal', { title: 'Jadehome Vol Calulator' });
});

module.exports = router;
