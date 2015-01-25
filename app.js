var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var conf = require('config');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;

var mongoose = require('mongoose');
var passport = require('passport');
var app = module.exports = express();

if(process.env.MONGOLAB_URI){
  var url = process.env.MONGOLAB_URI;
  conf.mongodbInfo.url = url.replace('mongodb://','').split('/')[0];
  conf.mongodbInfo.dbName = url.replace('mongodb://','').split('/')[1];
}else{
  var url = 'mongodb://' + conf.mongodbInfo.url + '/' + conf.mongodbInfo.dbName;
}
//console.log(url);
mongoose.connect(url, function(err){
  if (err) throw err;
});

var userInfo = new mongoose.Schema({
  googleId : String,
  email    : {type: String, default: null},
  name     : {type: String, default: null},
  picture  : {type: String, default: null},
  plan     : {type: Number, default: 7.75},
  entryDate: {type: Date  , default: null},
  className: {type: Array , default: []},
},{ collection : conf.mongodbInfo.collectionName_user });
app.userInfoModel = mongoose.model( conf.mongodbInfo.collectionName_user , userInfo );

app.kintaiSchema = new mongoose.Schema({
  year  :    {type : Number, default: 0 },
  month :    {type : Number, default: 0 },
  day   :    {type : Number, default: 0 },
  startTime :    {type : Date  , default: null},
  stopTime  :    {type : Date  , default: null},
  registType:{type : String, default: null},
  registTime:{type : Date  , default: new Date()},
  location: {
    latitude:  {type: Number, default: null},
    longitude: {type: Number, default: null},
  },
});
app.mongoose = mongoose;
app.config = conf;
var googleConfig = app.config.googleAuth;
var routes = require('./routes/index');
var auths = require('./routes/auths');
var users = require('./routes/users');
var kintais = require('./routes/kintai');


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(favicon());
//app.use(logger('dev'));
app.use(logger({format: 'default'}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(session({
  secret: 'uchida',
  store: new MongoStore({
    db: mongoose.connection.db,
    clear_interval: 60 * 60
  }),
  cookie: {
    httpOnly: false,
    maxAge: new Date(Date.now() + 60 * 60 * 1000)
  },
  rolling: true,
  resave: true,
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(
  new GoogleStrategy({
    clientID    : googleConfig.client_id,
    clientSecret: googleConfig.client_secret,
    clientEmail : googleConfig.client_email,
    //callbackURL : 'http://renoji5126.orz.hm/auth/google/return',
    callbackURL : 'http://attendance-management.herokuapp.com/auth/google/return',
    //callbackURL : 'http://192.168.11.20:8080/auth/google/return',
    //callbackURL : googleConfig.redirect_uris,
  },
  function(accessToken, refreshToken, profile, done) {
    app.userInfoModel.update(
      { googleId: profile._json.id },
      { $setOnInsert: 
        {
          googleId: profile._json.id,
          email   : profile._json.email,
          name    : profile._json.name,
          picture : profile._json.picture,
        }
      },
      { upsert: true },
      function(err) {
        done(err, profile);
      }
    );
  })
);

app.use(function(req, res, next) {
    console.log(req.session.passport.user);
    if(
       req.session.passport.user || (
         !req.session.passport.user && (
           req.path === '/login' ||
           req.path === '/auth/google' ||
           req.path === '/auth/google/return'
         )
       )
    ){
      next();
    }else{
      res.redirect('/login');
    }
});

app.use('/', routes);
app.use('/auth', auths);
app.use('/users', users);
app.use('/kintai', kintais);

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
