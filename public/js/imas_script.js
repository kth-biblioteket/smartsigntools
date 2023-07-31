$(document).ready(function() {

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
        $.ajax({
            cache: false,
            url: '/smartsigntools/api/v1/imas/realtime',
            success: function(response){
                showVisitors(response, '#gaugeNG', 'Norra Galleriet', 'North gallery', 50, 'gauge-header-medium');
                showVisitors(response, '#gaugeHB', 'Hela Biblioteket', 'KTH Library', 200, 'gauge-header-large');
                showVisitors(response, '#gaugeANGDOMEN', 'Ångdomen', 'Ångdomen', 40, 'gauge-header-medium');
                showVisitors(response, '#gaugeSG', 'Södra Galleriet', 'South gallery', 20, 'gauge-header-medium');
                showVisitors(response, '#gaugeSOG', 'Sydöstra Galleriet', 'Southeast gallery', 30, 'gauge-header-medium');
                showVisitors(response, '#gaugeOM', 'Newton', 'Newton', 15, 'gauge-header-medium');
            },
            
            error: function(err){
                showVisitors(null, '#gaugeNG', 'Norra Galleriet', 'North gallery', 50, 'gauge-header-medium');
                showVisitors(null, '#gaugeHB', 'Hela Biblioteket', 'KTH Library', 200, 'gauge-header-large');
                showVisitors(null, '#gaugeANGDOMEN', 'Ångdomen', 'Ångdomen', 40, 'gauge-header-medium');
                showVisitors(null, '#gaugeSG', 'Södra Galleriet', 'South gallery', 20, 'gauge-header-medium');
                showVisitors(null, '#gaugeSOG', 'Sydöstra Galleriet', 'Southeast gallery', 30, 'gauge-header-medium');
                showVisitors(null, '#gaugeOM', 'Newton', 'Newton', 15, 'gauge-header-medium');
            },
            complete: function() {
            }
             
        });
    }

    /**
     * Funktion som visar beläggning mha mätare
     * @param {*} response 
     * @param {*} site 
     * @param {*} sitename 
     * @param {*} room 
     * @param {*} maxoccupancy 
     * @param {*} gaugeclass 
     */
    function showVisitors(response, site, sitename, room, maxoccupancy, gaugeclass) {
        if(response.location == "closed" ) {
            response.zones = {}
            response.zones.length = 0
        } 
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
                $(site + 'header').html('<div class="'+ gaugeclass + '">'+ room + '</div>');
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
        getVisitors();
      }
      catch(error) {
        console.log(error);
      }
});