var express = require('express');
var async = require('async');
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
var dbsyurui =[{
    name:'有給(全休)'
    ,day:1.0
  },{
    name:'有給(午前休)'
    ,day:0.5
  },{
    name:'有給(午後休)'
    ,day:0.5
  },{
    name:'代休'
    ,day:1.0
  },{
    name:'忌引'
    ,day:1.0
  }];

/* GET home page. */
router.get('/', function(req, res) {
  var options = { title: '休暇申請',syurui: dbsyurui };
  var query = {  
    archive   : false,
    googleId  : req.session.passport.user.googleId
  };
  async.waterfall([
    function(wfcb){
       //初期化
       var db = new Object();
       wfcb(null, db);
    },function(db, wfcb){
      async.parallel([
        function(plcb){
          ykmodel.find(query,{},{
                         sort  : {registDay: 1},
                       },function(err, result){
            db['有給休暇'] = result;
            plcb(err, result);
          });
        },function(plcb){
          dkmodel.find(query,{},{
                         sort  : {registDay: 1},
                       },function(err, result){
            db['休日出勤'] = result;
            plcb(err, result);
          });
        },function(plcb){
          model.find(query,{},{
                       sort  : {registDay: -1},
                       limit : 10
                     },function(err, result){
            db['申請済み休暇'] = result;
            plcb(err, result);
          });
        //},function(plcb){
        }],function(err, results){
          if(err){
            return wfcb(err, null);
          }
          console.log(db, results);
          return wfcb(null, db);
        }
      );
    //},function(wfcb){
    },function(db, wfcb){
      options.db = db;
      wfcb(null);
    }],function(err){
      return res.render('yuukyuu', options);
    });
});

/*
 * 同じ日付に登録がされているかチェックする。
 * チェックした日付の処理を振り分ける
 */
function registTypefind(registDay, userid, resultCb , noResultCb){
  return model.findOne(
    {   // query
      registDay  : registDay,
      googleId   : userid,
    },function(err, result){
      //console.log(result);
      if(result){
        return resultCb(err, result);
      }else{
        return noResultCb(err, result);
      }
  });
};

function ykconsumeDayfind(registDay, userid, remain, cb){
  var ago = new Date(registDay);
  ago.setFullYear(ago.getFullYear() - 2);
  ykmodel.findOne({
    googleId  : userid,
    registDay : { $gte : ago , $lte : registDay },
    remains   : { $gte  : remain }
  },{ // view
  },{ // option
    sort:{registDay: 1}
  },function(err, result){
    cb(err, result);
  });
}

/*
 * 代休の期限は1年？
 *
 */
function dkconsumeDayfind(registDay, userid, cb){
  var ago = new Date(registDay);
  ago.setFullYear(ago.getFullYear() - 1);
  dkmodel.findOne({
    googleId  : userid,
    registDay : { $gte : ago , $lte : registDay },
    remains   : { $gt  : 0 }
  },{ // view
    _id : 1
  },{ // option
    sort:{registDay: 1}
  },function(err, result){
    cb(err, result);
  });
}



/*
 * 有給テーブルから指定された日付とIDからカウント計算を行う
 *
 *
 */
function countCalc(record, count, cb){
  record.remains = record.remains + count;
  //残数が０以上なら通す
  console.log(record, count);
  if(record.remains >= 0){
    record.save(function(err, result){
      cb(err, result);
    });
  }else{
    cb(new Error("打ち消し対象のレコードの残数がたりません"), null);
  }
}

