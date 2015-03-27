var express = require('express');
var passport = require('passport');
var router = express.Router();
var userModel = module.parent.userInfoModel;

/* GET home page. */
router.get('/', function(req, res) {
  var syurui =[{
    name:'有給'
  },{
    name:'代休'
  },{
    name:'忌引'
  }];
  res.render('yuukyuu', { title: '休暇申請',syurui: syurui });
});

router.post('/', function(req, res) {
  console.log(req.body);
  res.redirect('/');
});
module.exports = router;
