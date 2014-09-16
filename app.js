var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var mongoose = require('mongoose');
//var url = 'mongodb://' + conf.mongodbInfo.url + '/' + conf.mongodbInfo.dbName;
var url = 'mongodb://heroku_app29643687:t2oj54ve743tp4dlsmne3tr65d@ds035750.mongolab.com:35750/heroku_app29643687';
console.log(url);
mongoose.connect(url, function(err){
  if (err) throw err;
});
var sampleCollect = new mongoose.Schema({
  moveId: String,
  sectionEndPoints: {type:Array, default:[]},
  sectionDiffrents: {type:Array, default:[]},
  deleteFlg: {type : Boolean, default: false},
},{collection: conf.mongodbInfo.collectionName });
var sampleModel = mongoose.model(conf.mongodbInfo.dbName, sampleCollect);

var routes = require('./routes/index');
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
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
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
