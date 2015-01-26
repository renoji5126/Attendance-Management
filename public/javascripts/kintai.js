$(function(){
  $(".kintai_days").children("input").change(function(){
    console.log(this);
    $dom=$(this).parent();
    console.log($dom.children(".kintai_day").text());
  });
});
