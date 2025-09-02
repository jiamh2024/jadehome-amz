var express = require('express');
var router = express.Router();

/* GET edit country page */
router.get('/:id', function(req, res, next) {
    res.render('countryedit', {
        title: 'Jadehome Edit Country Info',
        countryId: req.params.id
    });
});

module.exports = router;