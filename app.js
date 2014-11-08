var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var conf = require('config');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);

var mongoose = require('mongoose');


//var passport = require('passport');
//var GoogleStrategy = require('passport-google').Strategy;
//
//passport.use(
//  new GoogleStrategy({
//    returnURL: 'http://renoji5126.orz.hm/auth/google/return',
//    realm:     'http://renoji5126.orz.hm/'
//  },
//  function(identifier, profile, done) {
//    userModel.findOrCreate({ openId: identifier }, function(err, user) {
//      done(err, user);
//    });
//  })
//);

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
  entryDate: {type : Date , default : ""},
  className: {type : Array, default : []},
},{collection: conf.collection_user });
var userInfoModel = mongoose.model(conf.mongodbInfo.dbName, userInfo);

var kinTai = new mongoose.Schema({
  startTime: Date,
  endTime: Date,
});

var routes = require('./routes/index');
var auths = require('./routes/auths');
var users = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(session({
  secret: 'uchida',
  store: new  MongoStore({
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
app.use(express.static(path.join(__dirname, 'public')));

app.use(function(req, res, next) {
    if(
       req.path === '/login' ||
       req.path === '/logout' || 
       req.path === '/auth/google' ||
       req.path === '/auth/google/return' ||
       req.user
    ){
      console.log("session:"+ JSON.stringify(req.user));
      next();
    }else{
      console.log("redirect:"+ req);
      res.redirect('/login');
    }
});

routes.setModel(userInfoModel);
auths.setModel(userInfoModel);
auths.setConfig(conf.googleAuth);

app.use('/', routes);
app.use('/auth', auths);
app.use('/users', users);

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
