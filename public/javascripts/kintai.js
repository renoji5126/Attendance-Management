
$(function(){
  $(".kintai_days").children("input").change(function(){
    console.log(this);
    $dom=$(this).parent();
    var day = $dom.children(".kintai_day").text();
    var month = $dom.children(".kintai_month").text();
    var year = $dom.children(".kintai_year").text();
    var start_time = $dom.children(".kintai_start_time").val();
    var end_time = $dom.children(".kintai_end_time").val();
    var regist_type = $dom.children(".kintai_type").val();
    console.log(day,start_time,end_time,regist_type);
  });
});
