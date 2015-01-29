
$(function(){
  $("input").change(function(){
    console.log(this);
    $dom=$(this).parent().parent();
    var day = $dom.children(".kintai_day").text();
    var month = $(".kintai_month").text();
    var year = $(".kintai_year").text();
    var start_time = $dom.children("td").children(".kintai_start_time").val();
    var end_time = $dom.children("td").children(".kintai_end_time").val();
    var regist_type = $dom.children("td").children(".kintai_type").val();
    console.log(year,month,day,start_time,end_time,regist_type);
    // TODO month,dayを0パディングしないとだめぽよ
    $.ajax({
      type: "POST",
      url: "/kintai/" + year + "/" + ('0' + month).slice(-2) + "/" + ('0' + day).slice(-2) + "/",
      data: "startTime=" + start_time + "&stopTime=" + end_time + "&type=" + regist_type 
    });
  });
});
