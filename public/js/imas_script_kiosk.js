$(document).ready(function() {

    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    let lang = 'en';
    if(urlParams.get('lang')) {
        lang = urlParams.get('lang')
    }
    document.querySelector('html').setAttribute("lang", lang);

    function getUrlVars() {
        var vars = {};
        var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
            vars[key] = value;
        });
        return vars;
    }

    var urlparameters = getUrlVars();
    if (urlparameters.debug=='true') {
        $('.App-footer').html('<div>Debug mode</div>');
        $('.App').css('border','1px solid');
    }

    var defs = {
        value: 0,
        customSectors: {
            percents: true,
            ranges: [{
              color : "rgb(54, 165, 54)",
              lo : 0,
              hi : 74
            },{
              color : "rgb(236, 236, 56)",
              lo : 75,
              hi : 94
            },{
                color : "rgb(226, 70, 70)",
                lo : 95,
                hi : 100
            }]
        },
        pointer: true,
        pointerOptions: {
            toplength: 0,
            bottomlength: 10,
            bottomwidth: 6,
            stroke: 'none',
            stroke_width: 0,
            stroke_linecap: 'square',
            color: '#000000'
        },
        //gaugeWidthScale: 0.6,
        relativeGaugeSize: true,
        //width: 300,
        //height: 150,
        symbol: "%",
        //title: "",
        //label: "Occupancy",
        valueMinFontSize: 28,
        labelMinFontSize: 14,
        minLabelMinFontSize: 14, 
        maxLabelMinFontSize: 14,
        startAnimationTime: 0,
        refreshAnimationTime: 0

    };

    function addZero(i) {
        if (i < 10) {
            i = "0" + i;
        }
        return i;
    }

    function gettodaysdate() {
        var today = new Date();
        var dd = addZero(today.getDate());
        var mm = addZero(today.getMonth()+1); //January is 0!
        var yyyy = today.getFullYear();
        var todaysdate = yyyy + '' + mm + '' + dd;
        return todaysdate;
    }

    function getcurrenttime() {
        var today = new Date(),
            h = addZero(today.getHours()),
            m = addZero(today.getMinutes()),
            s = addZero(today.getSeconds());
            
        return h + ":" + m;
    }

    /*
    function logerror(error) {
        $.ajax({
            url: 'logerror.php?error=' + error,
            success: function(response){
                console.log("success " + error)
            },
            error: function(err){
                console.log("err")
            },
            complete: function() {
            }
        });
    }
    */
    /**
     * 
     * Funktion som anropar TimeEdits Api
     * och hämtar ångdomens bokningar(objects=417156.4)
     *
     */
    function getEvents() {
        var todaysdate = gettodaysdate();
        var busy = false;
        $.ajax({
            url: '/webservices/timeedit/?todaysdate=' + todaysdate + '&objects=417156.4',
            success: function(response){
                if(response.reservations.length > 0) {
                    for(var i = 0; i < response.reservations.length; i++) {
                        var currentdate = new Date();
                        var eventenddate = new Date();
                        var eventstartdate = new Date();
                        eventenddate.setHours(response.reservations[i].endtime.substr(0,2),response.reservations[i].endtime.substr(3,2),0);
                        eventstartdate.setHours(response.reservations[i].starttime.substr(0,2),response.reservations[i].starttime.substr(3,2),0);
                        if (eventstartdate < currentdate && eventenddate > currentdate) {
                            busy = true;
                            //om bokningen i TimeEdit har "tillgänlig.." som kommentar så är lokalen ändå öppen.
                            for(var colcount = 0; colcount < response.reservations[i].columns.length; colcount++) {
                                //console.log(response.reservations[i].columns[colcount].indexOf("Tillgänglig som studieplats"))
                                if(response.reservations[i].columns[colcount].indexOf("Tillgänglig som studieplats") != -1){
                                    busy = false;
                                    break;
                                }
                            }
                            if (busy) {
                                occupancyrate = 100;
                                var justgaugeANGDOMEN = new JustGage({
                                    id: "justgaugeANGDOMEN",
                                    defaults: defs,
                                    textRenderer: function (val) {
                                        return ('Busy');
                                    },                       
                                });
                                $('#justgaugeANGDOMEN svg').removeAttr("width")
                                $('#justgaugeANGDOMEN svg').removeAttr("height")
                                justgaugeANGDOMEN.refresh(occupancyrate);
                                $('#gaugeANGDOMENheader').html('<div class="content-header">Ångdomen</div>');
                                $('#ANGDOMENinfo').html('<div style="text-align: center"><h6>' + response.reservations[i].starttime.substr(0,5) + ' - ' + response.reservations[i].endtime.substr(0,5) + '</h6></div><div style="text-align: center"><h6>' + response.reservations[i].columns[0] + '</h6></div>');
                            }
                            break;
                        }
                    }; 
                }
                if(!busy) {
                    getVisitors('#gaugeANGDOMEN','Ångdomen', 'angdomen', 60);
                }
            },
            
            error: function(err){
            },
            complete: function() {
            }
             
        });
    }

    /**
     * 
     * Funktion som anropar Imas Api
     * 
     * @param {*} site 
     * @param {*} siteid 
     * @param {*} availableseats 
     * @param {*} sitename 
     */
    function getVisitors() {
        var currenttimestamp = Math.floor(Date.now() /1000);
        //currenttimestamp = 1521299582;
        var html = '';
        $.ajax({
            cache: false,
            url: 'https://apps.lib.kth.se/imas/imas.json',
            /*{"ContentEncoding":null,
            "ContentType":null,
            "Data":{
                "Location":0,
                "Zones":[
                    {"Zone":"Hela Biblioteket","Inside":0},
                    {"Zone":"Sydöstra Galleriet","Inside":0},
                    {"Zone":"Öppet Magasin","Inside":4},
                    {"Zone":"Norra Galleriet","Inside":0},
                    {"Zone":"Ångdomen","Inside":2},
                    {"Zone":"Södra Galleriet","Inside":0}
                ]},
            "JsonRequestBehavior":0,
            "MaxJsonLength":null,
            "RecursionLimit":null}
            */
            success: function(response){
                showVisitors(response, '#gaugeHB', 'Hela Biblioteket', 'Hela biblioteket', 'KTH Library', 200, 'gauge-header-large');
                showVisitors(response, '#gaugeNG', 'Norra Galleriet', 'Norra galleriet', 'North Gallery', 50, 'gauge-header-medium');
                showVisitors(response, '#gaugeANGDOMEN', 'Ångdomen', 'Ångdomen', 'Ångdomen', 40, 'gauge-header-medium');
                showVisitors(response, '#gaugeSG', 'Södra Galleriet', 'Södra galleriet', 'South Gallery', 20, 'gauge-header-medium');
                showVisitors(response, '#gaugeSOG', 'Sydöstra Galleriet', 'Sydöstra galleriet', 'Southeast Gallery', 30, 'gauge-header-medium');
                showVisitors(response, '#gaugeOM', 'Newton', 'Newton', 'Open Stacks', 15, 'gauge-header-medium');
                /*
                showVisitors(response, '#gaugeNG', 'Norra Galleriet', 'North gallery', 50, 'gauge-header-medium');
                showVisitors(response, '#gaugeHB', 'Hela Biblioteket', 'KTH Library', 200, 'gauge-header-large');
                showVisitors(response, '#gaugeANGDOMEN', 'Ångdomen', 'Ångdomen', 40, 'gauge-header-medium');
                showVisitors(response, '#gaugeSG', 'Södra Galleriet', 'South gallery', 20, 'gauge-header-medium');
                showVisitors(response, '#gaugeSOG', 'Sydöstra Galleriet', 'Southeast gallery', 30, 'gauge-header-medium');
                showVisitors(response, '#gaugeOM', 'Newton', 'Newton', 15, 'gauge-header-medium');
                */
            },
            
            error: function(){
            },
            complete: function() {
            }
             
        });
    }

    /**
     * 
     * Funktion som anropar Imas Api
     * 
     * @param {*} site 
     * @param {*} siteid 
     * @param {*} availableseats 
     * @param {*} sitename 
     */
    function showVisitors(response, site, sitename, sitename_sv, sitename_en, room, maxoccupancy, gaugeclass) {
        var sitenameheader
        if ($('html').attr('lang').indexOf('en')!= -1) {
            sitenameheader = sitename_en
        } else {
            sitenameheader = sitename_sv
        }
        var currenttimestamp = Math.floor(Date.now() /1000);
        if(response.location == "closed" ) {
            //$('.wrapper').html('<div>The Library is closed</div>');
            //$('.App-content').html('<div>Biblioteket är stängt</div>');
            //response == null
            response.zones = {}
            response.zones.length = 0
        } 
        //currenttimestamp = 1521299582;
        var html = '';
        if(!response) {
            $(site + 'header').html('<div class="content-header">Information unavailable</div>');
        } else {
            html = '';
            var occupancyrate = 0;
            var availablerate = 0;
            var circlecolor = 'green';
            var over50 = '';
            var currentInside = null;
            var currentThreshold = null;
            for (var i = 0; i < response.zones.length; i++) {
                if (response.zones[i].name == sitename) {
                    currentInside = response.zones[i].inside
                    currentThreshold = response.zones[i].threshold
                }
            }
              
            if(currentInside<=0) {
                occupancyrate = 0;

            } else {
                occupancyrate = Math.round(100*currentInside/currentThreshold);
            }
            
            if (occupancyrate > 100) {
                occupancyrate = 100
            }
            //Ändra färg beroende på beläggning
            if(occupancyrate>50 && occupancyrate<85) {
                circlecolor = 'orange';
                over50 = 'over50'
            }
            if(occupancyrate>85) {
                circlecolor = 'red';
                over50 = 'over50'
            }

            $(site + ' .gauge-arrow').trigger('updateGauge', occupancyrate);
            $(site + 'header').html('<div class="'+ gaugeclass + '">'+ sitenameheader + '</div>');
            if (site === "#gaugeHB") {
                if (1==2) {
                    occupancyrate = 100;
                    $('#justgaugeHB').html('<div><h2>Closed</h2></div>');
                } else {
                    var justgaugeHB = new JustGage({
                        id: "justgaugeHB",
                        defaults: defs                      
                    });
                    justgaugeHB.refresh(occupancyrate);
                }
            }
            if (site === "#gaugeNG") {
                if (1==2) {
                    occupancyrate = 100;
                    $('#justgaugeNG').html('<div><h2>Closed</h2></div>');
                } else {
                    var justgaugeNG = new JustGage({
                        id: "justgaugeNG",
                        defaults: defs                        
                    });
                    justgaugeNG.refresh(occupancyrate);
                }
            }
            if (site === "#gaugeANGDOMEN") {
                if (1==2) {
                    occupancyrate = 100;
                    $('#justgaugeANGDOMEN').html('<div><h2>Closed</h2></div>');
                } else {
                    var justgaugeANGDOMEN = new JustGage({
                        id: "justgaugeANGDOMEN",
                        defaults: defs                        
                    });
                    justgaugeANGDOMEN.refresh(occupancyrate);
                }
            }
            if (site === "#gaugeSG") {
                if (1==2) {
                    occupancyrate = 100;
                    $('#justgaugeSG').html('<div><h2>Closed</h2></div>');
                } else {
                    var justgaugeSG = new JustGage({
                        id: "justgaugeSG",
                        defaults: defs                        
                    });
                    justgaugeSG.refresh(occupancyrate);
                }
            }
            if (site === "#gaugeSOG") {
                if (1==2) {
                    occupancyrate = 100;
                    $('#justgaugeSOG').html('<div><h2>Closed</h2></div>');
                } else {
                    var justgaugeSOG = new JustGage({
                        id: "justgaugeSOG",
                        defaults: defs                        
                    });
                    justgaugeSOG.refresh(occupancyrate);
                }
            }
            if (site === "#gaugeOM") {
                if (1==2) {
                    occupancyrate = 100;
                    $('#justgaugeOM').html('<div><h2>Closed</h2></div>');
                } else {
                    var justgaugeOM = new JustGage({
                        id: "justgaugeOM",
                        defaults: defs                        
                    });
                    justgaugeOM.refresh(occupancyrate);
                }
            }
        }
            
    }
    
    try {
        //Ångdomen!
        //getEvents()

        getVisitors();
        
      }
      catch(error) {
        console.log(error);
      }
});