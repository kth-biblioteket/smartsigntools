require('dotenv').config()

const eventModel = require('./eventModels');

const Parser = require('rss-parser');
const axios = require('axios')
const cheerio = require('cheerio');
const fs = require("fs");
const path = require('path');
const puppeteer = require('puppeteer');
const QRCode = require("qrcode");
const sharp = require("sharp");
const ews = require('ews-javascript-api');


// Funktion som visar som genererar ett 
// admingränssnitt med alla Kalenderhändelser
async function readEventsPaginated(req, res, next) {
    
    let data = []
    let eventsarray = []
    let feed
    let feed_sv
    let parser = new Parser();
    let events
    let eventsbydate
    let imagebank
    let colors
    let page = 1
    let size = 10

    if (req.query.page) {
        page = req.query.page;
    } 

    if (req.query.size) {
        size = req.query.size;
    }

    try{
        imagebank = await eventModel.readImages()
        data.imagebank = imagebank
    } catch(err) {
        res.send("error: " + err.message)
    }

    try{
        colors = await eventModel.readColors()
        data.colors = colors
    } catch(err) {
        res.send("error: " + err.message)
    }

    try{
        linepatterns = await eventModel.readLinePatterns()
        data.linepatterns = linepatterns
    } catch(err) {
        res.send("error: " + err.message)
    }

    try{
        linepatternplacements = await eventModel.readLinePatternPlacements()
        data.linepatternplacements = linepatternplacements
    } catch(err) {
        res.send("error: " + err.message)
    }

    try {
        feed = await parser.parseURL(process.env.RSSFEED);
        data.feed = feed
    } catch (err) {
        console.log("getAdminGui: " + err.message)
        res.send("error: " + err.message)
    } 

    //Kalendern på svenska
    try {
        feed_sv = await parser.parseURL(process.env.RSSFEED_SV);
        data.feed_sv = feed_sv
    } catch (err) {
        console.log("getAdminGui: " + err.message)
        res.send("error: " + err.message)
    }   
    
    //Läs in alla events
    try {
        events = await readEvents()
    } catch(err) {
        res.send("error: " + err.message)
    }

    //läs in alla events med datum större än nu
    try {
        eventsbydate = await readEventsByDate(new Date())
    } catch(err) {
        res.send("error: " + err.message)
    }

    data.pagination = {
        "page": page,
        "size": size,
        "total": eventsbydate.length
    }

    let contentid = ""
    try {
        for (const item of feed.items) {

            eventtime = substrInBetween(item.contentSnippet, "Time: ", "\nLocation:")
            if (typeof eventtime === 'undefined') {
                eventtime = substrInBetween(item.contentSnippet, "Time: ", "\nType of event:")
            }
            eventtime = eventtime.substr(4, 10) + eventtime.substr(15, 6).replace('.', ':')

            //Behandla bara de event med senare datum än dagens
            if (new Date(eventtime) > new Date()) {
                //finns event?
                contentid = '1.' + item.guid.split('-1.')[1]
                let event = events.filter(event => event.contentid == contentid)
                
                if (!event || event.length == 0) {
                    //Skapa event om det inte existerar
                    let createevent = await createEvent(item.guid, contentid, eventtime, eventtime, eventtime, process.env.SMARTSIGNLINK, 0)
                } else {
                    //uppdatera eventuellt ändrad guid(ny url)
                    if(event[0].guid != item.guid) {
                        let updateguid = await updateEvent(event[0].id, item.guid, event[0].contentid, event[0].eventtime, event[0].eventtime, event[0].eventtime, event[0].smartsignlink, event[0].published, event[0].published_as_image, event[0].lang)
                    }
                    //uppdatera eventuellt ändrad eventtime
                    if(new Date(event[0].eventtime) < new Date(eventtime) || new Date(event[0].eventtime) > new Date(eventtime)) {
                        let updateeventtime = await updateEvent(event[0].id, item.guid, event[0].contentid, eventtime, eventtime, eventtime, event[0].smartsignlink, event[0].published, event[0].published_as_image, event[0].lang)
                    }
                }
            }

        } 

        //Hämta paginerade events
        events = await eventModel.readEventsPaginated(page, size)
        let feeditem
        let feeditem_sv
        for(i = 0 ; i < events.length ; i++) {
            feeditem = feed.items.filter(item => '1.' + item.guid.split('-1.')[1] == events[i].contentid)
            feeditem_sv = feed_sv.items.filter(item => '1.' + item.guid.split('-1.')[1] == events[i].contentid)
            //existerar eventet i kalendern?
            if(feeditem.length > 0) {
                eventsarray[i] = {}
                eventsarray[i].feeditem = feeditem[0]
                eventsarray[i].feeditem_sv = feeditem_sv[0]
                eventsarray[i].event = events[i];
                eventsarray[i].eventfields = await eventModel.readEventFields(events[i].id)
                eventsarray[i].eventimage = await eventModel.readEventImage(events[i].id)
                eventsarray[i].eventbgcolor = await eventModel.readEventBgColor(events[i].id)
                eventsarray[i].eventtextcolor = await eventModel.readEventTextColor(events[i].id)
                eventsarray[i].eventlogocolor = await eventModel.readEventLogoColor(events[i].id)
                eventsarray[i].eventimageoverlay = await eventModel.readEventImageOverlay(events[i].id)
                eventsarray[i].eventimageoverlayopacity = await eventModel.readEventImageOverlayOpacity(events[i].id)
                eventsarray[i].eventimageheader = await eventModel.readEventImageHeader(events[i].id)
                eventsarray[i].eventfieldsorder = await eventModel.readEventFieldsOrder(events[i].id)
                eventsarray[i].eventlinepattern = await eventModel.readEventLinePattern(events[i].id)
                eventsarray[i].eventlinepatternplacement = await eventModel.readEventLinePatternPlacement(events[i].id)
                eventsarray[i].eventlinepatterncolor = await eventModel.readEventLinePatternColor(events[i].id)
            }
        }
        //filtrera bort tomma poster
        data.events = eventsarray.filter((a) => a);
        admindata = {
            "url": req.protocol + '://' + req.get('host') + req.originalUrl,
            "pagination": data.pagination,
            "imagebank":  data.imagebank,
            "events": data.events,
            "feed": data.feed,
            "feed_sv": data.feed_sv,
            "smartsignlink": process.env.SMARTSIGNLINK,
            "colors": data.colors,
            "linepatterns": data.linepatterns,
            "linepatternplacements": data.linepatternplacements
        }
        res.render('admin', admindata);

    } catch(err) {
        res.send("error: " + err.message)
    }
    
}

async function login(req, res) {
    try {
        const response = await axios.post('http://' + process.env.LDAP_API_URL + 'login', req.body)
        res
        .cookie("jwt", response.data.token, {
            maxAge: 60 * 60 * 24 * 7 * 1000,
            sameSite: 'lax',
            httpOnly: true,
            secure: process.env.NODE_ENV !== "development",
        })
        .status(200)
        .json({ message: "Success" });
    } catch(err) {
        res.status(401)
        res.json({ message: "Error" });
    }
}

async function logout(req, res) {
    res
    .clearCookie("jwt")
    .status(200)
    .json({ message: "Success" });
}

