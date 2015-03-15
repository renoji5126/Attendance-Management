var express = require('express');
var passport = require('passport');
var router = express.Router();
var userModel = module.parent.userInfoModel;

/* GET home page. */
router.get('/', function(req, res) {
  res.render('yuukyuu', { title: '休暇申請' });
});

module.exports = router;
