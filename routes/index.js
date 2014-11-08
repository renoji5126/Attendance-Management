var express = require('express');
var router = express.Router();

router.setModel = function(model){
  userModel = model;
}

/* GET home page. */
router.get('/', function(req, res) {
  console.log(req.session.passport);
  res.render('index', { title: 'Express' , user: req.session.passport });
});

router.get('/login', function(req, res) {
  res.render('login', { title: 'login' });
});

module.exports = router;
