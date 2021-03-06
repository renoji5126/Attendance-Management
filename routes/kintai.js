var express = require('express');
var mongoose = require('mongoose');
var passport = require('passport');
var async = require('async');
var router = express.Router();
var kintai_schema = module.parent.exports.kintaiSchema;
var mongoose = module.parent.exports.mongoose;

//指定された日付のデータをDBから探して返す
function CreateCalenderJson(_id, _day, _year, _month, cb){
  var day = parseInt(_day);
  var year = parseInt(_year);
  var month = parseInt(_month);
  if(isNaN(day) || isNaN(year) || isNaN(month) ){ 
    console.log({error:{msg:"Invalied required." ,status:400}});
    cb();
  }
  var model = mongoose.model( _id, kintai_schema);
  model.find(
    {// query
      year : year,
      month: month,
      day  : day
    },{// view
      _id         : 0
      ,startTime  : 1
      ,stopTime   : 1
      ,registType : 1
      ,registTime : 1
    },{// option
      sort:{created: -1},
      //limit: 1
    }, function(err, result){
      if(err) console.log(err)
      cb(result);
  });
}

/* GET users listing. */
router.get('/:year/:month', function(req, res) {
  if(
    !req.params.year.match(/^[0-9]{4}$/) ||
    !req.params.month.match(/^[0-9]{2}$/)
  ){ res.json({ message : "invaled request" }); }
  var year  = parseInt(req.params.year);
  var month = parseInt(req.params.month);
  var dat   = new Date();
  // Monthの設定は0-11
  dat.setFullYear(year);
  dat.setMonth(month);
  dat.setDate(0);
  var result = {
    year : year,
    month: month,
    day: {}
  };
  for( i = 1; i <= dat.getDate(); i++){
    result.day[i.toString()] = {};
  }
  var task = [];
  Object.keys(result.day).forEach(function(day, index){
    task.push(function(cb){
      CreateCalenderJson(req.session.passport.user.id, day, year, month, function(days){
        result.day[day.toString()] = days;
        cb(null, days);
      });
    });
    if(index === Object.keys(result.day).length - 1)
      async.series(task, function(err, results){
        res.json(result);
      });
  });
});

router.get('/:year/:month/:day', function(req, res) {
  if(
    !req.params.year.match(/^[0-9]{4}$/) ||
    !req.params.month.match(/^[0-9]{2}$/)||
    !req.params.day.match(/^[0-9]{2}$/)
  ){ res.redirect("/"); }
  var year = parseInt(req.params.year);
  var month= parseInt(req.params.month);
  var day  = parseInt(req.params.day);
  CreateCalenderJson(req.session.passport.user.id, day, req.params.year, req.params.month, function(result){
    res.json(result);
  });
});


router.post('/:year/:month/:day', function(req, res) {
  if(
    !req.params.year.match(/^[0-9]{4}$/) ||
    !req.params.month.match(/^[0-9]{2}$/)||
    !req.params.day.match(/^[0-9]{2}$/)  ||
    !req.body.type
  ){ res.json({message: "Failed"}); }
  var year = parseInt(req.params.year);
  var month= parseInt(req.params.month);
  var day  = parseInt(req.params.day);
  var startTime = new Date();
  startTime.setFullYear(year);
  startTime.setMonth(month - 1);
  startTime.setDate(day);
  var stime = req.body.startTime.split(":");
  startTime.setHours(parseInt(stime[0]) - 9 , parseInt(stime[1]), 0);//    + "+09:00"

  var stopTime = new Date();
  stopTime.setFullYear(year);
  stopTime.setMonth(month - 1);
  stopTime.setDate(day);
  var etime = req.body.stopTime.split(":");
  stopTime.setHours(parseInt(etime[0]) - 9 , parseInt(etime[1]), 0);//    + "+09:00"
  // TODO InvailedDateになってるので修正
  console.log(startTime, stopTime);
  var model = mongoose.model( req.session.passport.user.id, kintai_schema);
  var kintai = new model({
    "year" : year,
    "month": month,
    "day"  : day ,
    "startTime"  : startTime,
    "stopTime"   : stopTime,
    "registTime" : new Date(),
    "registType" : req.body.type
  });
  kintai.save(function(err){
    if(err){
      console.log(err);
      res.json(err);
    }else{
      res.json({message: "success"});
    }
  });
});

router.post('/:year/:month/:day/start', function(req, res) {
  if(
    !req.params.year.match(/^[0-9]{4}$/) ||
    !req.params.month.match(/^[0-9]{2}$/)||
    !req.params.day.match(/^[0-9]{2}$/)  ||
    !req.body.type
  ){ res.json({message: "Failed"}); }
  var year = parseInt(req.params.year);
  var month= parseInt(req.params.month);
  var day  = parseInt(req.params.day);
  var startTime = new Date();
  var model = mongoose.model( req.session.passport.user.id, kintai_schema);
  model.findOne(
    {// query
      year  : year,
      month : month,
      day   : day,
      registType : req.body.type
    },{// view
      _id        : 1
    },{// option
      sort:{created: -1},
      //limit: 1
    }, function(err, result){
      if(err) console.log(err);
      result.startTime = startTime;
      result.save(function(err){
        if(err) console.log(err);
      });
  });
});

router.post('/:year/:month/:day/end', function(req, res) {
  if(
    !req.params.year.match(/^[0-9]{4}$/) ||
    !req.params.month.match(/^[0-9]{2}$/)||
    !req.params.day.match(/^[0-9]{2}$/)  ||
    !req.body.type
  ){ res.json({message: "Failed"}); }
  var year = parseInt(req.params.year);
  var month= parseInt(req.params.month);
  var day  = parseInt(req.params.day);
  var stopTime = new Date();
  console.log(startTime, stopTime);
  var model = mongoose.model( req.session.passport.user.id, kintai_schema);
  model.findOne(
    {// query
      year  : year,
      month : month,
      day   : day,
      registType : req.body.type
    },{// view
      _id        : 1
    },{// option
      sort:{created: -1},
      //limit: 1
    }, function(err, result){
      if(err) console.log(err);
      result.stopTime = stopTime;
      result.save(function(err){
        if(err) console.log(err);
      });
  });
});

router.get('/', function(req, res){
  var date = new Date();
  var month = date.getMonth() + 1;
  var year  = date.getFullYear();
  date.setMonth(month);
  date.setDate(0);
  var result = {
    year : year,
    month: month,
    day: {}
  };
  for( i = 1; i <= date.getDate(); i++){
    result.day[i.toString()] = {};
  }
  var task = [];
  Object.keys(result.day).forEach(function(day, index){
    task.push(function(cb){
      CreateCalenderJson(req.session.passport.user.id, day, year, month, function(days){
        result.day[day.toString()] = days;
        cb(null, days);
      });
    });
    if(index === Object.keys(result.day).length - 1)
      async.series(task, function(err, results){
        res.render('kintai', { title : "勤怠入力", kintai: result });
      });
  });
});

module.exports = router;
