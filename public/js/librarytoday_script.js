$(document).ready(async function() {
    //Hämta environment variabler
    const response = await fetch('/smartsigntools/api/v1/env');
    const env = await response.json();
    //Hämta events för dagen(pågående och kommande händelser)
    let events = []
    let today;
    let language;
    let librarycode;
    let librarymorecode;
    //Hämta dagens datum(eller använd urlparameter om angiven)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('todaysdate')) {
        today = new Date(urlParams.get('todaysdate'));
    } else {
        today = new Date();
    }

    if (urlParams.has('language')) {
        language = urlParams.get('language');
    } else {
        language = 'en';
    }

    if (urlParams.has('librarycode')) {
        librarycode = urlParams.get('librarycode');
    }

    if (urlParams.has('librarymorecode')) {
        librarymorecode = urlParams.get('librarymorecode');
    }

    let dd = addZero(today.getDate());
    let mm = addZero(today.getMonth()+1); //January is 0!
    let yyyy = today.getFullYear();
    let todaysdate

    //Öppettider
    todaysdate = yyyy + '-' + mm + '-' + dd;
    timeditresponse = await makeHttpRequest('GET', `${env.bookingsystem_external_api_serverurl}v1/openinghoursjson/openinghours/${todaysdate}/${librarycode}/${librarymorecode}/${language}`)
    jsontimes = JSON.parse(timeditresponse);
    if(jsontimes) {
        if (jsontimes.opentoday){
            $(".openinghours").html("Open " + jsontimes.opentodayhours_startpage);
        } else {
            $(".openinghours").html("Closed ");
        }
    } 
    //TimeEdit
    todaysdate = yyyy + '' + mm + '' + dd;
    timeditresponse = await makeHttpRequest('GET', `https://cloud.timeedit.net/kth/web/public01/ri.json?h=f&sid=3&p=${todaysdate}-${todaysdate}&objects=420804.4%2C421314.4%2C417157.4%2C420802.4%2C417154.4%2C353552.4%2C420801.4%2C392851.4%2C417156.4&ox=0&types=0&fe=0&g=f&pl=f&sec=t&h2=2`)
    jsonbookings = JSON.parse(timeditresponse);
    if(jsonbookings.reservations.length > 0) {
        jsonbookings.reservations.forEach(function(element) {
            events.push({ 
                "type": "timeedit",
                "eventid" : element.id,
                "location" : element.columns[4],
                "title" : element.columns[5] + (element.columns[6]!="" ? ', ' + element.columns[6] : '') ,
                "isalldayevent" : "",
                "start" : element.startdate + ' ' + element.starttime,
                "end" : element.enddate + ' ' + element.endtime,
                "categories" : []
            })
        }); 
    } 

    //Outlook
    todaysdate = yyyy + '-' + mm + '-' + dd;
    outlookresponse = await makeHttpRequest('GET', `/smartsigntools/api/v1/outlook/calendaritems/emailaddress/gvs-kthb-sydostragalleriet@ug.kth.se?&startdate=${todaysdate} 00:00:00&enddate=${todaysdate} 23:59:00`)
    jsonbookings = JSON.parse(outlookresponse);
    //Filtrera på kategorier
    const desiredCategories = env.outlookcategories.split(",").map(category => category.trim());
    //const desiredCategories = ["Sydöstra galleriet", "Newton", "Bibliotekshallen", "Entréhallen", "Glasväggen"];
    if(jsonbookings.length > 0) {
        jsonbookings.forEach(function(element) {
            let matches = element.categories.some(category => desiredCategories.includes(category));
            if (matches) {
                events.push({ 
                    "type": "outlook",
                    "eventid" : element.eventid,
                    "location" : element.location,
                    "title" : element.title ,
                    "isalldayevent" : element.isalldayevent,
                    "start" : element.start,
                    "end" : element.end,
                    "categories" : element.categories,
                })
            }
        }); 
    } 
    events.sort((a, b) => {
        return new Date(a.start) - new Date(b.start);
    });

    let start
    nobookingstoshow = true;
    html = '<div class="bookingheader"><div class="eventtitle">Event</div><div class="eventtime">Time</div><div class="eventobject">Location</div></div>';
    html += '<div class="divider"></div>';
            if(events.length > 0) {
                events.forEach(function(element) {
                    let info = '';
                    let currentdate = new Date();
                    let eventenddate = new Date(element.end);
                    //visa inte om sluttiden för eventet har passerats. Lokal får inte vara tom!
                    if (eventenddate > today && element.type == "timeedit" && element.location != "") {
                        element.location = element.location.replace(/[§-]/g, '')
                        html += '<div class="bookingrow"><div class="eventtitle"> ' + element.title + '</div><div class="eventtime">' + element.start.substr(11,2) + '–' + element.end.substr(11,2) + '</div><div class="eventobject">' + element.location + '</div></div>';
                        nobookingstoshow = false;
                    }
                    if (eventenddate > today && element.type == "outlook") {
                        html += '<div class="bookingrow"><div class="eventtitle"> ' + element.title + '</div><div class="eventtime">' + element.start.substr(11,2) + '–' + element.end.substr(11,2) + '</div><div class="eventobject">' + element.categories[0] + '</div></div>';
                        nobookingstoshow = false;
                    }
                }); 
            } else {
                html = '<div class="bookingheader">No bookings</div>';
            }
            //uppdatera html
            if(nobookingstoshow) {
                html = '<div class="bookingheader">No bookings</div>';
            }
            $("#lokalbokningar").html(html);
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

function removeLeadingZero(time) {
    let [hours, minutes] = time.split(':');
    hours = parseInt(hours, 10);
    minutes = parseInt(minutes, 10);
    return `${hours}:${minutes < 10 ? '0' + minutes : minutes}`;
}

function getweekday(nr) {
    let weekday=new Array(7);
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
    let month=new Array(7);
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
function getTimeEditEvents(){
    //Hämta dagens datum
    var today = new Date();
    var dd = addZero(today.getDate());
    var mm = addZero(today.getMonth()+1); //January is 0!
    var yyyy = today.getFullYear();
    var todaysdate = yyyy + '' + mm + '' + dd;
    //CORS funkar inte i IE9 (som smartsign bygger på)
    $.ajax({
        url: 'https://cloud.timeedit.net/kth/web/public01/ri.json?h=f&sid=3&p=' + todaysdate + '-' + todaysdate + '&objects=420804.4%2C421314.4%2C417157.4%2C420802.4%2C417154.4%2C353552.4%2C420801.4%2C392851.4%2C417156.4&ox=0&types=0&fe=0&g=f&pl=f&sec=t&h2=2',
        method: 'GET',
        success: function(response){
            // TimeEdit returnerar json som html/text
            nobookingstoshow = true;
            //Rubriker
            jsonbookings = JSON.parse(response);
            html = '<div class="bookingheader"><div class="eventtitle">Event</div><div class="eventtime">Time</div><div class="eventobject">Room</div><div class="eventmoreinfo">More info</div></div>';
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
                        html += '<div class="bookingrow"><div class="eventtitle"> ' + element.columns[5] + info + '</div><div class="eventtime">' + element.starttime.substr(0,2) + '–' + element.endtime.substr(0,2) + '</div><div class="eventobject">' + element.columns[4].replace('§', '').replace('-','') + '</div><div class="eventqrcode"><img style="width:2cm;height:2cm" src="/smartsigntools/api/v1/calendar/event/qrcode/56?format=image"></div></div>';
                        nobookingstoshow = false;
                    }
                }); 
            } else {
                html = '<div class="bookingheader">No bookings</div>';
            }
            //uppdatera html
            if(nobookingstoshow) {
                html = '<div class="bookingheader">No bookings</div>';
            }
            $("#lokalbokningar").html(html);
        },
        error: function(xhr, status, error){
            console.log(error);
        },
        complete: function() {
        }
    });
}

