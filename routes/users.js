var express = require('express');
var passport = require('passport');
var async = require('async');
var json2csv = require('json2csv');
var userinfo = module.parent.exports.userInfoModel;
var router = express.Router();
var mongoose = module.parent.exports.mongoose;
var userinfo = module.parent.exports.userInfoModel;
var model = mongoose.models.syutokus;
var ykmodel = mongoose.models.yuukyuus;
var dkmodel = mongoose.models.syukkins;

/* GET users listing. */
router.get('/:id', function(req, res) {
  var id = req.params.id;
  var query = { googleId : id };
  var op = {sort : {registDay : -1}};
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
  var op = {sort : {registDay : -1}};
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

//export用uri
router.get('/:id/export/syukkins.csv', function(req, res) {
  var id = req.params.id;
  var query = { googleId : id };
  var op = {sort : {registDay : -1}};
  dkmodel.find(query, {}, op, function(err, docs){ 
    if(err) console.log(err.message);
    json2csv({
      data  : docs,
      fields: [
        "registDay",
        "googleId",
        "発生日数",
        "archive",
        "remains"
      ]
    },function(err, data){
      res.send(data);
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
    
    json2csv({
      data : docs,
      fields: [
        "registDay",
        "googleId",
        "consumeDay",
        "syurui",
        "archive",
        "comment"
      ]
    },function(err, data){
      res.send(data);
    });
  });
});

//export用uri
router.get('/:id/export/yuukyuus.csv', function(req, res) {
  var id = req.params.id;
  var query = { googleId : id };
  var op = {sort : {registDay : -1}};
  ykmodel.find(query, {}, op, function(err, docs){
    json2csv({
      data  : docs,
      fields: [
        "registDay",
        "googleId",
        "発生日数",
        "archive",
        "remains"
      ]
    },function(err, data){
      res.send(data);
    });
  });
});


module.exports = router;
