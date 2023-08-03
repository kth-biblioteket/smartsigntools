$(document).ready(function () {

    function getUrlVars() {
        var vars = {};
        var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function (m, key, value) {
            vars[key] = value;
        });
        return vars;
    }

    var urlparameters = getUrlVars();
    lang = urlparameters.lang || 'sv';

    if (urlparameters.debug == 'true') {
        $('.App-footer').html('<div>Debug mode</div>');
        $('.App').css('border', '1px solid');
    }

    function addZero(i) {
        if (i < 10) {
            i = "0" + i;
        }
        return i;
    }

    function gettodaysdate() {
        var today = new Date();
        var dd = addZero(today.getDate());
        var mm = addZero(today.getMonth() + 1); //January is 0!
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
        var html = '';
        $.ajax({
            cache: false,
            url: `https://apps.lib.kth.se/smartsigntools/api/v1/imas/realtime`,
            success: function (response) {
                showVisitors(response, 'gaugeHB', 'Hela Biblioteket', 'Hela biblioteket', 'KTH Library', 200, 'gauge-header-large');
                showVisitors(response, 'gaugeNG', 'Norra Galleriet', 'Norra galleriet', 'North Gallery', 50, 'gauge-header-medium');
                showVisitors(response, 'gaugeANGDOMEN', 'Ångdomen', 'Ångdomen', 'Ångdomen', 40, 'gauge-header-medium');
                showVisitors(response, 'gaugeSG', 'Södra Galleriet', 'Södra galleriet', 'South Gallery', 20, 'gauge-header-medium');
                showVisitors(response, 'gaugeSOG', 'Sydöstra Galleriet', 'Sydöstra galleriet', 'South-East Gallery', 30, 'gauge-header-medium');
                showVisitors(response, 'gaugeOM', 'Newton', 'Newton', 'Newton', 15, 'gauge-header-medium');
            },

            error: function () {
                showVisitors(null, 'gaugeHB', 'Hela Biblioteket', 'Hela biblioteket', 'KTH Library', 200, 'gauge-header-large');
                showVisitors(null, 'gaugeNG', 'Norra Galleriet', 'Norra galleriet', 'North Gallery', 50, 'gauge-header-medium');
                showVisitors(null, 'gaugeANGDOMEN', 'Ångdomen', 'Ångdomen', 'Ångdomen', 40, 'gauge-header-medium');
                showVisitors(null, 'gaugeSG', 'Södra Galleriet', 'Södra galleriet', 'South Gallery', 20, 'gauge-header-medium');
                showVisitors(null, 'gaugeSOG', 'Sydöstra Galleriet', 'Sydöstra galleriet', 'South-East Gallery', 30, 'gauge-header-medium');
                showVisitors(null, 'gaugeOM', 'Newton', 'Newton', 'Newton', 15, 'gauge-header-medium');
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
    function showVisitors(response, site, sitename, sitename_sv, sitename_en, maxoccupancy, gaugeclass) {
        var sitenameheader
        if (response.location == "closed") {
            response.zones = {}
            response.zones.length = 0
        }
        if ($('html').attr('lang').indexOf('en') != -1) {
            sitenameheader = sitename_en
        } else {
            sitenameheader = sitename_sv
        }
        if ($('#just' + site).length == 0) {
            //do nothing
        } else {
            $('#just' + site).html('');
            var urlparameters = getUrlVars();
            if (urlparameters.debug == 'true') {
                $('.App-footer').html('<div>Debug mode</div>');
                $('.App').css('border', '1px solid');
            }

            var defs = {
                value: 0,
                customSectors: {
                    percents: true,
                    ranges: [{
                        color: "rgb(54, 165, 54)",
                        lo: 0,
                        hi: 74
                    }, {
                        color: "rgb(236, 236, 56)",
                        lo: 75,
                        hi: 94
                    }, {
                        color: "rgb(226, 70, 70)",
                        lo: 95,
                        hi: 100
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
            var html = '';
            if (!response) {
                $("#" + site + 'header').html('<div class="content-header">Information unavailable</div>');
                $('#just' + site).html('<div class="content-header">Information unavailable</div>');
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

                if (currentInside <= 0) {
                    occupancyrate = 0;

                } else {
                    occupancyrate = Math.round(100 * currentInside / currentThreshold);
                }

                if (occupancyrate > 100) {
                    occupancyrate = 100
                }
                //Ändra färg beroende på beläggning
                if (occupancyrate > 50 && occupancyrate < 85) {
                    circlecolor = 'orange';
                    over50 = 'over50'
                }
                if (occupancyrate > 85) {
                    circlecolor = 'red';
                    over50 = 'over50'
                }

                $("#" + site + ' .gauge-arrow').trigger('updateGauge', occupancyrate);
                $("#" + site + 'header').html('<div class="'+ gaugeclass + '">'+ sitenameheader + '</div>');
                var gauge = new JustGage({
                    id: "just" + site,
                    defaults: defs
                });
                gauge.refresh(occupancyrate);
            }

        }

        try {
            getVisitors();
        }
        catch (error) {
            console.log(error);
        }
    }
});