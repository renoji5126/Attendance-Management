'use strict';

const MONGOLAB_URI = "mongodb://heroku_app29643687:t2oj54ve743tp4dlsmne3tr65d@ds035750.mongolab.com:35750/heroku_app29643687";
const conf     = require('config');
const mongoose = require('mongoose');
const async    = require('async');
const dbsyurui =[{
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


var userInfo = new mongoose.Schema({
  googleId : String,
//社員ID的なのひとつ欲しい
  email    : {type: String , default: null},
  name     : {type: String , default: null},
  picture  : {type: String , default: null},
  plan     : {type: Number , default: 7.75},
  entryDate: {type: Date   , default: null},
  className: {type: Array  , default: []},
  admin    : {type: Boolean, default: false},
},{ collection : conf.mongodbInfo.collectionName_user });
const userInfoModel = mongoose.model( conf.mongodbInfo.collectionName_user , userInfo );

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
mongoose.model( "syutokus" , schema );
mongoose.model( "yuukyuus" , ykSchema );
mongoose.model( "syukkins" , ykSchema );

const userid = '113762053821955637715';//斎藤
//const userid = '118061165176342719586';//内田
const yu = { '有給': [] };
async.waterfall([(next) =>{
    console.log("mongo try connection url :", MONGOLAB_URI);
    console.log("mongoose version :",mongoose.version);
    mongoose.connect(MONGOLAB_URI, next);
  }, (next) => {
    const query = { 
      googleId: userid
    };
    const view = {};
    const opt = {sort: {
      //古い順
      registDay: 1
    }};
    mongoose.models.yuukyuus.find(query, view, opt, next);
  }, (docs, next) => {
    docs.forEach((val, i) => {
      docs[i].remains = docs[i]['発生日数'];
    });
    yu['有給'] = docs;
    return next(null);
  }, (next) => {
    const query = { 
      googleId: userid,
      syurui  : { $regex: /^有給/i }
    };
    const view = {};
    const opt = {sort: {
      //古い順
      registDay: 1
    }};
    mongoose.models.syutokus.find(query, view, opt, next);
  }, (docs, next) => {
    yu['申請済み'] = docs;
    return next(null);
  }, (next) => {
    let index_syu = 0;
    async.eachSeries(yu['申請済み'], (value, eachNext) => {
      let index_yu = 0;
      let resyurui = 0;
      const reg = new Date(value.registDay);
      const reg_2 = new Date(value.registDay);
      reg_2.setFullYear(reg_2.getFullYear() - 2);
      for (var i = 0; i < dbsyurui.length; i++) {
        if (dbsyurui[i].name === value.syurui) {
          resyurui = dbsyurui[i].day;
        }
      }
      return async.eachSeries(yu['有給'], (yuukyuu, yEachNext) => {
        const yuu = new Date(yuukyuu.registDay);
        if( yuukyuu.remains > 0 &&
            (yuukyuu.remains - resyurui) >= 0 &&
            yuu < reg &&
            reg_2 < yuu
          ) {
          yuukyuu.remains -= resyurui;
          yu['有給'][index_yu].remains = yuukyuu.remains;
          //console.log(yu['申請済み'][index_syu].consumeDay, '→', yu['有給'][index_yu].registDay);
          yu['申請済み'][index_syu].consumeDay = yu['有給'][index_yu].registDay;
          index_yu++;
          return yEachNext(1);
        }
        index_yu++;
        return yEachNext();
      }, (err) => {
        index_syu++;
        return eachNext(null);
      });
    }, next);
  }, (next) => {
    return async.eachSeries(yu['有給'], (yuukyuu, yEachNext) => {
      const yuukyuus = new mongoose.models.yuukyuus();
      Object.keys(yuukyuu).forEach((objectName) => {
        yuukyuus[objectName] = yuukyuu[objectName];
      });
      yuukyuus.save(yEachNext);
    }, next);
  }, (next) => {
    return async.eachSeries(yu['申請済み'], (syutoku, yEachNext) => {
      const syutokus = new mongoose.models.syutokus();
      Object.keys(syutoku).forEach((objectName) => {
        syutokus[objectName] = syutoku[objectName];
      });
      syutokus.save(yEachNext);
    }, next);
  }
], (err, result) => {
  console.log(yu['有給']);
  console.log(yu['申請済み'].length);
  setTimeout(() => {
  return process.exit();
  }, 1000);
});
