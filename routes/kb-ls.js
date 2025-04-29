var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
    res.render('kanbanlist', { title: 'Jadehome Kanban Info' });
});

module.exports = router;
