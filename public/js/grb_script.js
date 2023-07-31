$(document).ready(function() {
    var counter = 10;
    function addZero(i) {
        if (i < 10) {
            i = "0" + i;
        }
        return i;
    }
    
    /**
     * 
     * Funktion som anropar MRBS Api
     * 
     */
    function getroomAvailability(area_id){
        //Hämta aktuell och nästa timme
        var d = new Date();
        var currenthour = addZero(d.getHours());
        d.setHours(d.getHours() + 1 );
        var nextthour = addZero(d.getHours());
        //uppdatera html
        $("#App-content").html('<div>Status (' + currenthour + '.00 - ' + nextthour + '.00)</div>');
        //$("#App-content").html('<h4>Lässtudio / Reading Studio</h4>');
        var currenttimestamp = Math.floor(Date.now() /1000);
        var nexthourtimestamp = currenttimestamp + 3600;
        //currenttimestamp = 1521299582;
        var html = '';
        $.ajax({
            url: 'https://api.lib.kth.se/bookingsystem/v1/roomsavailability/grouprooms/1/' + currenttimestamp ,
            /*
            success: function(){
            },
            error: function(){
            },
            complete: function() {
          
            }
            */
        });
        //hämta ny data efter x millisekunder
        //setTimeout(function(){ getroomAvailability(area_id) }, 5000);
    }

    //Hämta rumstatus för aktuell timme och area
    getroomAvailability(1);
    //getroomAvailability(4);
});

/**
 * 
 * Funktion för att hantera fel
 * 
 */
$(document).ajaxError(function (event, jqxhr, settings) {
    if (settings.url.indexOf("roomsavailability") != -1) {
    }
});

/**
 * 
 * Funktion som hanterar svaret från MRBS Api
 * 
 */
$(document).ajaxSuccess(function (event, jqxhr, settings) {  
    //Grupprum 
    //if (settings.url.indexOf("area_id=1") != -1) {
        console.log(jqxhr)
        var roomsfiltered = jqxhr.responseJSON.filter(function(room) {
            
            return room.disabled !== 1
        });
        console.log(roomsfiltered)
        //Lägg rummen i 3 kolumner
        html = '<div style="float:left;width:33.33%">'; //Första kolumnen
        //Hur många rader ska varje kolumn innehålla
        rows = Math.ceil((roomsfiltered.length)/3);
        i = 0;
        roomsfiltered.forEach(function(element) {
            console.log(element)
            if(element.status == 'free'){
                colorclass = "white"
            }
            if(element.status == 'tentative'){
                colorclass = "yellow"
            }
            if(element.status == 'tobeconfirmed'){
                colorclass = "orange"
            }
            if(element.status == 'confirmed'){
                colorclass = "red"
            }
            if(element.status == 'unavailable'){
                colorclass = "grey"
            }
            if(i==rows) {
                //Nästa kolumn
                html += '</div><div style="float:left;width:33.33%">'
                i=0;
            }
            i++;
            html += '<div class="' + colorclass +' Smartsign-item flex-container"><div>'  + element.room_name + '</div></div>';
        }); 
        html += '</div>';
        //uppdatera html
        $("#grouprooms").html(html);
    //}
    //Lässtudio
    if (settings.url.indexOf("area_id=4") != -1) {
        html = '';
        jqxhr.responseJSON.forEach(function(element) {
            if(element.status == 'free'){
                colorclass = "green"
            }
            if(element.status == 'tentative'){
                colorclass = "yellow"
            }
            if(element.status == 'tobeconfirmed'){
                colorclass = "orange"
            }
            if(element.status == 'confirmed'){
                colorclass = "red"
            }
            if(element.status == 'unavailable'){
                colorclass = "grey"
            }
            
            html += '<div class="' + colorclass +' Smartsign-item flex-container"><div>' + element.room_name + '</div></div>';
        });
        //uppdatera html
        $("#readingstudios").html(html);
    }
});