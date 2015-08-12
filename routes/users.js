var express = require('express');
var passport = require('passport');
var async = require('async');
var userinfo = module.parent.exports.userInfoModel;
var router = express.Router();
var mongoose = module.parent.exports.mongoose;
var userinfo = module.parent.exports.userInfoModel;
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
var model = mongoose.model( "syutokus" , schema );
var ykmodel = mongoose.model( "yuukyuus" , ykSchema );
var dkmodel = mongoose.model( "syukkins" , ykSchema );

/* GET users listing. */
router.get('/:id', function(req, res) {
  var id = req.params.id;
  var query = { googleId : id };
  var optisions = {admin : req.session.passport.user.admin}
  async.parallel({
    user : function(plcb){
      userinfo.find(query, function(err, docs){ plcb(err, docs[0]); });
    }, syutokus: function(plcb){
      model.find(query, function(err, docs){ plcb(err, docs); });
    }, yuukyuus: function(plcb){
      ykmodel.find(query, function(err, docs){ plcb(err, docs); });
    }, syukkins: function(plcb){
      dkmodel.find(query, function(err, docs){ plcb(err, docs); });
    //},function(plcb){
    }
  ],function(err, results){
    optisons.db = results;
    res.render('user', optisons);
  });
});

module.exports = router;
