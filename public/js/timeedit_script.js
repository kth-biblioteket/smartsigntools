$(document).ready(function() {
    //Hämta events för dagen(pågående och kommande händelser)
    getEvents();
    //Visa Dagens datum
    //document.getElementById('todaysdate').innerHTML = todaysdate();
    //Starta en digital klocka att visa på sidan
    //startTime();
    //Starta en "analog" klocka att visa på sidan
    //drawClock();
});

function addZero(i) {
    if (i < 10) {
        i = "0" + i;
    }
    return i;
}

function getweekday(nr) {
    var weekday=new Array(7);
    weekday[1]="Måndag";
    weekday[2]="Tisdag";
    weekday[3]="Onsdag";
    weekday[4]="Torsdag";
    weekday[5]="Fredag";
    weekday[6]="Lördag";
    weekday[0]="Söndag";
    return weekday[nr];
}

function getmonth(nr) {
    var month=new Array(7);
    month[0]="Januari";
    month[1]="Februari";
    month[2]="Mars";
    month[3]="April";
    month[4]="Maj";
    month[5]="Juni";
    month[6]="Juli";
    month[7]="Augusti";
    month[8]="September";
    month[9]="Oktober";
    month[10]="November";
    month[11]="December";
    return month[nr];
}

function todaysdate() {
    var todaysdate = "",
        today = new Date(),
        year = today.getFullYear(),
        day = today.getDate(),
        weekday = getweekday(today.getDay()),
        monthname = getmonth(today.getMonth()),
    todaysdate = weekday + " " + day + " " + monthname + ", " + year
    return todaysdate;
}
function startTime() {
    var today = new Date(),
        h = addZero(today.getHours()),
        m = addZero(today.getMinutes()),
        s = addZero(today.getSeconds());
        
    document.getElementById('currenttime').innerHTML = h + ":" + m;
    t = setTimeout(function () {
        startTime()
    }, 1000);
}

/**
 * 
 * Funktion som anropar Lokalbokningens Api
 * 
 */
function getEvents(){
    //Hämta dagens datum
    var today = new Date();
    var dd = addZero(today.getDate());
    var mm = addZero(today.getMonth()+1); //January is 0!
    var yyyy = today.getFullYear();
    var todaysdate = yyyy + '' + mm + '' + dd;
    //CORS funkar inte i IE9 (som smartsign bygger på)
    $.ajax({
        url: 'https://cloud.timeedit.net/kth/web/public01/ri.json?h=f&sid=3&p=' + todaysdate + '-' + todaysdate + '&objects=420804.4%2C421314.4%2C417157.4%2C420802.4%2C417154.4%2C353552.4%2C420801.4%2C392851.4%2C417156.4&ox=0&types=0&fe=0&g=f&pl=f&sec=t&h2=2'
        /*
        success: function(){
        },
        error: function(){
        },
        complete: function() {
        }
        */
    });
}

/**
 * 
 * Funktion för att hantera fel
 * 
 */
$(document).ajaxError(function (event, jqxhr, settings) {
    if (settings.url.indexOf("events") != -1) {
          console.log(jqxhr.responseText);
    }
});

/**
 * 
 * Funktion som hanterar svaret från Lokalbokning Api
 * 
 * TimeEdit returnerar json som html/text(responseText)
 * 
 */
$(document).ajaxSuccess(function (event, jqxhr, settings) {
    nobookingstoshow = true;
    //Rubriker
    jsonbookings = JSON.parse(jqxhr.responseText);
    html = '<div class="float bookingheader"><div class="eventtime">Time</div><div class="eventobject">Room</div><div class="eventtitle">Event</div></div>';
    if(jsonbookings.reservations.length > 0) {
        jsonbookings.reservations.forEach(function(element) {
            var info = '';
            var currentdate = new Date();
            var eventenddate = new Date();
            eventenddate.setHours(element.endtime.substr(0,2),element.endtime.substr(3,2),0);
            //currentdate.setHours(00,00,0);
            
            //visa inte om sluttiden för eventet har passerats. Lokal får inte vara tom!
            if (eventenddate > currentdate && element.columns[4] != "") {
                if(element.columns[6]!=""){ info = ', ' + element.columns[6];}
                html += '<div class="float bookingrow"><div class="eventtime">' + element.starttime.substr(0,5) + ' - ' + element.endtime.substr(0,5) + '</div><div class="eventobject">' + element.columns[4].replace('§', '').replace('-','') + '</div><div class="eventtitle"> ' + element.columns[5] + info + '</div></div>';
                nobookingstoshow = false;
            }
        }); 
    } else {
        html = '<div class="float bookingheader">No bookings</div>';
    }
    //uppdatera html
    if(nobookingstoshow) {
        html = '<div class="float bookingheader">No bookings</div>';
    }
    $("#lokalbokningar").html(html);
});

/*
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");
var radius = canvas.height / 2;
ctx.translate(radius, radius);
radius = radius * 0.90
*/

function drawClock() {
    ctx.clearRect(-150, -150, canvas.width, canvas.height);
    drawFace(ctx, radius);
    drawNumbers(ctx, radius);
    drawTime(ctx, radius);
    t2 = setTimeout(function () {
        drawClock()
    }, 1000);
}

function drawFace(ctx, radius) {
  var grad;
  //Bakgrund
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, 2*Math.PI);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fill();
  grad = ctx.createRadialGradient(0,0,radius*0.95, 0,0,radius*1.05);
  grad.addColorStop(0, '#333');
  grad.addColorStop(0.5, '#fff');
  grad.addColorStop(1, '#333');
  ctx.strokeStyle = grad;
  ctx.lineWidth = radius*0.1;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, radius*0.1, 0, 2*Math.PI);
  ctx.fillStyle = '#333';
  ctx.fill();
}

function drawNumbers(ctx, radius) {
  var ang;
  var num;
  ctx.font = radius*0.15 + "px arial";
  ctx.textBaseline="middle";
  ctx.textAlign="center";
  for(num = 1; num < 13; num++){
    ang = num * Math.PI / 6;
    ctx.rotate(ang);
    ctx.translate(0, -radius*0.85);
    ctx.rotate(-ang);
    ctx.fillText(num.toString(), 0, 0);
    ctx.rotate(ang);
    ctx.translate(0, radius*0.85);
    ctx.rotate(-ang);
  }
}

function drawTime(ctx, radius){
    var now = new Date();
    var hour = now.getHours();
    var minute = now.getMinutes();
    var second = now.getSeconds();
    hour=hour%12;
    hour=(hour*Math.PI/6)+
    (minute*Math.PI/(6*60))+
    (second*Math.PI/(360*60));
    drawHand(ctx, hour, radius*0.5, radius*0.07);

    minute=(minute*Math.PI/30)+(second*Math.PI/(30*60));
    drawHand(ctx, minute, radius*0.8, radius*0.07);

    second=(second*Math.PI/30);
    drawHand(ctx, second, radius*0.9, radius*0.02);
}

function drawHand(ctx, pos, length, width) {
    ctx.beginPath();
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.moveTo(0,0);
    ctx.rotate(pos);
    ctx.lineTo(0, -length);
    ctx.stroke();
    ctx.rotate(-pos);
}