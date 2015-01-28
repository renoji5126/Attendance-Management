
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
    console.log(day,start_time,end_time,regist_type);
  });
});
