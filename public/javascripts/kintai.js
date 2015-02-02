
$(function(){
  var regist = function(className){
    $dom=$(this).parent().parent();
    var day = $dom.children(".kintai_day").text();
    var month = $(".kintai_month").text();
    var year = $(".kintai_year").text();
    var start_time = $dom.children("td").children(".kintai_start_time").val();
    var stop_time = $dom.children("td").children(".kintai_stop_time").val();
    var regist_type = $dom.children("td").children(".kintai_type").val();
    console.log(year,month,day,start_time,stop_time,regist_type);
    if( start_time && stop_time && regist_type){
      $.ajax({
        type: "POST",
        url: "/kintai/" + year + "/" + ('0' + month).slice(-2) + "/" + ('0' + day).slice(-2) + "/",
        data: "startTime=" + start_time + "&stopTime=" + stop_time + "&type=" + regist_type 
      });
    }
  };
  $("input").change(function(e){
    console.log(e,this);
  });
});