router.post('/', function(req, res) {
  //req.body= { syurui: '有給', date: '03/31/2015' }
  var registDay = new Date(req.body.date);
  var comment = req.body.comment;
  var userid = req.session.passport.user.googleId;
  //var model = mongoose.model( req.session.passport.user.id , schema );
//登録されている種類かどうかチェックしてから処理開始
  var syurui = null;
  var resyurui = null;
  for(var i = 0; i < dbsyurui.length; i++){
    if(dbsyurui[i].name === req.body.syurui){
      syurui = dbsyurui[i];
    }
  }

  if(syurui){
  // まず登録したい日付に他の登録がないかチェック
    registTypefind(registDay, userid, function(err, result){
      if(err){
        console.log(err); 
        return res.json(err);
      }
      // 種類が同一の場合処理を中断して返す
      if(req.body.syurui === result.syurui){
        console.log("既に登録されています。");
        return res.status(400).json({msg : "既に登録されています。"});
      }else{
        async.waterfall([
          function(cb){
            if(result.syurui.match(/(有給|代休)/)){
              for(var i = 0; i < dbsyurui.length; i++){
                if(dbsyurui[i].name === result.syurui){
                  resyurui = dbsyurui[i];
                }
                if(i === dbsyurui.length - 1){ cb(); }
              }
            }else{ cb(); }
          },function(cb){
            var query = { googleId  : userid,
                          registDay : result.consumeDay };
            if(result.syurui.match(/(有給)/)){
              console.log("選択された申請休暇が有給だったのでカウントアップ対象のレコードを探索します");
              ykmodel.findOne(query,function(err, record){
                cb(err, record);
              });
            }else if(result.syurui.match(/(代休)/)){
              console.log("選択された申請休暇が代休だったのでカウントアップ対象のレコードを探索します");
              dkmodel.findOne(query,function(err, record){
                cb(err, record);
              });
            }else{
              result.consumeDay = null;
              cb(null, null);
            }
          },function(record, cb){
            //既に登録されていた種類が有給または代休だった時
            if(result.syurui.match(/(有給|代休)/)){
              if(record){
                console.log("変更先が有給または代休だったのでカウントアップ処理を行います");
                countCalc(record, resyurui.day, function(err, re){
                  cb(err);
                });
              }else{
                cb(new Error('対象になるレコードが存在しません'));
              }
            }else{
              cb(null);
            }
          },function(cb){
            if(req.body.syurui.match(/(有給)/)){
              console.log("選択された申請休暇が有給だったのでカウントダウン対象のレコードを探索します");
              ykconsumeDayfind(registDay, userid, syurui.day, function(err, re){
                cb(err, re);
              });
            }else if(req.body.syurui.match(/(代休)/)){
              console.log("選択された申請休暇が代休だったのでカウントダウン対象のレコードを探索します");
              dkconsumeDayfind(registDay, userid, function(err, re){
                cb(err, re);
              });
            }else{
              result.consumeDay = null;
              cb(null, null);
            }
          },function(record, cb){
            //これから登録する種類が有給または代休だった時
            if(req.body.syurui.match(/(有給|代休)/)){
              if(record){
                console.log("選択された申請休暇が有給または代休だったのでカウントダウン処理を行います");
                countCalc(record, -syurui.day, function(err, re){
                  cb(err, re.registDay);
                });
              }else{
                cb(new Error('対象になるレコードが存在しません'));
              }
            }else{
              cb(null, null);
            }
          },function(registDay, cb){
            if(registDay){
              result.consumeDay = registDay;
            }
            // update処理
            result.syurui = req.body.syurui;
            result.comment= comment;
            result.save(function(err, result){
              cb(null, result)
            });
          }
        ],function(err, arg){
          // 描画処理
          if(err){
            console.log(err);
            return res.status(500).json(err);
          }else{
            console.log(arg);
            return res.json({msg : "success"});
          }
        });
      }
    }, function(err, result){
      if(err){ 
        console.log(err);
        return res.status(500).json(err);
      }
      // 登録なしなので登録する有給または第休の場合の処理とそれ以外の処理とわける。
      var insert;
      async.waterfall([function(cb){
        // insert処理
        insert = new model({
          registDay  : registDay,
          googleId   : userid,
          syurui     : syurui.name,
          comment    : comment
        });
        cb(null);
      },function(cb){
        if(req.body.syurui.match(/(有給)/)){
          console.log("選択された申請休暇が有給だったのでカウントダウン対象のレコードを探索します");
          ykconsumeDayfind(registDay, userid, syurui.day, function(err, re){
            console.log("aaaaa",re);
            cb(err, re);
          });
        }else if(req.body.syurui.match(/(代休)/)){
          console.log("選択された申請休暇が代休だったのでカウントダウン対象のレコードを探索します");
          dkconsumeDayfind(registDay, userid, function(err, re){
            console.log("aaaaa",re);
            cb(err, re);
          });
        }else{
          cb(null, null);
        }
      },function(record, cb){
        if(req.body.syurui.match(/(有給|代休)/)){
          if(record){
            console.log("選択された申請休暇が有給または代休だったのでカウントダウン処理を行います");
            countCalc(record, -syurui.day, function(err, re){
              insert.consumeDay = new Date(re.registDay);
              cb(err);
            });
          }else{
            cb(new Error('対象になるレコードが存在しません'));
          }
        }else{
          cb(null);
        }
      },function(cb){
        insert.save(function(err, re){
          cb(err, re);
        });
      }],function(err,arg){
        if(err){ 
          console.log(err);
          return res.status(500).json(err);
        }else{
          console.log(arg);
          res.json({msg: "success"});
        }
      });
    });
  }else{
    return res.status(400).json(new Error("登録がない情報です"));
  }
});

//var ykSchema = new mongoose.Schema({
//    registDay  : Date,
//    googleId   : String,
//    //registType : {type : String, default: "有給休暇" },
//    remains    : {type : Number, default: 0 },
//    "発生日数" : {type : Number, default: 0 }
//});
router.post('/ykreg', function(req, res) {
  //req.body= { syurui: '有給', date: '03/31/2015' }
  if(req.body.date){
  var registDay = new Date(req.body.date);
  }else{ return res.status(400).json(new Error("日付を入力してください"));}
  var userid = req.session.passport.user.googleId;
  var nissuu = parseInt(req.body.nissuu);
  if(req.session.passport.user.admin){
    ykmodel.findOne({
      registDay : registDay,
      googleId  : userid,
    }, function(err, result){
      if(err){ return res.status(500).json(err); }
      if(result){
        var sa = nissuu - result["発生日数"];
        result["発生日数"] = nissuu;
        result.remains = result.remains + sa;
        if( 0 < result.remains ){
          return result.save(function(err, result){
            if(err){return res.status(500).json(err);}
            return res.json({msg: "Success"});
          });
        }else{
          return res.status(400).json(new Error("残数が０以下になるような変更はできません"));
        }
      }else{
        var insert = new ykmodel({
                       registDay : registDay,
                       googleId  : userid,
                       remains   : nissuu,
                       "発生日数": nissuu,
                     });
        return insert.save(function(err, result){
          if(err){return res.status(500).json(err);}
          return res.json({msg: "Success"});
        });
      }
    });
  }else{
    res.status(403).json(new Error("権限がありません"));
  }
});
module.exports = router;
