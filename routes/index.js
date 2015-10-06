var express = require('express');
var passport = require('passport');
var router = express.Router();
var userinfo = module.parent.exports.userInfoModel;
/* GET home page. */
router.get('/', function(req, res) {
  var user = req.session.passport.user;
  if(!user.admin){
    res.render('layout', { title: '勤怠Web管理' , user: user});
  }else{
    var domain = user.email.split("@")[1];
    var query = { email : { $regex: "@" + domain , $options: "i"} } ;
    userinfo.find(query, function(err, docs){
      res.render('layout', { title: '勤怠Web管理' , user: user, users: docs});
    });
  }
});


router.get('/login', function(req, res) {
  console.log("login called");
  userinfo.find({},function(err,docs){ console.log(docs);});
  if(req.session.passport.user) res.redirect('/');
  res.render('login', { title: 'login' });
});

router.get('/logout', function(req, res) {
  req.logout();
  req.session.destroy();
  res.redirect('/login');
});

module.exports = router;
