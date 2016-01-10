var express = require('express');
var passport = require('passport');
var async = require('async');
var json2csv = require('json2csv');
var fs = require('fs');
var iconv = require("iconv").Iconv;
var sjis = new Iconv('UTF-8', 'Shift_JIS');
var userinfo = module.parent.exports.userInfoModel;
var router = express.Router();
var mongoose = module.parent.exports.mongoose;
var userinfo = module.parent.exports.userInfoModel;
var model = mongoose.models.syutokus;
var ykmodel = mongoose.models.yuukyuus;
var dkmodel = mongoose.models.syukkins;
var op = {sort : {registDay : -1}};
/* GET users listing. */
router.get('/:id', function(req, res) {
  var id = req.params.id;
  var query = { googleId : id };
  var optisions = {admin : req.session.passport.user.admin}
  async.parallel({
    user : function(plcb){
      userinfo.find(query, function(err, docs){ plcb(err, docs[0]); });
    }, syutokus: function(plcb){
      model.find(query, {}, op, function(err, docs){ plcb(err, docs); });
    }, yuukyuus: function(plcb){
      ykmodel.find(query, {}, op, function(err, docs){ plcb(err, docs); });
    }, syukkins: function(plcb){
      dkmodel.find(query, {}, op, function(err, docs){ plcb(err, docs); });
    //},function(plcb){
    }
  },function(err, results){
    if(err) console.log(err.message);
    optisions.db = results;
    res.render('user', optisions);
  });
});

//export用uri
router.get('/:id/export', function(req, res) {
  var id = req.params.id;
  var query = { googleId : id };
  async.parallel({
    user : function(plcb){
      userinfo.find(query, function(err, docs){ plcb(err, docs[0]); });
    }, syutokus: function(plcb){
      model.find(query, {}, op, function(err, docs){ plcb(err, docs); });
    }, yuukyuus: function(plcb){
      ykmodel.find(query, {}, op, function(err, docs){ plcb(err, docs); });
    }, syukkins: function(plcb){
      dkmodel.find(query, {}, op, function(err, docs){ plcb(err, docs); });
    //},function(plcb){
    }
  },function(err, results){
    if(err) console.log(err.message);
    res.json(results);
  });
});
var json2csvOp = { newLine: "\r\n" };
var sendFileOption = {
    root: '/tmp/',
    dotfiles: 'deny',
    headers: {
        'x-timestamp': Date.now(),
        'x-sent': true
    }
  };
//export用uri
router.get('/:id/export/syukkins.csv', function(req, res) {
  var id = req.params.id;
  var query = { googleId : id };
  dkmodel.find(query, {}, op, function(err, docs){ 
    if(err) console.log(err.message);
    json2csvOp.data = docs;
    json2csvOp.fields = [
      "registDay",
      "googleId",
      "発生日数",
      "archive",
      "remains"
    ];
    json2csv(json2csvOp,function(err, data){
      res.setHeader('Content-Type', 'text/csv; charset=Shift_JIS');
      res.send(sjis.convert(data));
    });
  });
});

//export用uri
router.get('/:id/export/syutokus.csv', function(req, res) {
  var id = req.params.id;
  var query = { googleId : id };
  var op = {sort : {registDay : -1}};
  model.find(query, {}, op, function(err, docs){ 
    if(err) console.log(err.message);
    json2csvOp.data = docs;
    json2csvOp.fields = [
      "googleId",
      "consumeDay",
      "syurui",
      "archive",
      "comment"
    ];
    json2csv(json2csvOp,function(err, data){
      res.setHeader('Content-Type', 'text/csv; charset=Shift_JIS');
      res.send(sjis.convert(data));
    });
  });
});

//export用uri
router.get('/:id/export/yuukyuus.csv', function(req, res) {
  var id = req.params.id;
  var query = { googleId : id };
  ykmodel.find(query, {}, op, function(err, docs){
    if(err) console.log(err.message);
    json2csvOp.data = docs;
    json2csvOp.fields = [
      "registDay",
      "googleId",
      "発生日数",
      "archive",
      "remains"
    ];
    json2csv(json2csvOp, function(err, data){
      res.setHeader('Content-Type', 'text/csv; charset=Shift_JIS');
      res.send(sjis.convert(data));
    });
  });
});


module.exports = router;