async function slideshow(req, res) {
    try {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write(`
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
                <title>KTH Library Calendar</title>
                <link rel="shortcut icon" href="favicon.ico">
                <link rel="stylesheet" href="https://apps.lib.kth.se/smartsign/css/bootstrap.min.css">
                <link rel="stylesheet" href="https://apps.lib.kth.se/smartsign/css/smartsign.css?ver=1.10">
                <link rel="stylesheet" type="text/css" href="//fonts.googleapis.com/css?family=Open+Sans">
            </head>
            <style>
                body {
                    height: 1900px;
                    width: 1080px;
                    overflow: hidden;
                }
                .mySlides {display:none;}
                .fadeinKTHB
                {
                    animation: fadeInAnimation ease 3s;
                    animation-iteration-count: 1;
                    animation-fill-mode: forwards;
                }
                
                @keyframes fadeInAnimation {
                    0% {
                        opacity: 0;
                    }
                    100% {
                        opacity: 1;
                    }
                }
            </style>
            <body>
                <div id="slides">`)

        //Läs in alla sidor som är publicerade som html i publishedevents     
        const filenames = fs.readdirSync(path.join(__dirname, "/publishedevents/html"))
        let htmlfiles = filenames.filter( file => file.match(new RegExp(`.*\.(html)`, 'ig')));
        htmlfiles.forEach(file => {
            const content = fs.readFileSync(path.join(__dirname, "/publishedevents/html/" + file))
            res.write('<div class="mySlides fadeinKTHB" style="display: block;">')
            res.write('<div class="App" style="position:relative">')
            res.write(content.toString());
            res.write('</div>')
            res.write('</div>');
        });
        res.write(`
                </div>
                <script>
                var slideIndex = 0;
                carousel();

                function carousel() {
                var i;
                var x = document.getElementsByClassName("mySlides");
                for (i = 0; i < x.length; i++) {
                    x[i].style.display = "none"; 
                }
                slideIndex++;
                if (slideIndex > x.length) {slideIndex = 1} 
                x[slideIndex-1].style.display = "block"; 
                setTimeout(carousel, 10000); 
                }
                </script>
            </body>
            </html>`)
        res.end();
    }
    catch (err) {
        console.log(err)
    }
}

async function slideshowimages(req, res) {
    try {
        res.writeHead(200, { 'Content-Type': 'text/html' });

        res.write(`
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
                <title>KTH Library Calendar</title>
                <link rel="shortcut icon" href="favicon.ico">
                <link rel="stylesheet" href="https://apps.lib.kth.se/smartsign/css/bootstrap.min.css">
                <link rel="stylesheet" href="https://apps.lib.kth.se/smartsign/css/smartsign.css?ver=1.10">
                <link rel="stylesheet" type="text/css" href="//fonts.googleapis.com/css?family=Open+Sans">
            </head>
            <style>
                body {
                    height: 1920px;
                    width: 1080px;
                    overflow: hidden;
                    margin: 0;
                }
                .mySlides {display:none;}
                .fadeinKTHB
                {
                    animation: fadeInAnimation ease 3s;
                    animation-iteration-count: 1;
                    animation-fill-mode: forwards;
                }
                
                @keyframes fadeInAnimation {
                    0% {
                        opacity: 0;
                    }
                    100% {
                        opacity: 1;
                    }
                }
            </style>
            <body>
                <div id="slides">`)
        //Läs in alla sidor som är publicerade som bilder(jpg's) i publishedevents     
        const filenames = fs.readdirSync(path.join(__dirname, "/publishedevents/images"))
        let jpgfiles = filenames.filter( file => file.match(new RegExp(`.*\.(jpg)`, 'ig')));
        jpgfiles.forEach(file => {

            const content = fs.readFileSync(path.join(__dirname, "/publishedevents/images/" + file))
            res.write('<div class="mySlides fadeinKTHB" style="display: block;"><img src="data:image/jpeg;base64,')
            res.write(Buffer.from(content).toString('base64'));
            res.write('"/></div>');
        });
        res.write(`
                </div>
                <script>
                var slideIndex = 0;
                carousel();

                function carousel() {
                var i;
                var x = document.getElementsByClassName("mySlides");
                for (i = 0; i < x.length; i++) {
                    x[i].style.display = "none"; 
                }
                slideIndex++;
                if (slideIndex > x.length) {slideIndex = 1} 
                x[slideIndex-1].style.display = "block"; 
                setTimeout(carousel, 10000); 
                }
                </script>
            </body>
            </html>`)
        res.end();
    }
    catch (err) {
        console.log(err)
    }
}

