var express = require('express');
var async = require('async');
var router = express.Router();
var mongoose = module.parent.exports.mongoose;
var userinfo = module.parent.exports.userInfoModel;
var model = mongoose.models.syutokus;
var ykmodel = mongoose.models.yuukyuus;
var dkmodel = mongoose.models.syukkins;
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
    name:'欠勤'
    ,day:1.0
  },{
    name:'忌引'
    ,day:1.0
  }];

var resToJson = function(message, result){
  var ret = {msg: message};
  if(result) ret.result = result;
  return ret;
}

router.get('/admin', function(req, res) {
  if(req.session.passport.user.admin){
    var options = { title: 'admin' , admin: req.session.passport.user.admin};
    var domain = req.session.passport.user.email.split("@")[1];
    var query = { email : { $regex: "@" + domain , $options: "i"} } ;
    var view = { googleId: 1, name :1};
    userinfo.find(query, view , function(err, docs){
      //res.json(docs);
      options.users = docs;
      var gid_list = [];
      docs.forEach(function(v,i){ gid_list.push( v.googleId ); });
      ykmodel.find({ googleId :{ $in : gid_list }},function(ykerr, ykdocs){
        options.db = ykdocs;
        console.log(options);
        res.render('admin', options);
      });
    });
  }else{
    res.redirect('/')
  }
});

/* GET home page. */
router.get('/', function(req, res) {
  var options = {
    title: '休暇申請',
    syurui: dbsyurui ,
    admin: req.session.passport.user.admin,
    googleId: req.session.passport.user.googleId
  };
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
                         sort  : {registDay: -1},
                       },function(err, result){
            db['有給休暇'] = result;
            plcb(err, result);
          });
        },function(plcb){
          dkmodel.find(query,{},{
                         sort  : {registDay: -1},
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
  // 二年以内のデータの抽出
  // ※有給の期限は二年が限度だから
  ago.setFullYear(ago.getFullYear() - 2);
  var query ={
    googleId  : userid,
    registDay : { $gte : ago , $lte : registDay },
    remains   : { $gte  : remain }
  };
  var view = {};
  var option ={ sort:{registDay: 1} };
  console.log(registDay,userid,query,view,option);
  ykmodel.findOne(query, view, option, function(err, result){
    console.log(err,result);
    cb(err, result);
  });
}

/*
 * 休日出勤の期限は１ヶ月前から２ヶ月後まで
 * 
 */
function dkconsumeDayfind(registDay, userid, cb){
  var ago = new Date(registDay);
  var before = new Date(registDay);
  ago.setMonth(ago.getMonth() - 2);
  before.setMonth(before.getMonth() + 1);
  var query = {
    googleId  : userid,
    registDay : { $gte : ago , $lte : before },
    remains   : { $gt  : 0 }
  };
  var view = {};
  var option = { sort:{registDay: 1} };
  console.log(registDay,userid,query,view,option);
  dkmodel.findOne(query, view, option, function(err, result){
    console.log(err,result);
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
        return res.json(resToJson(err.message));
      }
      // 種類が同一の場合処理を中断して返す
      if(req.body.syurui === result.syurui){
        console.log("既に登録されています。");
        return res.status(400).json(resToJson("既に登録されています。"));
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
            return res.json(resToJson(err.message));
          }else{
            console.log(arg);
            return res.json(resToJson("登録完了！"));
          }
        });
      }
    }, function(err, result){
      if(err){ 
        console.log(err);
        return res.json(resToJson(err.message));
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
            cb(err, re);
          });
        }else if(req.body.syurui.match(/(代休)/)){
          console.log("選択された申請休暇が代休だったのでカウントダウン対象のレコードを探索します");
          dkconsumeDayfind(registDay, userid, function(err, re){
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
          return res.json(resToJson(err.message));
        }else{
          console.log(arg);
          res.json(resToJson("登録完了！"));
        }
      });
    });
  }else{
    return res.json(resToJson("登録がない情報です"));
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
  }else{ return res.status(400).json(resToJson("日付を入力してください"));}
  var userid;
  if( req.session.passport.user.admin && req.body.user ){
    userid = req.body.user;
  }else{
    userid = req.session.passport.user.googleId;
  }
  var nissuu = parseInt(req.body.nissuu);
  if(req.session.passport.user.admin){
    ykinsert(registDay, userid, nissuu, function(err, msg){
      if(err){
        res.json(resToJson(err.message));
      }else{
        res.json(resToJson(msg));
      }
    });
  }else{
    res.status(403).json(resToJson( "権限がありません"));
  }
});

var ykinsert = function(registDay, userid, nissuu, cb){
  ykmodel.findOne({
    registDay : registDay,
    googleId  : userid,
  }, function(err, result){
    if(err){ cb(err) }
    if(result){
      var sa = nissuu - result["発生日数"];
      result["発生日数"] = nissuu;
      result.remains = result.remains + sa;
      if( 0 < result.remains ){
        result.save(function(err, result){
          cb(err, "Success");
        });
      }else{
        cb(new Error("残数が０以下になるような変更はできません"));
      }
    }else{
      var insert = new ykmodel({
                     registDay : registDay,
                     googleId  : userid,
                     remains   : nissuu,
                     "発生日数": nissuu,
                   });
      return insert.save(function(err, result){
        if(err){ cb(err); }
        cb(null, "Success");
      });
    }
  });
}

//var dkSchema = new mongoose.Schema({
//    registDay  : Date,
//    googleId   : String,
//    remains    : {type : Number, default: 0 },
//    "発生日数" : {type : Number, default: 0 }
//});
router.post('/dkreg', function(req, res) {
  //req.body= { syurui: '有給', date: '03/31/2015' }
  if(req.body.date){
    var registDay = new Date(req.body.date);
  }else{ return res.status(400).json(resToJson("日付を入力してください"));}
  var userid = req.session.passport.user.googleId;
  var nissuu = parseInt(req.body.nissuu);
  dkmodel.findOne({
    registDay : registDay,
    googleId  : userid,
  }, function(err, result){
    if(err){ return res.status(500).json(resToJson(err.message)); }
    if(result){
      return res.status(400).json(resToJson("既に登録済みです"));
    }else{
      var insert = new dkmodel({
                     registDay : registDay,
                     googleId  : userid,
                     remains   : 1,
                     "発生日数": 1,
                   });
      return insert.save(function(err, result){
        if(err){return res.status(500).json(resToJson(err));}
        return res.json(resToJson("登録完了！"));
      });
    }
  });
});


router.delete('/', function(req, res) {
  var userid = req.body.userid;
  if(req.session.passport.user.admin || req.session.passport.user.googleId == req.body.userid){
    userid = req.body.id;
  }else{
    res.json(resToJson("権限がない"));
  }
});

module.exports = router;
