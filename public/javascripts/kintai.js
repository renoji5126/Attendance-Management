
$(function(){
  // /kintai で変更されたファイル群
  var registCal = function(){
    $dom=$(this).parent().parent();
    var day = $dom.children(".kintai_day").text();
    var month = $(".kintai_month").text();
    var year = $(".kintai_year").text();
    var start_time = $dom.children("td").children(".kintai_startTime").val();
    var stop_time = $dom.children("td").children(".kintai_stopTime").val();
    var regist_type = $dom.children("td").children(".kintai_registType").val();
    console.log(year,month,day,start_time,stop_time,regist_type);
    if( start_time && stop_time && regist_type){
      $.ajax({
        type: "POST",
        url: "/kintai/" + year + "/" + ('0' + month).slice(-2) + "/" + ('0' + day).slice(-2) + "/",
        data: "startTime=" + start_time + "&stopTime=" + stop_time + "&type=" + regist_type 
      });
    }
  };

  // ボタン押した時の挙動
  var regist = function(e){
    console.log(this);
    var day = $(this).parent().parent().children(".kintai_day").text();
    var month = $(".kintai_month").text();
    var year = $(".kintai_year").text();
    var val = $(this).val();
    console.log(year, month, day, val, e.target.className.split("kintai_")[1]);
    if( val ){
      $.ajax({
        type: "POST",
        url: "/kintai/" + year + "/" + ('0' + month).slice(-2) + "/" + ('0' + day).slice(-2) + "/",
        data: e.target.className.split("kintai_")[1] + "=" + val 
      });
    }
  };

  $("input").change(registCal);
  $().click(regist);
});
