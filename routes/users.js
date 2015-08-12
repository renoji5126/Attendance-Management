var express = require('express');
var passport = require('passport');
var async = require('async');
var userinfo = module.parent.exports.userInfoModel;
var router = express.Router();
var mongoose = module.parent.exports.mongoose;
var userinfo = module.parent.exports.userInfoModel;
var model = mongoose.models.syutokus;
var ykmodel = mongoose.models.yuukyuusma;
var dkmodel = mongoose.models.syukkinsma;

/* GET users listing. */
router.get('/:id', function(req, res) {
  var id = req.params.id;
  var query = { googleId : id };
  var optisions = {admin : req.session.passport.user.admin}
  console.log("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1");
  async.parallel({
    user : function(plcb){
  console.log("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa2");
      userinfo.find(query, function(err, docs){ plcb(err, docs[0]); });
    }, syutokus: function(plcb){
  console.log("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa3");
      model.find(query, function(err, docs){ plcb(err, docs); });
    }, yuukyuus: function(plcb){
  console.log("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa4");
      ykmodel.find(query, function(err, docs){ plcb(err, docs); });
    }, syukkins: function(plcb){
  console.log("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa5");
      dkmodel.find(query, function(err, docs){ plcb(err, docs); });
    //},function(plcb){
    }
  },function(err, results){
  console.log("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa6");
    console.log(err.message);
    optisons.db = results;
    res.render('user', optisons);
  });
});

module.exports = router;
