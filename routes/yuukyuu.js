var express = require('express');
var async = require('async');
var router = express.Router();
var mongoose = module.parent.exports.mongoose;
var schema = new mongoose.Schema({
    registDay  : Date,
    googleId   : String,
    //registType : {type : String, default: "申請休暇" },
    consumeDay : Date,
    syurui     : {type : String, default: null }
});
var ykSchema = new mongoose.Schema({
    registDay  : Date,
    googleId   : String,
    //registType : {type : String, default: "有給休暇" },
    remains    : {type : Number, default: 0 },
    ccurrences : {type : Number, default: 0 }
});
var model = mongoose.model( "取得休暇" , schema );
var ykmodel = mongoose.model( "有給休暇" , ykSchema );
var dkmodel = mongoose.model( "振替休暇" , ykSchema );
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
  res.render('yuukyuu', { title: '休暇申請',syurui: dbsyurui });
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
    },{ // view
      _id : 1
    },{ // option
      sort:{created: -1}
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
    _id : 1
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
  var userid = req.session.passport.user.id;
  //var model = mongoose.model( req.session.passport.user.id , schema );
//登録されている種類かどうかチェックしてから処理開始
  var syurui = null;
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
        return res.json({msg : "既に登録されています。"});
      }else{
        async.waterfall([
          function(cb){
            var query = { googleId  : userid,
                          registDay : registDay };
            if(result.syurui.match(/(有給)/).length){
              console.log("選択された申請休暇が有給だったのでカウントアップ対象のレコードを探索します");
              ykmodel.findOne(query,function(err, record){
                cb(err, record);
              });
            }else if(result.syurui.match(/(代休)/).length){
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
            if(result.syurui.match(/(有給|代休)/).length && record){
              console.log("変更先が有給または代休だったのでカウントアップ処理を行います");
              countCalc(record, syurui.day, function(err, re){
                cb(err);
              });
            }else{
              cb(null);
            }
          },function(cb){
            if(req.body.syurui.match(/(有給)/).length){
              console.log("選択された申請休暇が有給だったのでカウントダウン対象のレコードを探索します");
              ykconsumeDayfind(registDay, userid, syurui.day, function(err, re){
                cb(err, re);
              });
            }else if(req.body.syurui.match(/(代休)/).length){
              console.log("選択された申請休暇が代休だったのでカウントダウン対象のレコードを探索します");
              dkconsumeDayfind(registDay, userid, syurui.day, function(err, re){
                cb(err, re);
              });
            }else{
              result.consumeDay = null;
              cb(null, null);
            }
          },function(record, cb){
            //これから登録する種類が有給または代休だった時
            if(req.body.syurui.match(/(有給|代休)/).length && record){
              console.log("選択された申請休暇が有給または代休だったのでカウントアップ処理を行います");
              countCalc(record, -syurui.day, function(err, re){
                cb(err, re.registDay);
              });
            }else{
              cb(null, null);
            }
          },function(registDay, cb){
            if(registDay){
              result.consumeDay = registDay;
            }
            // update処理
            result.syurui = req.body.syurui;
            result.save(function(err, result){
              cb(null, result)
            });
          }
        ],function(err, arg){
          // 描画処理
          if(err){
            console.log(err);
            return res.json(err);
          }else{
            console.log(arg);
            return res.json({msg : "success"});
          }
        });
      }
    }, function(err, result){
      if(err){ 
        console.log(err);
        return res.json(err);
      }
      // 登録なしなので登録する有給または第休の場合の処理とそれ以外の処理とわける。

      async.waterfall([function(cb){
        if(req.body.syurui.match(/(有給)/).length){
          console.log("選択された申請休暇が有給だったのでカウントダウン対象のレコードを探索します");
          ykconsumeDayfind(registDay, userid, syurui.day, function(err, re){
            cb(err, re);
          });
        }else if(req.body.syurui.match(/(代休)/).length){
          console.log("選択された申請休暇が代休だったのでカウントダウン対象のレコードを探索します");
          dkconsumeDayfind(registDay, userid, function(err, re){
            cb(err, re);
          });
        }else{
          cb(null, null);
        }
      },function(record, cb){
        if(result.syurui.match(/(有給|代休)/).length && record){
          console.log("変更先が有給または代休だったのでカウントアップ処理を行います");
          countCalc(record, -syurui.day, function(err, re){
            cb(err, re.registDay);
          });
        }else{
          cb(new Error('対象になるレコードが存在しません'));
        }
      },function(cb){
        // insert処理
        var insert = new model({
          registDay  : registDay,
          googleId   : userid,
          syurui     : syurui.name
        });
        insert.save(function(err, re){
          cb(err, re);
        });
      }],function(err,arg){
        if(err){ 
          console.log(err);
          return res.json(err);
        }else{
          console.log(arg);
          res.json({msg: "success"});
        }
      });
    });
  }else{
    res.json({msg: "登録がない情報です"});
  }
});

module.exports = router;
