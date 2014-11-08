var express = require('express');
var router = express.Router();
var passport = require('passport');
//var GoogleStrategy = require('passport-google').Strategy;
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
var userModel,googleConfig;

router.setModel = function(model){
  userModel = model;
}

router.setConfig = function(config){
  googleConfig = config;

  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(obj, done) {
    done(null, obj);
  });
  
  passport.use(
    new GoogleStrategy({
      
      clientID: googleConfig.client_id,
      clientSecret: googleConfig.client_secret,
      clientEmail: googleConfig.client_email,
      //callbackURL: 'http://renoji5126.orz.hm/auth/google/return',
      callbackURL: 'http://attendance-management.herokuapp.com/auth/google/return',
      //callbackURL: 'http://192.168.11.20:8080/auth/google/return',
      //callbackURL: googleConfig.redirect_uris,
      //realm:     'http://renoji5126.orz.hm/'
    },
    function(accessToken, refreshToken, profile, done) {
      console.log(accessToken, refreshToken, profile);
      userModel.findOrCreate({ googleId: profile.id }, function(err, user) {
        console.log(user);
        done(err, user);
      });
    })
  );
}

/* GET home page. */
router.get('/google', passport.authenticate('google',
  { scope: ['https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email'] }));

router.get('/google/return', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res){
  console.log(req.user);
  // 必要に応じてresponseを作ったり、cookieの制御を行う
  console.log(req.session.passport);
  res.redirect('/');
});

module.exports = router;
