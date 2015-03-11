var express = require('express');
var passport = require('passport');
var router = express.Router();
var userModel = module.parent.userInfoModel;

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: '勤怠Web管理' , user: req.session.passport.user._json });
});

module.exports = router;
