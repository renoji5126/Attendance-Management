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
  console.log("mongo try connection url :",url);
  console.log("mongoose version :",mongoose.version);
  if (err) throw err;
});

var userInfo = new mongoose.Schema({
  googleId : String,
//社員ID的なのひとつ欲しい
  email    : {type: String , default: null},
  name     : {type: String , default: null},
  picture  : {type: String , default: null},
  plan     : {type: Number , default: 7.75},
  entryDate: {type: Date   , default: null},
  className: {type: Array  , default: []},
  admin    : {type: Boolean, default: false},
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

var schema = new mongoose.Schema({
    registDay  : Date,
    googleId   : String,
    //registType : {type : String, default: "申請休暇" },
    consumeDay : Date,
    archive    : {type : Boolean, default: false },
    syurui     : {type : String, default: null },
    comment    : {type : String, default: "" }
});
var ykSchema = new mongoose.Schema({
    registDay  : Date,
    googleId   : String,
    //registType : {type : String, default: "有給休暇" },
    remains    : {type : Number,  default: 0 },
    archive    : {type : Boolean, default: false },
    "発生日数" : {type : Number,  default: 0 }
});
mongoose.model( "syutokus" , schema );
mongoose.model( "yuukyuus" , ykSchema );
mongoose.model( "syukkins" , ykSchema );


app.config = conf;
var googleConfig = {};
if(process.env.GOOGLE_AUTH_CLIENTID)
  googleConfig.client_id = process.env.GOOGLE_AUTH_CLIENTID;
if(process.env.GOOGLE_AUTH_CLIENTSECRET)
  googleConfig.client_secret = process.env.GOOGLE_AUTH_CLIENTSECRET;
if(process.env.GOOGLE_AUTH_MAIL)
  googleConfig.client_email = process.env.GOOGLE_AUTH_MAIL;
if(process.env.GOOGLE_AUTH_SCRIPTORIGIN)
  googleConfig.javascript_origins = [ process.env.GOOGLE_AUTH_SCRIPTORIGIN ];
app.config.googleAuth = googleConfig;
var routes = require('./routes/index');
var auths = require('./routes/auths');
var users = require('./routes/users');
var kintais = require('./routes/kintai');
var yuukyuus = require('./routes/yuukyuu');


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
  saveUninitialized: true
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
    callbackURL : googleConfig.javascript_origins[0] + 'auth/google/return',
  },
  function(accessToken, refreshToken, profile, done) {
    app.userInfoModel.findOne({
        googleId: profile._json.id 
      },function(err, result) {
        if(result){
          result.googleId= profile._json.id;
          result.email   = profile._json.email;
          result.name    = profile._json.name;
          result.picture = profile._json.picture;
          result.save(function(err, re){
            done(err, re);
          });
        }else{
          var insert = new app.userInfoModel({
            googleId : profile._json.id,
            email    : profile._json.email,
            name     : profile._json.name,
            picture  : profile._json.picture,
          });
          insert.save(function(err, re){
            done(err, re);
          });
        }
      }
    );
  })
);

app.use(function(req, res, next) {
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
app.use('/yuukyuu', yuukyuus);
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
