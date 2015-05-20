var express = require('express');
var passport = require('passport');
var router = express.Router();
var userModel = module.parent.userInfoModel;

/* GET home page. */
router.get('/', function(req, res) {
  res.render('layout', { title: '勤怠Web管理' , user: req.session.passport.user });
});


router.get('/login', function(req, res) {
  if(req.session.passport.user) res.redirect('/');
  res.render('login', { title: 'login' });
});

router.get('/logout', function(req, res) {
  req.logout();
  req.session.destroy();
  res.redirect('/login');
});

module.exports = router;