/**
 * 
 * Funktion som hämtar bokningar från outlook/exchange
 * 
 */
function getOutlookEvents(calendar){
    //Hämta dagens datum
    var today = new Date();
    var dd = addZero(today.getDate());
    var mm = addZero(today.getMonth()+1); //January is 0!
    var yyyy = today.getFullYear();
    var todaysdate = yyyy + '-' + mm + '-' + dd;
    //CORS funkar inte i IE9 (som smartsign bygger på)
    $.ajax({
        url: `/smartsigntools/api/v1/outlook/calendaritems/emailaddress/${calendar}?&startdate=${todaysdate} 00:00:00&enddate=${todaysdate} 23:59:00`,
        method: 'GET',
        success: function(response){
            response.forEach(function(booking) {
                console.log(booking)
            })
        },
        error: function(xhr, status, error){
            console.log(error);
        },
        complete: function() {
        }
    });
}

// Funktion för api-anrop
function makeHttpRequest(method, url, data = null) {
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open(method, url, true);

        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(xhr.responseText);
            } else {
                reject(xhr.statusText + " " + xhr.responseText);
            }
        };

        xhr.onerror = function() {
            reject(xhr.statusText);
        };

        if (data) {
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.send(JSON.stringify(data));
        } else {
            xhr.send();
        }
    });
}

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