async function readAllPublished() {
    try {
        result = await eventModel.readAllPublished()
        return result;
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function readEvents() {
    try {
        let result = await eventModel.readEvents()
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function readEventsByDate(eventtime) {
    try {
        let result = await eventModel.readEventsByDate(eventtime)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function readEventGuid(guid) {
    try {
        let result = await eventModel.readEventGuid(guid)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function readEventContentid(contentid) {
    try {
        let result = await eventModel.readEventContentid(contentid)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function readEventId(id) {
    try {
        let result = await eventModel.readEventId(id)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function createEvent(guid, contentid, eventtime, pubstarttime = "none", pubendtime = "none", smartsignlink = "none", published = 0, published_as_image = 0,lang='en') {
    try {
        let result = await eventModel.createEvent(guid, contentid, eventtime, pubstarttime, pubendtime, smartsignlink, published, published_as_image, lang)
        return result
    } catch (err) {
        return "error: " + err.message
    }
}

async function updateEvent(id, guid, contentid, eventtime, pubstarttime = "none", pubendtime = "none", smartsignlink = "none", published = 0, published_as_image = 0, lang='en') {
    try {
        let result = eventModel.updateEvent(guid, contentid, eventtime, pubstarttime, pubendtime, smartsignlink, published, published_as_image, lang, id)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function deleteEvent(id) {
    try {
        let result = await eventModel.deleteEvent(id)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function updateEventLang(req, res) {
    try {
        let result = eventModel.updateEventLang(req.body.lang, req.params.id)
        res.send(result)
    } catch (err) {
        res.send("error: " + err.message)
    }
}

async function updateEventPublish(id, published) {
    try {
        let result = eventModel.updateEventPublish(id, published)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function readEventFields(events_id) {
    try {
        let result = await eventModel.readEventFields(events_id)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function createEventField(event_id, field_id) {
    try {
        let result = await eventModel.createEventField(event_id, field_id)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function deleteEventField(event_id, field_id) {
    try {
        let result = await eventModel.deleteEventField(event_id, field_id)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function readEventBgColor(event_id) {
    try {
        let result = await eventModel.readEventBgColor(event_id)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function createEventBgColor(event_id, color_id) {
    try {
        let result = await eventModel.deleteEventBgColor(event_id)
        result = await eventModel.createEventBgColor(event_id, color_id)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function deleteEventBgColor(event_id) {
    try {
        let result = await eventModel.deleteEventBgColor(event_id)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function readEventTextColor(event_id) {
    try {
        let result = await eventModel.readEventTextColor(event_id)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function createEventTextColor(event_id, color_id) {
    try {
        let result = await eventModel.deleteEventTextColor(event_id)
        result = await eventModel.createEventTextColor(event_id, color_id)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function deleteEventTextColor(event_id) {
    try {
        let result = await eventModel.deleteEventTextColor(event_id)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function readEventLogoColor(event_id) {
    try {
        let result = await eventModel.readEventLogoColor(event_id)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function createEventLogoColor(event_id, color_id) {
    try {
        let result = await eventModel.deleteEventLogoColor(event_id)
        result = await eventModel.createEventLogoColor(event_id, color_id)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function deleteEventLogoColor(event_id) {
    try {
        let result = await eventModel.deleteEventLogoColor(event_id)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function readEventImage(events_id) {
    try {
        let result = await eventModel.readEventImage(events_id)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function createEventImage(event_id, image_id) {
    try {
        let result = await eventModel.deleteEventImage(event_id)
        result = await eventModel.createEventImage(event_id, image_id)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function deleteEventImage(event_id) {
    try {
        let result = await eventModel.deleteEventImage(event_id)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function readEventImageOverlay(event_id) {
    try {
        let result = await eventModel.readEventImageOverlay(event_id)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function createEventImageOverlay(event_id, enabled) {
    try {
        let result = await eventModel.deleteEventImageOverlay(event_id)
        result = await eventModel.createEventImageOverlay(event_id, enabled)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function deleteEventImageOverlay(event_id) {
    try {
        let result = await eventModel.deleteEventImageOverlay(event_id)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function readEventImageOverlayOpacity(event_id) {
    try {
        let result = await eventModel.readEventImageOverlayOpacity(event_id)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function createEventImageOverlayOpacity(event_id, opacity) {
    try {
        let result = await eventModel.deleteEventImageOverlayOpacity(event_id)
        result = await eventModel.createEventImageOverlayOpacity(event_id, opacity)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function deleteEventImageOverlayOpacity(event_id) {
    try {
        let result = await eventModel.deleteEventImageOverlayOpacity(event_id)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function readEventImageHeader(event_id) {
    try {
        let result = await eventModel.readEventImageHeader(event_id)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function createEventImageHeader(event_id) {
    try {
        let result = await eventModel.deleteEventImageHeader(event_id)
        result = await eventModel.createEventImageHeader(event_id)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function deleteEventImageHeader(event_id) {
    try {
        let result = await eventModel.deleteEventImageHeader(event_id)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function readEventFieldsOrder(event_id) {
    try {
        let result = await eventModel.readEventFieldsOrder(event_id)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function createEventFieldsOrder(fieldsOrder) {
    try {
        let result = await eventModel.deleteEventFieldsOrder(fieldsOrder[0].event_id)
        for(let i=0;i<fieldsOrder.length;i++) {
            result = await eventModel.createEventFieldsOrder(fieldsOrder[i].event_id, fieldsOrder[i].field_id, fieldsOrder[i].sortorder)
        }
       
        return "success"
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function deleteEventFieldsOrder(event_id) {
    try {
        let result = await eventModel.deleteEventFieldsOrder(event_id)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function readEventLinePattern(event_id) {
    try {
        let result = await eventModel.readEventLinePattern(event_id)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function createEventLinePattern(event_id, linepattern_id) {
    try {
        let result = await eventModel.deleteEventLinePattern(event_id)
        result = await eventModel.createEventLinePattern(event_id, linepattern_id)
        return "success"
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function deleteEventLinePattern(event_id) {
    try {
        let result = await eventModel.deleteEventLinePattern(event_id)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function readEventLinePatternPlacement(event_id) {
    try {
        let result = await eventModel.readEventLinePattern(event_id)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function createEventLinePatternPlacement(event_id, linepatternplacement_id) {
    try {
        let result = await eventModel.deleteEventLinePatternPlacement(event_id)
        result = await eventModel.createEventLinePatternPlacement(event_id, linepatternplacement_id)
        return "success"
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function deleteEventLinePatternPlacement(event_id) {
    try {
        let result = await eventModel.deleteEventLinePatternPlacement(event_id)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function readEventLinePatternColor(event_id) {
    try {
        let result = await eventModel.readEventLinePatternColor(event_id)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function createEventLinePatternColor(event_id, color_id) {
    try {
        let result = await eventModel.deleteEventLinePatternColor(event_id)
        result = await eventModel.createEventLinePatternColor(event_id, color_id)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function deleteEventLinePatternColor(event_id) {
    try {
        let result = await eventModel.deleteEventLinePatternColor(event_id)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function readImages() {
    try {
        result = await eventModel.readImages()
        return result;
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function readImage(id) {
    try {
        result = await eventModel.readImage(id)
        return result;
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function createImage(fullpath, name, size, type) {
    try {
        let result = await eventModel.createImage(fullpath, name, size, type)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function updateImage(id, name) {
    try {
        let result = await eventModel.updateImage(id, name)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function deleteImage(id) {
    try {
        let image = await eventModel.readImage(id)
        let result = await eventModel.deleteImage(id)
        //Ta bort bildfilen
        fs.unlinkSync(path.join(__dirname, process.env.IMAGEBANKPATH + '/' + image[0].fullpath))
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function readQrcodetracking() {
    try {
        result = await eventModel.readQrcodetracking()
        return result;
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function createQrcodetracking(events_id, url, browser) {
    try {
        let result = await eventModel.createQrcodetracking(events_id, url, browser)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function readAllQrcodetracking() {
    try {
        result = await eventModel.readAllQrcodetracking()
        return result;
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function readQrcodetrackingByTimePeriod(scantime_from, scantime_to) {
    try {
        result = await eventModel.readQrcodetrackingByTimePeriod(scantime_from, scantime_to)
        return result;
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

//Hämta alla generella qrkoder
async function readQrCodesGeneral() {
    try {
        result = await eventModel.readQrCodesGeneral()
        return result;
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

//Hämta en generell qrkod
async function readQrCodeGeneral(id) {
    try {
        let result = await eventModel.readQrCodeGeneral(id)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function createQrCodeGeneral(url) {
    try {
        let created_id = await eventModel.createQrCodeGeneral(url)
        return created_id
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function updateQrCodeGeneral(id, url) {
    try {
        let result = await eventModel.updateQrCodeGeneral(id, url)
        return result
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function deleteQrCodeGeneral(id) {
    try {
        let created_id = await eventModel.deleteQrCodeGeneral(id)
        return created_id
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function generateCalendarPage(req, events_id, html_template = 'templates/smartsign_template_screen.html', format='', orientation='portrait', lang ='sv') {
    const files = fs.readFileSync(path.join(__dirname, html_template));
    const template = cheerio.load(files.toString(), null, true);
    //template('.headertext h4').text("KTH LIBRARY");
    //template('body').css('overflow', 'hidden');
    let eventlinepattern = await eventModel.readEventLinePattern(events_id)
    let eventlinepatternplacement = await eventModel.readEventLinePatternPlacement(events_id)
    if(orientation == 'landscape') {
        template('body').addClass("landscape");
    }

    if (eventlinepattern[0]) {
        if(eventlinepattern[0].code=='1') {
            template('#linepattern svg').addClass("linepattern-one");
        }
        if(eventlinepattern[0].code=='2') {
            template('#linepattern svg').addClass("linepattern-two");
        }
        if(eventlinepattern[0].code=='3') {
            template('#linepattern svg').addClass("linepattern-three");
        }
        if(eventlinepattern[0].code=='4') {
            template('#linepattern svg').addClass("linepattern-four");
        }

        if (eventlinepatternplacement[0]) {
            // Linjemönster vid texten
            if (eventlinepatternplacement[0].code=='br') {
                if (orientation !== 'landscape') {
                    template('#linepattern').addClass("linepattern-bottom-right")
                } else {
                    //vid liggande format så placeras lm i vänstra halvans nedre högra hörn
                    template('#linepattern').addClass("linepattern-left-bottom-right");
                }
            }
            // Linjemönster i bilden
            if (eventlinepatternplacement[0].code=='tl') {
                if (orientation !== 'landscape') {
                    template('#linepattern').addClass("linepattern-top-left")
                } else {
                    //vid liggande format så placeras lm i högra halvans nedre högra hörn
                    template('#linepattern').addClass("linepattern-bottom-right");
                }
            }
        }
    }

    try {
        //Hämta event
        let event = await readEventId(events_id)
        //MySQL kräver index [0]
        event = event[0]
        let eventfields = await readEventFields(event.id)

        let eventbgcolor = await readEventBgColor(event.id)

        let eventtextcolor = await readEventTextColor(event.id)

        let eventlogocolor = await readEventLogoColor(event.id)

        let eventlinepatterncolor = await readEventLinePatternColor(event.id)

        let eventtimageoverlay = await readEventImageOverlay(event.id)

        let eventtimageoverlayopacity = await readEventImageOverlayOpacity(event.id)

        let eventtimageheader = await readEventImageHeader(event.id)

        let imageoverlaycss = ''
        let imageheadercss = ''

        if (eventtimageoverlay[0]) {
            imageoverlaycss = `
            .App-title .titleimage:before {
                content: "";
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 50%;
                background: linear-gradient(to bottom, rgba(0, 0, 0, ${eventtimageoverlayopacity[0]?eventtimageoverlayopacity[0].opacity : 0.5}), rgba(0, 0, 0, 0) 100%, transparent 0%);
                opacity: 1;
                z-index:999;
            }

            .App-title .titleimage:after {
                content: "";
                position: absolute;
                bottom: 0;
                left: 0;
                width: 100%;
                height: 50%;
                background: linear-gradient(to top, rgba(0, 0, 0, ${eventtimageoverlayopacity[0]?eventtimageoverlayopacity[0].opacity : 0.5}), rgba(0, 0, 0, 0) 100%, transparent 0%);
                opacity: 1;
                z-index:999;
            }
/*
            .App-title .content-right:before  {
                content: "";
                position: absolute;
                top: 0;
                left: 50%;
                width: 50%;
                height: 50%;
                background: linear-gradient(to bottom, rgba(0, 0, 0, ${eventtimageoverlayopacity[0]?eventtimageoverlayopacity[0].opacity : 0.5}), rgba(0, 0, 0, 0) 100%, transparent 0%);
                opacity: 1;
                z-index:999;
            }

            .App-title .content-right:after {
                content: "";
                position: absolute;
                bottom: 0;
                left: 50%;
                width: 50%;
                height: 50%;
                background: linear-gradient(to top, rgba(0, 0, 0, ${eventtimageoverlayopacity[0]?eventtimageoverlayopacity[0].opacity : 0.5}), rgba(0, 0, 0, 0) 100%, transparent 0%);
                opacity: 1;
                z-index:999;
            }
*/
            `
        }

        if (eventtimageheader[0]) {
            imageheadercss = `
                .rubrikitext {
                    display: none
                }
            `
        }
        template('head').append(
            `<style>
                .App {
                    background-color: #${eventbgcolor[0] ? eventbgcolor[0].code : 'ffffff'};
                }

                body, .App, .App-content, a {
                    color: #${eventtextcolor[0] ? eventtextcolor[0].code : '000000'};
                }

                .kthname {
                    color: #${eventlogocolor[0] ? eventlogocolor[0].code : 'ffffff'};
                }
                
                .imagetop .kthlogo .cls-1 {
                    fill: #${eventlogocolor[0] ? eventlogocolor[0].code : 'ffffff'};
                }

                .content-top .kthlogo .cls-1 {
                    fill: #${eventlogocolor[0] ? eventlogocolor[0].code : 'ffffff'};
                }

                .texttop .kthlogo .cls-1 {
                    fill: #${eventtextcolor[0] ? eventtextcolor[0].code : '004791'};
                }

                .cls-2 {
                    stroke: #${eventlinepatterncolor[0] ? eventlinepatterncolor[0].code : '000000'};
                }

                ${imageoverlaycss}
                ${imageheadercss}
            </style>`);

        let parser = new Parser();
        let feed

        let qrcodetext = ''

        let typeofeventtext = '';
        let typeofeventPrompttext = '';
        if (event.lang == 'en') {
            feed = await parser.parseURL(process.env.RSSFEED);
            qrcodetext = 'Read more'
            template('.kthname').text("KTH Library");
            typeofeventPrompttext = 'Type of event'
            typeofeventtext = 'Missing!';
        }
        if (event.lang == 'sv') {
            feed = await parser.parseURL(process.env.RSSFEED_SV);
            qrcodetext = 'Läs mer'
            template('.kthname').text("KTH Biblioteket");
            typeofeventPrompttext = 'Typ'
            typeofeventtext = 'Saknas!';
        }

        let item = feed.items.filter(item => '1.' + item.guid.split('-1.')[1] == event.contentid)
        if (item.length > 0) {

            let qrcode;

            //Skapa QR-kod med link/guid
            //qrcode = await QRCode.toDataURL(item[0].link)
            qrcode = await generateQrCode(event.id, eventbgcolor)

            //Hämta den publicerade kalendersidan i polopoly
            //för att få bild/tid/plats/språk/föreläsare
            const response = await axios.get(item[0].guid)
            
            //Hämta eventuell inlagd bild från bildbank
            let eventimage = await readEventImage(event.id)

            let imagesrc = ''

            let signhtml = "";
            const cheeriocalendar = cheerio.load(response.data, null, false);
            let cheeriodescription = cheerio.load(item[0].content, null, false);
            let numberofrows = eventfields.length
            let rowcount = 0
            eventfields.forEach(row => {
                
                if (row.events_id !== null && row.type == 'title') {
                    //Ska rubriken vara på bilden eller i texten
                    //För liggande format ska texten alltid vara i texten.
                    if(orientation == 'landscape') { 
                        template('.content-left .rubrik').text(item[0].title);
                    } else {
                        if (eventtimageheader[0]) { 
                            template('.content-top .rubrik').text(item[0].title);
                        } else {
                            template('.content-bottom .rubrik').text(item[0].title);
                        }
                    }
                }

                if (row.events_id !== null && row.type == 'time') {
                    if (cheeriocalendar("strong:contains(Time)").length) {
                        template('#App-content').append('<div id="time">' + cheeriocalendar("strong:contains(Time)").parent().html() + '</div>');
                    }
                    if (cheeriocalendar("strong:contains(Tid)").length) {
                        template('#App-content').append('<div id="time">' + cheeriocalendar("strong:contains(Tid)").parent().html() + '</div>');
                    }
                }

                if (row.events_id !== null && row.type == 'location') {
                    if (cheeriocalendar("strong:contains(Location)").length) {
                        template('#App-content').append('<div id="location">' + cheeriocalendar("strong:contains(Location)").parent().html() + '</div>');
                    }
                    if (cheeriocalendar("strong:contains(Plats)").length) {
                        template('#App-content').append('<div id="location">' + cheeriocalendar("strong:contains(Plats)").parent().html() + '</div>');
                    }
                }

                if (row.events_id !== null && row.type == 'language') {
                    if (cheeriocalendar("strong:contains(Language)").length) {
                        template('#App-content').append('<div id="language">' + cheeriocalendar("strong:contains(Language)").parent().html() + '</div>');
                    }
                    if (cheeriocalendar("strong:contains(Språk)").length) {
                        template('#App-content').append('<div id="language">' + cheeriocalendar("strong:contains(Språk)").parent().html() + '</div>');
                    }
                }

                //Fält för lecturer har bytt namn i polopoly till Medverkande/Participating

                if (row.events_id !== null && row.type == 'lecturer') {
                    if (cheeriocalendar("strong:contains(Participating)").length) {
                        template('#App-content').append('<div id="lecturer">' + cheeriocalendar("strong:contains(Participating)").parent().html() + '</div>');
                    }
                    if (cheeriocalendar("strong:contains(Medverkande)").length) {
                        template('#App-content').append('<div id="lecturer">' + cheeriocalendar("strong:contains(Medverkande)").parent().html() + '</div>');
                    }
                }

                if (row.events_id !== null && row.type == 'typeofevent') {
                    var subjectElement = cheeriodescription(".subject");
                    if (subjectElement.length) {
                        template('#App-content').append('<div id="typeofevent">' + subjectElement.html() + '</div>');
                    } else {
                        template('#App-content').append('<div id="typeofevent"><strong>' + typeofeventPrompttext + ':</strong> ' + typeofeventtext + '</div>');
                    }
                }

                if (row.events_id !== null && row.type == 'ingress') {
                    //Hantera paddings beroende på placering
                    let cssclass = 'top-padding bottom-padding'
                    if(row.sortorder == 0) {
                        cssclass = 'bottom-padding'
                    }

                    if(rowcount == numberofrows) {
                        cssclass = 'top-padding'
                    }
                    if (cheeriocalendar("#mainContent .lead").length) {
                        template('#App-content').append('<div id="ingress" class="' + cssclass + '">' + truncate(cheeriocalendar("#mainContent .preArticleParagraphs .lead p").text(), 200, "...") + '</div>');
                    }
                }

                //Bild antingen från bildbank eller kalender(har kalender ingen bild ligger bilden från template kvar)
                if (row.events_id !== null && row.type == 'image') {
                    if (eventimage[0]) {
                        const imagebase64 = fs.readFileSync(path.join(__dirname, process.env.IMAGEBANKPATH + '/' + eventimage[0].fullpath))
                        imagesrc = 'data:image/jpeg;base64,' + Buffer.from(imagebase64).toString('base64');
                        template('.titleimage').addClass("fromimagebank")
                    } else {
                        
                        if (cheeriocalendar('article .figure-img').length) {
                            imagesrc = 'https://www.kth.se' + cheeriocalendar('article .figure-img').attr('src')
                            template('.titleimage').addClass("frompolopoly")
                        } else {
                            imagesrc = template('.titleimage img').attr('src')
                            template('.titleimage').addClass("fromimagebank")
                        }
                    }
                    template('.titleimage img').attr('src', imagesrc);
                    //template('.content-right').css('background-image', `url("${imagesrc}")`);
                }

                if (row.events_id !== null && row.type == 'qrcode') {
                    template('.App-footer').html(`<div class="footerleft">${qrcodetext}&nbsp;<i class="bi bi-arrow-right"></i></div><div class="footercenter"><img class="qrcode" src="${qrcode}"/></div><div class="footerright"></div>`);
                }
                rowcount++;
            })


            return template.root().html()
        } else {
            return "unpublished"
        }
    } catch (error) {
        console.log(error)
        return error.message
    }
};

async function generatePublishedPages(type, req) {
    try {
        //Hämta alla som är publicerade med eventtid från idag och framåt
        let published = await readAllPublished();
        let calendarpagehtml = "";
        let index = 1;

        const io = req.app.get('io');
        const sockets = req.app.get('sockets');
        const thisSocketId = sockets[req.body.sessionId];
        const socketInstance = io.to(thisSocketId);

        let total = published.length;
        let progress = 1;

        if (type === "all") {
            total = total * 2
        }

        socketInstance.emit('uploadProgress', `{"type": "image", "total": ${total}, "progress": 0}`);

        //Spara till bilder
        if (type === "images" || type === "all") {
            //Ta bort nuvarande publicerade händelser(bilder)
            let files = fs.readdirSync( path.join(__dirname, "/publishedevents/images") );
            let jpgfiles = files.filter( file => file.match(new RegExp(`.*\.(jpg)`, 'ig')));
            for await (const file of jpgfiles) {
                fs.unlinkSync(path.join(__dirname, "/publishedevents/images", file));
            }

            //Gå igenom publicerade händelser 
            //Generera HTML i smartsignformat och spara som JPG
            for (const element of published) {
                socketInstance.emit('uploadProgress', `{"type": "image", "total": ${total}, "progress": ${progress}}`);
                //Saknas i kalenderfeed
                if (calendarpagehtml != 'unpublished') {
                    await savePageAsImage(element.id, calendarpagehtml, path.join(__dirname, "/publishedevents/images/smartsign" + index + ".jpg"), 'templates/smartsign_template_screen.html')
                }
                index++
                progress++
            };
        }

        //Spara genererad html
        if (type === "html" || type === "all") {
            //Ta bort nuvarande publicerade händelser(html)
            let files = fs.readdirSync( path.join(__dirname, "/publishedevents/html") );
            let htmlfiles = files.filter( file => file.match(new RegExp(`.*\.(html)`, 'ig')));
            for await (const file of htmlfiles) {
                fs.unlinkSync(path.join(__dirname, "/publishedevents/html", file));
            }

            index = 1;

            for (const element of published) {
                socketInstance.emit('uploadProgress', `{"type": "html", "total": ${total}, "progress": ${progress}}`);
                calendarpagehtml = await generateCalendarPage('', element.id)
                //Saknas i kalenderfeed
                if (calendarpagehtml != 'unpublished') {
                    fs.writeFile(path.join(__dirname, "/publishedevents/html/smartsign_calendar_" + index + ".html"), calendarpagehtml, function (err) {
                        if (err) {
                            console.log(err);
                            return "Error creating html";
                        }
                    });
                }
                index++
                progress++
            }
        }

        return "Slide created";

    } catch (err) {
        console.log(err)
        return "Error creating slides";
    }
};

async function generatePublishedPageAsImage(req, res) {
    try {
        let published_as_image = req.query.published_as_image || req.body.published_as_image
        console.log(published_as_image)
        await eventModel.updateEventPublishAsImage(req.params.id, published_as_image)
        if(published_as_image == 0) {
            //remove image file
            fs.unlinkSync(path.join(__dirname, "/publishedevents/images/smartsign_event_" + req.params.id + "." + process.env.IMAGE_FORMAT));
            res.send("Event Image deleted, " + path.join(__dirname, "/publishedevents/images/smartsign_event_" + req.params.id + "." + process.env.IMAGE_FORMAT))
        } else {
            await savePageAsImage(req.params.id, "", path.join(__dirname, "/publishedevents/images/smartsign_event_" + req.params.id + "." + process.env.IMAGE_FORMAT), 'templates/smartsign_template_screen.html')
            res.send("Event Image generated, " + path.join(__dirname, "/publishedevents/images/smartsign_event_" + req.params.id + "." + process.env.IMAGE_FORMAT))
        }
    } catch (err) {
        res.send("error: " + err.message)
    }
}

async function getPublishedPageAsImage(req, res) {
    try {
        const eventimage = fs.readFileSync(path.join(__dirname, "/publishedevents/images/smartsign_event_" + req.params.id + "." + process.env.IMAGE_FORMAT))
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write(`
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
                <title>KTH Library Calendar</title>
                <link rel="shortcut icon" href="/favicon.ico">
            </head>
            <style>
                body {
                    height: 1900px;
                    width: 1080px;
                    overflow: hidden;
                    margin: 0;
                    padding: 0;
                    font-family: sans-serif;
                }
            </style>
            <body>`)   
        res.write('<img src="data:image/jpeg;base64,')
        res.write(Buffer.from(eventimage).toString('base64'));
        res.write('"/>');
        res.write(`
            </body>
        </html>`)
        res.end();
    }
    catch (err) {
        res.send("unpublished event")
    }
}

async function generateQrCode(id, eventbgcolor) {
    let returnimage;
    try {
        let event = await readEventId(id)
        //MySQL kräver index [0]
        event = event[0]
        const file = "kthlogo_marinbla_qr.svg"

        const logo = await sharp(path.join(__dirname, "public/images/" + file))
            .extend({
                top: 10,
                bottom: 10,
                left: 10,
                right: 10,
                background: { r: 255, g: 255, b: 255, alpha: 1 },
            })
            .resize(100) // replace with your logo size
            .toBuffer();

        let qrCode = await QRCode.toDataURL(process.env.QRCODELINK + event.id, {
            width: 500,
            height: 500,
            correctLevel: "H",
            margin: 1,
            color: {
              dark: "#212121",
              light: "#ffffff",
            }
        });

        const qrBuffer = Buffer.from(qrCode.split(',')[1], 'base64');
        const qrlogobuffer = await sharp(qrBuffer, { density: 300 })
            .composite([
                {
                    input: logo,
                    gravity: 'center',
                },
            ])
            .toBuffer();
        const dataURI = `data:image/png;base64,${qrlogobuffer.toString('base64')}`;
        return dataURI;
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function generateQrCodeGeneral(id) {
    try {
        //const file = "kthlogo.jpg"
        const file = "kthlogo_marinbla_qr.svg"
        //const logo = fs.readFileSync(path.join(__dirname, "public/images/" + file))
        const logo = await sharp(path.join(__dirname, "public/images/" + file))
            .extend({
                top: 10,
                bottom: 10,
                left: 10,
                right: 10,
                background: { r: 255, g: 255, b: 255, alpha: 1 },
            })
            .resize(100) // replace with your logo size
            .toBuffer();

        let qrCode = await QRCode.toDataURL(process.env.QRCODELINK + 'general/' + id, {
            width: 500,
            height: 500,
            correctLevel: "H",
            margin: 1,
            color: {
                dark: "#212121",
                light: "#ffffff",
            }
        });

        const qrBuffer = Buffer.from(qrCode.split(',')[1], 'base64');
        const qrlogobuffer = await sharp(qrBuffer, { density: 300 })
            .composite([
                {
                    input: logo,
                    gravity: 'center',
                },
            ])
            .toBuffer();
        const dataURI = `data:image/png;base64,${qrlogobuffer.toString('base64')}`;
        return dataURI;
    } catch (err) {
        console.log(err.message)
        return "error: " + err.message
    }
}

async function generatePdfPage(id, format='A4', orientation='portrait', template_ver='v1') {
    try {
        let calendarpagehtml = "";
        //Ta bort nuvarande pdf
        let files = fs.readdirSync( path.join(__dirname, "/publishedevents/pdf") );
        let pdffiles = files.filter( file => file.match(new RegExp(`.*\.(pdf)`, 'ig')));
        for await (const file of pdffiles) {
            fs.unlinkSync(path.join(__dirname, "/publishedevents/pdf", file));
        }

        //Generera HTML i smartsignformat och spara som PDF
        let template
        let pdfpath
        if(format=='A4') {
            if(orientation == 'portrait'){
                template = `templates/smartsign_template_pdf_A4.html`
                pdfpath = `publishedevents/pdf/smartsign_A4.pdf`
            } else {
                template = `templates/smartsign_template_pdf_landscape_A4_${template_ver}.html`
                pdfpath = `publishedevents/pdf/smartsign_A4_landscape.pdf`
            }
        } else {
            if(orientation == 'portrait'){
                template = `templates/smartsign_template_pdf.html`
                pdfpath = `publishedevents/pdf/smartsign.pdf`
            } else {
                template = `templates/smartsign_template_pdf_landscape_${template_ver}.html`
                pdfpath = `publishedevents/pdf/smartsign_landscape.pdf`
            }
        }
        let pdf = await savePageAsPdf(id, path.join(__dirname, pdfpath), format, template, orientation);
        return pdf;

    } catch (err) {
        console.log(err)
        return "Error creating pdf";
    }
};

async function generatePdfPageDailyWifi(format='A4') {
    try {
        //Ta bort nuvarande pdf
        let files = fs.readdirSync( path.join(__dirname, "/publishedevents/pdf") );
        let pdffiles = files.filter( file => file.match(new RegExp(`.*\.(pdf)`, 'ig')));
        for await (const file of pdffiles) {
            fs.unlinkSync(path.join(__dirname, "/publishedevents/pdf", file));
        }

        //Generera HTML i smartsignformat och spara som PDF
        let template
        let pdfpath
        if(format=='A4'){
            template = 'templates/smartsign_template_general_pdf_A4.html'
            pdfpath = 'publishedevents/pdf/smartsign_A4.pdf'
        } else {
            template = 'templates/smartsign_template_general_pdf.html'
            pdfpath = 'publishedevents/pdf/smartsign.pdf'
        }
        let pdf = await saveWifiPageAsPdf(path.join(__dirname, pdfpath), format, template);
        return pdf;

    } catch (err) {
        console.log(err)
        return "Error creating pdf";
    }
};

async function generateDailyWiFiPage(format='A4', lang ='en') {
    if(format=='json') {
        //Hämta daily code json
        try {
            let wificode = await eventModel.readDailyWiFiCode()
            return(wificode[0].code)
        } catch(error) {
            console.log(error.message)
            return error.message
        }
    } else {
        let html_template = 'templates/smartsign_template_general.html'
        let fontsize = '30px'
        if (format=='A4') {
            html_template = 'templates/smartsign_template_general_A4.html';
            fontsize = '16px'
        }

        const files = fs.readFileSync(path.join(__dirname, html_template));
        const template = cheerio.load(files.toString(), null, true);
        
        let imageoverlaycss = `
            .App-title .titleimage:before {
                content: "";
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 50%;
                background: linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0) 100%, transparent 0%);
                opacity: 1;
                z-index:999;
            }

            .App-title .titleimage:after {
                content: "";
                position: absolute;
                bottom: 0;
                left: 0;
                width: 100%;
                height: 50%;
                background: linear-gradient(to top, rgba(0, 0, 0,0.5), rgba(0, 0, 0, 0) 100%, transparent 0%);
                opacity: 1;
                z-index:999;
            }`
        if (lang == 'en') {            
            template('.kthname').text("KTH Library");
            typeofeventPrompttext = 'Type of event'
            typeofeventtext = 'Missing!';
        }
        if (lang == 'sv') {
            template('.kthname').text("KTH Biblioteket");
            typeofeventPrompttext = 'Typ'
            typeofeventtext = 'Saknas!';
        }
        try {
            //Hämta daily code
            let wificode = await eventModel.readDailyWiFiCode()
            //MySQL kräver index [0]
            wificode = wificode[0]
            
            let rubriktext='Dagens wifi-lösenord'
            let description='Är du inte student eller anställd vid KTH kan du använda bibliotekets öppna wifi. Denna ger åtkomst till internet men inte till bibliotekets elektroniska resurser'
            
            let rubriktext_en=`Today's wifi password`
            let description_en=`In case you are not a student or an employee at KTH you can use the library's open Wi-Fi. This provides access to the internet, but not to the library's electronic resources`
            template('.rubrik').html(`<div>${rubriktext}</div>
                                            <div>${rubriktext_en}</div>`);
            template('.App-content').html(`<div><b>Wifi:</b> KTHOPEN</div>
                                            <div><b>User name:</b> kthb-dayguest</div>
                                            <div><b>Password:</b> ${wificode.code}</div>
                                            <div style="padding-top:20px;font-size:${fontsize}">
                                                <p>${description}</p>
                                                <p>${description_en}</p>
                                            </div>`);
            template('head').append(
                `<style>
                    ${imageoverlaycss}
                </style>`)
            return template.root().html()
        } catch (error) {
            console.log(error.message)
            return error.message
        }
    }
};

async function savePageAsImage(events_id, html, imagefullpath, template) {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] },);
    try {
        const page = await browser.newPage();

        //Storlek på smartsignskärmarna är 1080x1920
        await page.setViewport({
            width: 1080,
            height: 1920,
            deviceScaleFactor: 1,
        });

        await page.goto(process.env.SERVERURL + 'smartsigntools/api/v1/calendar/event/' + events_id + '?template=' + template, { waitUntil: 'networkidle0', timeout: 90000 })

        await page.screenshot({ path: imagefullpath, quality: parseInt(100) });

        await page.close();

    }
    catch (error) {
        console.log(process.env.SERVERURL + 'smartsigntools/api/v1/calendar/event/' + events_id + '?template=' + template)
        console.log(error)
    }
    finally {
        await browser.close();
    }

}

async function savePageAsPdf(events_id, pdffullpath, format='screen', template, orientation) {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--font-render-hinting=medium'] },);
    try {
        const page = await browser.newPage();

        let width = 1080;
        let height = 1920;
        if (format == 'screen') {
            width = orientation=='portrait' ? 1080 : 1920
            height = orientation=='portrait' ? 1920 : 1080
        }
        if (format == 'A4') {
            width = orientation=='portrait' ? 794 : 1123
            height = orientation=='portrait' ? 1123 : 794
        }

        await page.goto(process.env.SERVERURL + 'smartsigntools/api/v1/calendar/event/' + events_id + '?template=' + template + '&format=' + format + '&orientation=' + orientation, { waitUntil: 'networkidle0' })

        let pdf
        if (format=='A4') {
            pdf = await page.pdf({
                path: pdffullpath,
                printBackground: true,
                format: 'A4',
                landscape: orientation == 'landscape' ? true : false,
                margin: { top: 0, right: 0, bottom: 0, left: 0 },
            });
        } else {
            pdf = await page.pdf({
                path: pdffullpath,
                printBackground: true,
                width: width,
                height: height,
                margin: { top: 0, right: 0, bottom: 0, left: 0 },
            });
        }

        await page.close();

        return pdf;

    }
    catch (error) {
        console.log(error)
    } 
    finally {
        await browser.close();
    }

}

async function saveWifiPageAsPdf(pdffullpath, format, template) {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--font-render-hinting=medium'] },);
    try {
        const page = await browser.newPage();

        //Storlek på smartsignskärmarna är 1080x1920
        await page.setViewport({
            width: 1080,
            height: 1920,
            deviceScaleFactor: 1,
        });

        await page.goto(process.env.SERVERURL + 'smartsigntools/api/v1/dailywifi?format=' + format, { waitUntil: 'networkidle0' })

        let pdf
        if (format=='A4') {
            pdf = await page.pdf({
                path: pdffullpath,
                printBackground: true,
                format: 'A4'
            });
        } else {
            pdf = await page.pdf({
                path: pdffullpath,
                printBackground: true,
                width: '1080px',
                height: '1920px'
            });
        }

        await page.close();

        return pdf;

    }
    catch (error) {
        console.log(error)
    }
    finally {
        await browser.close();
    }

}

async function getPageAsImage(events_id, html, template = 'templates/smartsign_template_screen.html', format='screen', orientation = 'portrait') {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] },);
    try {
        const page = await browser.newPage();

        //Storlek på smartsignskärmarna är 1080x1920
        //Storlek A4 är 794X1123
        let width = 1080;
        let height = 1920;
        if (format == 'screen') {
            width = orientation=='portrait' ? 1080 : 1920
            height = orientation=='portrait' ? 1920 : 1080
        }
        if (format == 'A4') {
            width = orientation=='portrait' ? 794 : 1123
            height = orientation=='portrait' ? 1123 : 794
        }

        let deviceScaleFactor = parseInt(process.env.DEVICESCALEFACTOR) || 1
        await page.setViewport({
            width: width,
            height: height,
            deviceScaleFactor: deviceScaleFactor,
        });

        await page.goto(process.env.SERVERURL + 'smartsigntools/api/v1/calendar/event/' + events_id + '?template=' + template + '&format=' + format + '&orientation=' + orientation, { waitUntil: 'networkidle0' })

        let pageimage
        let quality = parseInt(process.env.SCREENSHOT_QUALITY) || 100;
        pageimage = await page.screenshot({
            type: 'jpeg',
            quality: quality
         });

        await page.close();

        return pageimage

    }
    catch (error) {
        console.log(process.env.SERVERURL + 'smartsigntools/api/v1/calendar/event/' + events_id + '?template=' + template)
        console.log(error)
    }
    finally {
        await browser.close();
    }

}

async function getImasAsImage() {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] },);
    try {
        const page = await browser.newPage();

        let deviceScaleFactor = parseInt(process.env.DEVICESCALEFACTOR) || 1
        //Storlek på smartsignskärmarna är 1080x1920
        await page.setViewport({
            width: 1080,
            height: 1920,
            deviceScaleFactor: deviceScaleFactor,
        });

        await page.goto(process.env.SERVERURL + 'smartsigntools/api/v1/imas/smartsignpage?internal=true', { waitUntil: 'networkidle0' })

        let pageimage
        let quality = parseInt(process.env.SCREENSHOT_QUALITY) || 100;
        pageimage = await page.screenshot({
            type: 'jpeg',
            quality: quality
         });

        await page.close();

        return pageimage

    }
    catch (error) {
        console.log(process.env.SERVERURL + 'smartsigntools/api/v1/imas/smartsignpage')
        console.log(error)
    }
    finally {
        await browser.close();
    }

}

async function getGrbAsImage() {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] },);
    try {
        const page = await browser.newPage();

        let deviceScaleFactor = parseInt(process.env.DEVICESCALEFACTOR) || 1
        //Storlek på smartsignskärmarna är 1080x1920
        await page.setViewport({
            width: 1080,
            height: 1920,
            deviceScaleFactor: deviceScaleFactor,
        });

        await page.goto(process.env.SERVERURL + 'smartsigntools/api/v1/grb/smartsignpage?internal=true', { waitUntil: 'networkidle0' })

        let pageimage
        let quality = parseInt(process.env.SCREENSHOT_QUALITY) || 100;
        pageimage = await page.screenshot({
            type: 'jpeg',
            quality: quality
         });

        await page.close();

        return pageimage

    }
    catch (error) {
        console.log(process.env.SERVERURL + 'smartsigntools/api/v1/grb/smartsignpage')
        console.log(error)
    }
    finally {
        await browser.close();
    }

}

async function getTimeeditAsImage() {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] },);
    try {
        const page = await browser.newPage();

        let deviceScaleFactor = parseInt(process.env.DEVICESCALEFACTOR) || 1

        //Storlek på smartsignskärmarna är 1080x1920
        await page.setViewport({
            width: 1080,
            height: 1920,
            deviceScaleFactor: deviceScaleFactor,
        });

        await page.goto(process.env.SERVERURL + 'smartsigntools/api/v1/timeedit/smartsignpage', { waitUntil: 'networkidle0' })

        let pageimage
        let quality = parseInt(process.env.SCREENSHOT_QUALITY) || 100;
        pageimage = await page.screenshot({
            type: 'jpeg',
            quality: quality
         });

        await page.close();

        return pageimage

    }
    catch (error) {
        console.log(process.env.SERVERURL + 'smartsigntools/api/v1/timeedit/smartsignpage')
        console.log(error)
    }
    finally {
        await browser.close();
    }

}

async function getImasRealtime(req, res) {
    try {
        token = await axios.post(`https://api.imas.net/account/login`, {
            'UserName' : process.env.IMAS_USER,
            'password' : process.env.IMAS_PASSWORD
        })
        
        let todaysdate = new Date()
        
        imasopenedhours = await axios.get(`https://api.imas.net/export/getopenedhours?id=KTHBIB&date=${todaysdate.toLocaleDateString()}`,
        {
            headers: {
                'User' : process.env.IMAS_USER,
                'X-Auth-Token' : token.data
            }
        })
        
        //Hämta realtidsvärden om biblioteket är öppet
        if ((new Date() > new Date(imasopenedhours.data.from) && new Date() < new Date(imasopenedhours.data.until))) {
            exportrealtimevalues = await axios.get(`https://api.imas.net/export/exportrealtimevalues?id=KTHBIB`,
            {
                headers: {
                    'User' : process.env.IMAS_USER,
                    'X-Auth-Token' : token.data
                }
            })
            res.send(exportrealtimevalues.data)
        } else {
            res.send({"location": "closed"})
        }
    } catch (err) {
        res.send(err.message)
    }
}

async function getExchangeCalendarItems(req, res) {

  try {
    const exchangeService = new ews.ExchangeService(ews.ExchangeVersion.Exchange2013);
    exchangeService.Credentials = new ews.ExchangeCredentials(process.env.EWS_USER, process.env.EWS_PASSWORD);
    exchangeService.Url = new ews.Uri(process.env.EWS_HOST + '/ews/exchange.asmx');

    const calendarFolder = new ews.FolderId(ews.WellKnownFolderName.Calendar, new ews.Mailbox(req.params.emailaddress));
   
    let StartDate = new Date(req.query.startdate);
    let EndDate = new Date(req.query.enddate);
    StartDate = StartDate.toISOString();
    EndDate = EndDate.toISOString();

    const view = new ews.CalendarView(StartDate, EndDate);

    const appointments = await exchangeService.FindAppointments(calendarFolder, view);
    let start
    let end
    let json=[]
    for (const appointment of appointments.Items) {
        if(appointment.IsAllDayEvent) {
            start =new Date(appointment.Start).toLocaleDateString('sv-SE')
            end = new Date(appointment.End).toLocaleDateString('sv-SE')
        } else {
            start =new Date(appointment.Start).toLocaleString('sv-SE')
            end = new Date(appointment.End).toLocaleString('sv-SE')
        };
        json.push(
            {
                "location": appointment.Location != null ? appointment.Location : "",
                "title": appointment.Subject,
                "start": start,
                "end": end
            }
        )
    }
    res.json(json)
  } catch (error) {
    console.error('Error:', error);
  }

}

function substrInBetween(whole_str, str1, str2) {
    if (whole_str.indexOf(str1) === -1 || whole_str.indexOf(str2) === -1) {
        return undefined;
    }
    return whole_str.substring(
        whole_str.indexOf(str1) + str1.length,
        whole_str.indexOf(str2)
    );
}

function truncate(str, max, suffix) {
    return str.length < max ? str : `${str.substr(0, str.substr(0, max - suffix.length).lastIndexOf(' '))}${suffix}`;
}

module.exports = {
    readAllPublished,
    readEventsPaginated,
    login,
    logout,
    slideshow,
    slideshowimages,
    readEvents,
    readEventsByDate,
    readEventGuid,
    readEventContentid,
    readEventId,
    createEvent,
    updateEvent,
    deleteEvent,
    updateEventLang,
    updateEventPublish,
    createEventField,
    deleteEventField,
    readEventBgColor,
    createEventBgColor,
    deleteEventBgColor,
    readEventTextColor,
    createEventTextColor,
    deleteEventTextColor,
    readEventLogoColor,
    createEventLogoColor,
    deleteEventLogoColor,
    readEventImage,
    createEventImage,
    deleteEventImage,
    readEventImageOverlay,
    createEventImageOverlay,
    deleteEventImageOverlay,
    readEventImageOverlayOpacity,
    createEventImageOverlayOpacity,
    deleteEventImageOverlayOpacity,
    readEventImageHeader,
    createEventImageHeader,
    deleteEventImageHeader,
    readEventFieldsOrder,
    createEventFieldsOrder,
    deleteEventFieldsOrder,
    readEventLinePattern,
    createEventLinePattern,
    deleteEventLinePattern,
    readEventLinePatternPlacement,
    createEventLinePatternPlacement,
    deleteEventLinePatternPlacement,
    readEventLinePatternColor,
    createEventLinePatternColor,
    deleteEventLinePatternColor,
    readImages,
    readImage,
    createImage,
    updateImage,
    deleteImage,
    readQrcodetracking,
    createQrcodetracking,
    readAllQrcodetracking,
    readQrcodetrackingByTimePeriod,
    readQrCodesGeneral,
    readQrCodeGeneral,
    createQrCodeGeneral,
    updateQrCodeGeneral,
    deleteQrCodeGeneral,
    generateCalendarPage,
    generatePublishedPages,
    generatePublishedPageAsImage,
    getPublishedPageAsImage,
    generateQrCode,
    generateQrCodeGeneral,
    generateDailyWiFiPage,
    generatePdfPage,
    generatePdfPageDailyWifi,
    savePageAsImage,
    savePageAsPdf,
    getPageAsImage,
    getImasAsImage,
    getGrbAsImage,
    getTimeeditAsImage,
    saveWifiPageAsPdf,
    getImasRealtime,
    getExchangeCalendarItems,
    substrInBetween,
    truncate
};
