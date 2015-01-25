var express = require('express');
var router = express.Router();
var passport = require('passport');

/* GET home page. */
router.get('/google', passport.authenticate('google',
  { scope: ['https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email'] }));

router.get('/google/return', 
  passport.authenticate('google', { failureRedirect: '/logout' }),
  function(req, res){
    // 必要に応じてresponseを作ったり、cookieの制御を行う
    res.redirect('/');
  }
);

module.exports = router;
