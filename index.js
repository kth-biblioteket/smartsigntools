'use strict';

//require('dotenv').config()
require('dotenv').config({path:'smartsigntools.env'})

const jwt = require("jsonwebtoken");
const VerifyToken = require('./VerifyToken');
const VerifyAdmin = require('./VerifyAdmin');
const express = require("express");
const bodyParser = require("body-parser");
const cors = require('cors')
const fs = require("fs");
const path = require('path');
const eventController = require('./eventControllers');
const fileUpload = require('express-fileupload');
const { randomUUID } = require('crypto');
const cookieParser = require("cookie-parser");

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(fileUpload({
    limits: { fileSize: 2 * 1024 * 1024 },
    abortOnLimit: true
}));

app.use(cookieParser());

const socketIo = require("socket.io");

app.set("view engine", "ejs");

app.use(process.env.APP_PATH, express.static(path.join(__dirname, "public")));

app.use(cors({ origin: '*' }));

const apiRoutes = express.Router();

apiRoutes.get("/", async function (req, res, next) {
    try {
        let verify = await VerifyAdmin(req, res, next)
        eventController.readEventsPaginated
    } catch(err) {
        res.render('login', {logindata: {"status":"ok", "message":"login"}})
    }
});

apiRoutes.get('/public/style.css', function(req, res) {
    res.sendFile(__dirname + "/public/css/" + "styles.css");
});

apiRoutes.get('/public/styles_pdf.css', function(req, res) {
    res.sendFile(__dirname + "/public/css/" + "styles_pdf.css");
});

apiRoutes.get('/public/TheSans-Plain-kthb.ttf', function(req, res) {
    fs.readFile(__dirname + "/public/fonts/" + "TheSans-Plain-kthb.ttf", function(error, content) {
        if (error) {
            if(error.code == 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end("error", 'utf-8');
            }
            else {
                res.writeHead(500);
                res.end('Font saknas: '+error.code+' ..\n');
            }
        }
        else {
            res.writeHead(200, { 'Content-Type': 'application/font-ttf' });
            res.end(content, 'utf-8');
        }
    });  
});

apiRoutes.get('/public/FarnhamDisplay-RegularOSF.ttf', function(req, res) {
    fs.readFile(__dirname + "/public/fonts/" + "FarnhamDisplay-RegularOSF.ttf", function(error, content) {
        if (error) {
            if(error.code == 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end("error", 'utf-8');
            }
            else {
                res.writeHead(500);
                res.end('Font saknas: '+error.code+' ..\n');
            }
        }
        else {
            res.writeHead(200, { 'Content-Type': 'application/font-ttf' });
            res.end(content, 'utf-8');
        }
    });
});

apiRoutes.post("/login", eventController.login)

apiRoutes.post("/logout", VerifyToken, eventController.logout)

apiRoutes.get("/admin", VerifyToken, eventController.readEventsPaginated)

apiRoutes.get("/calendar/published/slideshow", eventController.slideshow) 

apiRoutes.get("/calendar/published/slideshowimages", eventController.slideshowimages)

apiRoutes.post("/calendar/event", VerifyToken, async function (req, res, next) {
    try {
        let guid = req.query.guid || req.body.guid
        let eventtime = req.query.eventtime || req.body.eventtime
        let create = await eventController.createEvent(guid, eventtime)
        res.send(create)
    } catch(err) {
        res.send(err.message)
    }
});

apiRoutes.put("/calendar/event", VerifyToken, async function (req, res, next) {
    try {
        let guid = req.query.guid || req.body.guid
        let eventtime = req.query.eventtime || req.body.eventtime
        res.send(eventController.updateEvent(guid, eventtime))
    } catch(err) {
        res.send(err.message)
    }
});

apiRoutes.delete("/calendar/event", VerifyToken, async function (req, res, next) {
    try {
        let guid = req.query.guid || req.body.guid
        res.send(eventController.deleteEvent(guid))   
    } catch(err) {
        res.send(err.message)
    } 
});

apiRoutes.put("/calendar/eventlang/:id", VerifyToken, eventController.updateEventLang)

apiRoutes.post("/calendar/event/publish", VerifyToken, async function (req, res, next) {
    try {
        let events_id = req.query.events_id || req.body.events_id
        let publish = req.query.publish || req.body.publish
        res.send(eventController.updateEventPublish(events_id, publish))
    } catch(err) {
        res.send(err.message)
    }
});

apiRoutes.post("/calendar/event/field", VerifyToken, async function (req, res, next) {
    try {
        let fields_id = req.body.fields_id
        let events_id = req.body.events_id
        res.send(eventController.createEventField(events_id, fields_id))
    } catch(err) {
        res.send(err.message)
    }
});

apiRoutes.delete("/calendar/event/field", VerifyToken, async function (req, res, next) {
    try {
        let fields_id = req.body.fields_id
        let events_id = req.body.events_id
        res.send(eventController.deleteEventField(events_id, fields_id))
    } catch(err) {
        res.send(err.message)
    }
});

apiRoutes.post("/calendar/event/bgcolor", VerifyToken, async function (req, res, next) {
    try {
        let color_id = req.body.color_id
        let events_id = req.body.events_id
        res.send(eventController.createEventBgColor(events_id, color_id))
    } catch(err) {
        res.send(err.message)
    }
});

apiRoutes.delete("/calendar/event/bgcolor", VerifyToken, async function (req, res, next) {
    try {
        let color_id = req.body.color_id
        let events_id = req.body.events_id
        res.send(eventController.deleteEventBgColor(events_id, color_id))
    } catch(err) {
        res.send(err.message)
    }
});

apiRoutes.post("/calendar/event/textcolor", VerifyToken, async function (req, res, next) {
    try {
        let color_id = req.body.color_id
        let events_id = req.body.events_id
        res.send(eventController.createEventTextColor(events_id, color_id))
    } catch(err) {
        res.send(err.message)
    }
});

apiRoutes.delete("/calendar/event/textcolor", VerifyToken, async function (req, res, next) {
    try {
        let color_id = req.body.color_id
        let events_id = req.body.events_id
        res.send(eventController.deleteEventTextColor(events_id, color_id))
    } catch(err) {
        res.send(err.message)
    }
});

apiRoutes.post("/calendar/event/logocolor", VerifyToken, async function (req, res, next) {
    try {
        let color_id = req.body.color_id
        let events_id = req.body.events_id
        res.send(eventController.createEventLogoColor(events_id, color_id))
    } catch(err) {
        res.send(err.message)
    }
});

apiRoutes.delete("/calendar/event/logocolor", VerifyToken, async function (req, res, next) {
    try {
        let color_id = req.body.color_id
        let events_id = req.body.events_id
        res.send(eventController.deleteEventLogoColor(events_id, color_id))
    } catch(err) {
        res.send(err.message)
    }
});

apiRoutes.post("/calendar/event/image", VerifyToken, async function (req, res, next) {
    try {
        let images_id = req.body.images_id
        let events_id = req.body.events_id
        res.send(eventController.createEventImage(events_id, images_id))
    } catch(err) {
        res.send(err.message)
    }
});

apiRoutes.delete("/calendar/event/image", VerifyToken, async function (req, res, next) {
    try {
        let images_id = req.body.images_id
        let events_id = req.body.events_id
        res.send(eventController.deleteEventImage(events_id, images_id))
    } catch(err) {
        res.send(err.message)
    }
});

apiRoutes.post("/calendar/event/imageoverlay", VerifyToken, async function (req, res, next) {
    try {
        let enabled = req.body.enabled
        let events_id = req.body.events_id
        res.send(eventController.createEventImageOverlay(events_id, enabled))
    } catch(err) {
        res.send(err.message)
    }
});

apiRoutes.delete("/calendar/event/imageoverlay", VerifyToken, async function (req, res, next) {
    try {
        let enabled = req.body.enabled
        let events_id = req.body.events_id
        res.send(eventController.deleteEventImageOverlay(events_id, enabled))
    } catch(err) {
        res.send(err.message)
    }
});

apiRoutes.post("/calendar/event/imageoverlayopacity", VerifyToken, async function (req, res, next) {
    try {
        let opacity = req.body.opacity
        let events_id = req.body.events_id
        res.send(eventController.createEventImageOverlayOpacity(events_id, opacity))
    } catch(err) {
        res.send(err.message)
    }
});

apiRoutes.post("/calendar/event/imageheader", VerifyToken, async function (req, res, next) {
    try {
        let events_id = req.body.events_id
        res.send(eventController.createEventImageHeader(events_id))
    } catch(err) {
        res.send(err.message)
    }
});

apiRoutes.delete("/calendar/event/imageheader", VerifyToken, async function (req, res, next) {
    try {
        let events_id = req.body.events_id
        res.send(eventController.deleteEventImageHeader(events_id))
    } catch(err) {
        res.send(err.message)
    }
});

apiRoutes.post("/calendar/event/sortfields", VerifyToken, async function (req, res, next) {
    try {
        res.send(await eventController.createEventFieldsOrder(req.body.fieldsOrder))
    } catch(err) {
        res.send(err.message)
    }
});

apiRoutes.post("/calendar/event/linepattern", VerifyToken, async function (req, res, next) {
    try {
        let events_id = req.body.events_id
        let linepattern_id = req.body.linepattern_id
        res.send(eventController.createEventLinePattern(events_id, linepattern_id))
    } catch(err) {
        res.send(err.message)
    }
});

apiRoutes.delete("/calendar/event/linepattern", VerifyToken, async function (req, res, next) {
    try {
        let events_id = req.body.events_id
        res.send(eventController.deleteEventLinePattern(events_id))
    } catch(err) {
        res.send(err.message)
    }
});

apiRoutes.post("/calendar/event/linepatternplacement", VerifyToken, async function (req, res, next) {
    try {
        let events_id = req.body.events_id
        let linepatternplacement_id = req.body.linepatternplacement_id
        res.send(eventController.createEventLinePatternPlacement(events_id, linepatternplacement_id))
    } catch(err) {
        res.send(err.message)
    }
});

apiRoutes.delete("/calendar/event/linepatternplacement", VerifyToken, async function (req, res, next) {
    try {
        let events_id = req.body.events_id
        res.send(eventController.deleteEventLinePatternPlacement(events_id))
    } catch(err) {
        res.send(err.message)
    }
});

apiRoutes.post("/calendar/event/linepatterncolor", VerifyToken, async function (req, res, next) {
    try {
        let color_id = req.body.color_id
        let events_id = req.body.events_id
        res.send(eventController.createEventLinePatternColor(events_id, color_id))
    } catch(err) {
        res.send(err.message)
    }
});

apiRoutes.delete("/calendar/event/linepatterncolor", VerifyToken, async function (req, res, next) {
    try {
        let color_id = req.body.color_id
        let events_id = req.body.events_id
        res.send(eventController.deleteEventLinePatternColor(events_id, color_id))
    } catch(err) {
        res.send(err.message)
    }
});

apiRoutes.get("/calendar/event/:id", async function (req, res, next) {
    try {
        let html_template = req.query.template || 'templates/smartsign_template.html'
        let format = req.query.format || ''
        let orientation = req.query.orientation || 'portrait'
        if (req.params.id) {
            let page = await eventController.generateCalendarPage(req, req.params.id, html_template, format, orientation );
            res.send(page)
        }
    } catch(err) {
        res.send(err.message)
    }
});

apiRoutes.get("/calendar/event/image/:id", eventController.getPublishedPageAsImage)

apiRoutes.post("/calendar/event/:id", VerifyToken, eventController.generatePublishedPageAsImage)

apiRoutes.get("/calendar/event/qrcode/:id", async function (req, res, next) {
    try {
        if (req.params.id) {
            let qrcode = await eventController.generateQrCode(req.params.id);
            res.send(qrcode)
            
        }
    } catch(err) {
        res.send(err.message)
    }
});

apiRoutes.get("/calendar/pdf/:id", async function (req, res, next) {
    try {
        if (req.params.id) {
            let pdf = await eventController.generatePdfPage(req.params.id, req.query.format, req.query.orientation);
            res.set({ 'Content-Type': 'application/pdf', 'Content-Length': pdf.length })
            res.send(pdf)
        }
    } catch(err) {
        res.send(err.message)
    }
});

apiRoutes.get("/calendar/image/:id", async function (req, res, next) {
    try {
        if (req.params.id) {
            let template = req.query.template || 'templates/smartsign_template.html'
            let format = req.query.format || 'screen'
            let orientation = req.query.orientation || 'portrait'
            let pageimage = await eventController.getPageAsImage(req.params.id, "", template, format, orientation);
            res.writeHead(200, {
                'Content-Type': 'image/png',
                'Content-Length': pageimage.length,
            });
            res.end(pageimage);
        }
    } catch(err) {
        res.send(err.message)
    }
});

apiRoutes.post("/calendar/published/slideshow", VerifyToken, async function (req, res, next) {
    try {
        let slideshow
        if (req.query.type == "html") {
            slideshow = await eventController.generatePublishedPages("html", req)
        }
        if (req.query.type == "images") {
            slideshow = await eventController.generatePublishedPages("images", req)
        }

        if (req.query.type == "all") {
            slideshow = await eventController.generatePublishedPages("all", req)
        }
        res.send(slideshow)
    } catch(err) {
        res.send(err.message)
    }
});

apiRoutes.get("/calendar/images", async function (req, res) {
    try {
        res.write(`<div style="display:flex;flex-direction:column;flex-wrap:wrap" id="images">`)

        //Hämta alla bilder
        let imagebank = await eventController.readImages()

        imagebank.forEach(image => {
            const content = fs.readFileSync(path.join(__dirname, process.env.IMAGEBANKPATH + '/' + image.fullpath))
            res.write(`<div style="margin-bottom:10px" class="card">
                            <div class="card-body">
                                <div style="display:flex;flex-direction:row;padding-bottom:10px">
                                    <div style="flex:1;display:flex;flex-direction:column">
                                        <label for="imageName_${image.id}">Namn</label>
                                        <input id="imageName_${image.id}" style="margin-bottom:10px" class="form-control" type="text" value="${image.name}"">
                                        <label for="image_${image.id}">Bild</label>
                                        <img id="image_${image.id}" style="flex:2;width:100%" src="data:image/jpeg;base64,`)
                                        res.write(Buffer.from(content).toString('base64'));
                                        res.write('"/>');
                        res.write(`</div>
                                    <div style="flex:1;display:flex;flex-direction:column;justify-content: flex-end;">
                                        <div style="display:flex;justify-content: flex-end;">
                                            <button id="updateImage_${image.id}" onclick="updateImage('${image.id}', 'imageName_${image.id}');" type="button" class="btn btn-primary" style="margin-right:10px">
                                                Spara
                                            </button>
                                            <button id="deleteImage_${image.id}" onclick="deleteImage('${image.id}');" type="button" class="btn btn-primary">
                                                Ta bort
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>`)
        });
        res.write(`</div>`)
        res.end();
    } catch(err) {
        res.write(err.message + `</div>`)
        res.end();
    }
});

apiRoutes.put("/calendar/images/:id", VerifyToken, async function (req, res, next) {
    try {
        res.send(eventController.updateImage(req.params.id, req.body.name ))
    } catch(err) {
        res.send(err.message)
    }
});

apiRoutes.delete("/calendar/images/:id", VerifyToken, async function (req, res, next) {
    try {
        res.send(eventController.deleteImage(req.params.id))
    } catch(err) {
        res.send(err.message)
    }
});

apiRoutes.post("/calendar/uploadfile", async function (req, res) {
    try {
        let targetFile = req.files.imgFile;
        let imagename = req.body.imagename

        var allowedMimes = ['image/jpeg', 'image/png'];
        if (allowedMimes.includes(targetFile.mimetype)) {
        } else {
            return res.status(400).send('File type not allowed');
        }
        let randomfilename = randomUUID() + path.extname(targetFile.name)
        let imagePath = path.join(__dirname, process.env.IMAGEBANKPATH+ '/' + randomfilename)
        let fullpath = path.join(randomfilename)
        targetFile.mv(imagePath, async (err) => {
            if (err)
                return res.status(500).send(err);
            let create = await eventController.createImage(fullpath, imagename, targetFile.size, targetFile.mimetype)
            return res.send({ status: "success", path: imagePath });
        });
    } catch(err) {
        res.send(err.message)
    }
});

apiRoutes.get("/qrcode/:eventid", async function (req, res) {
    try {
        if (req.params.eventid) {
            //Hämta event
            let event = await eventController.readEventId(req.params.eventid)

            //Spara info
            eventController.createQrcodetracking(req.params.eventid, event[0].guid, req.headers["user-agent"]);

            //Skicka vidare
            res.redirect(event[0].guid);
        }
    } catch(err) {
        res.send(err.message)
    }
});

//Hämta inlagda generella QR-Koder och presentera i en modal datatable
apiRoutes.get("/qrcodes/general", async function (req, res) {
    try {
        res.write(`<div style="display:flex;flex-direction:column;flex-wrap:wrap" id="qrcodes">`)
        //Hämta alla qrkoder
        let qrcodes_general = await eventController.readQrCodesGeneral()
        let html = `<div style="margin-bottom:10px" class="card">
                        <div class="card-body">
                            <table id="QRCodeGeneraltable" class="table table-striped" style="width:100%">
                                <thead>
                                    <tr>
                                        <th>Id</th>
                                        <th>Url</th>
                                        <th>QR Kod</th>
                                        <th>Hantera</th>
                                        <th>Url</th>
                                    </tr>
                                </thead>
                                <tbody>`
                                qrcodes_general.forEach(row => {
                                    html += 
                                    `<tr>
                                        <td>${row.id}</td>
                                        <td><input class="form-control" type="text" id="row-${row.id}-url" name="row-${row.id}-url" value="${row.url}"> </td>
                                        <td>
                                            <button id="qrcodebtn_${row.id}" onclick="getQrCodeGeneral('${row.id}', '', this);" type="button" class="btn btn-primary" style="margin-right:10px" data-toggle="tooltip" title="Ladda ner QR-code i PNG-format" data-placement="top">
                                                Hämta QR Kod
                                            </button>
                                        </td>
                                        <td>
                                            <button id="updateQrCodeGeneral_${row.id}" onclick="updateQrCodeGeneral('${row.id}', 'row-${row.id}-url');" type="button" class="btn btn-success" style="margin-right:10px">
                                                Spara
                                            </button>
                                            <button id="deleteQrCodeGeneral_${row.id}" onclick="deleteQrCodeGeneral('${row.id}');" type="button" class="btn btn-danger">
                                                Ta bort
                                            </button>
                                        </td>
                                        <td>${row.url}</td>
                                    </tr>`
                                });
                                html +=  
                                `</tbody>
                                <tfoot>
                                    <tr>
                                        <th>Id</th>
                                        <th>Url</th>
                                        <th>QR Kod</th>
                                        <th>Hantera</th>
                                        <th>Url</th>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>`
        res.write(html);
        res.write(`</div>`);
        res.end();
    } catch(err) {
        res.send(err.message)
    }
});

//Skapa QR-code URL generell
apiRoutes.post("/qrcode/general", async function (req, res, next) {
    try {
        
        if (req.body.url) {
            let created_id = await eventController.createQrCodeGeneral(req.body.url);
            res.send(created_id.toString())
            
        } else {
            res.status(400).send("url missing")
        }
    } catch(err) {
        res.send(err.message)
    }
});

//Uppdatera QR-code URL generell
apiRoutes.put("/qrcode/general", async function (req, res, next) {
    try {
        
        if (req.body.id && req.body.url) {
            let result = await eventController.updateQrCodeGeneral(req.body.id, req.body.url);
            res.send(result)
            
        } else {
            res.status(400).send("parameters missing")
        }
    } catch(err) {
        res.send(err.message)
    }
});

//Ta bort QR-code URL generell
apiRoutes.delete("/qrcode/general", async function (req, res, next) {
    try {
        
        if (req.body.id) {
            let result = await eventController.deleteQrCodeGeneral(req.body.id);
            res.send(result)
            
        } else {
            res.status(400).send("id missing")
        }
    } catch(err) {
        res.send(err.message)
    }
});

//Returnera QR-code generell som png-bild
apiRoutes.get("/qrcode/general/generate/:id", async function (req, res, next) {
    try {
        if (req.params.id) {
            let qrcode = await eventController.generateQrCodeGeneral(req.params.id);
            const im = qrcode.split(",")[1];
            const img = Buffer.from(im, 'base64');

            res.writeHead(200, {
                'Content-Type': 'image/png',
                'Content-Length': img.length
            });
            
            res.end(img); 
        }
    } catch(err) {
        res.send(err.message)
    }
});

//Skicka vidare till rätt url från en QRCode-scanning och spara statistik
apiRoutes.get("/qrcode/general/:id", async function (req, res) {
    try {
        if (req.params.id) {
            //Hämta url
            let qrcode = await eventController.readQrCodeGeneral(req.params.id);

            //Spara info
            eventController.createQrcodetracking(0, qrcode[0].url, req.headers["user-agent"]);

            //Skicka vidare
            res.redirect(qrcode[0].url);
        }
    } catch(err) {
        res.send(err.message)
    }
});

//Hämta qrcodetrackingstatistik och presentera i modal datatable
apiRoutes.get("/qrcodetracking", async function (req, res) {
    try {
        res.write(`<div style="display:flex;flex-direction:column;flex-wrap:wrap" id="qrtrackingstats">`)

        //Hämta qrtrackingstatistik och presentera i en Data Table
        let qrtracking = await eventController.readQrcodetracking()  
        let html = `<div style="margin-bottom:10px" class="card">
                        <div class="card-body">
                            <div id="date-filter" style="width:300px">
                                <label for="start-date">Start Date:</label>
                                <input type="date" id="start-date">
                                <label for="end-date">End Date:</label>
                                <input type="date" id="end-date">
                            </div>
                            <table id="qrtrackingtable" class="table table-striped" style="width:100%">
                                <thead>
                                    <tr>
                                        <th>Eventid</th>
                                        <th>Url</th>
                                        <th>Nr of Scans</th>
                                    </tr>
                                </thead>
                                <tbody>`
                                qrtracking.forEach(row => {
                                //for(let i=0 ; i < 25 ; i++) {
                                    html += 
                                    `<tr>
                                        <td>${row.events_id}</td>
                                        <td>${row.url}</td>
                                        <td>${row.nrofscans}</td>
                                    </tr>`
                                });
                                html +=  
                                `</tbody>
                                <tfoot>
                                    <tr>
                                        <th>Eventid</th>
                                        <th>Url</th>
                                        <th>Nr of Scans</th>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>`
        res.write(html);
        res.write(`</div>`);
        res.end();
    } catch(err) {
        res.send(err.message)
    }
});

//Hämta alla qrcodetrackings och presentera i modal datatable
apiRoutes.get("/qrcodetracking/all", async function (req, res) {
    try {

        //Hämta qrtrackingstatistik och presentera i en Data Table
        let qrtracking = await eventController.readAllQrcodetracking()  

        res.write(`<div style="display:flex;flex-direction:column;flex-wrap:wrap" id="qrtrackingstats">`)
        let html = `<div style="margin-bottom:10px" class="card">
                        <div class="card-body">
                            <table id="qrtrackingtable" class="table table-striped" style="width:100%">
                                <thead>
                                    <tr>
                                        <th>Eventid</th>
                                        <th>Url</th>
                                        <th>Browser</th>
                                        <th>Scantime</th>
                                    </tr>
                                </thead>
                                <tbody>`
                                qrtracking.forEach(row => {
                                //for(let i=0 ; i < 25 ; i++) {
                                    html += 
                                    `<tr>
                                        <td>${row.events_id}</td>
                                        <td>${row.url}</td>
                                        <td>${row.browser}</td>
                                        <td>${row.scantime}</td>
                                    </tr>`
                                });
                                html +=  
                                `</tbody>
                                <tfoot>
                                    <tr>
                                    <th>Eventid</th>
                                    <th>Url</th>
                                    <th>Browser</th>
                                    <th>Scantime</th>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>`
        res.write(html);
        res.write(`</div>`);
        res.end();
    } catch(err) {
        res.send(err.message)
    }
});

//Hämta qrcodetrackingstatistik för period och presentera i modal datatable
apiRoutes.get("/qrcodetracking/:fromdate/:todate", async function (req, res) {
    try {
        res.write(`<div style="display:flex;flex-direction:column;flex-wrap:wrap" id="qrtrackingstats">`)

        //Hämta qrtrackingstatistik och presentera i en Data Table
        let qrtracking = await eventController.readQrcodetrackingByTimePeriod(req.params.fromdate, req.params.todate)

        let html = `<div style="margin-bottom:10px" class="card">
                        <div class="card-body">
                            <table id="qrtrackingtable" class="table table-striped" style="width:100%">
                                <thead>
                                    <tr>
                                        <th>Url</th>
                                        <th>First scan</th>
                                        <th>Last scan</th>
                                        <th>Nr of Scans</th>
                                    </tr>
                                </thead>
                                <tbody>`
                                qrtracking.forEach(row => {
                                    html += 
                                    `<tr>
                                        <td>${row.url}</td>
                                        <td>${row.first_scan.toLocaleDateString()}</td>
                                        <td>${row.last_scan.toLocaleDateString()}</td>
                                        <td>${row.nrofscans}</td>
                                    </tr>`
                                });
                                html +=  
                                `</tbody>
                                <tfoot>
                                    <tr>
                                    <th>Url</th>
                                    <th>First scan</th>
                                    <th>Last scan</th>
                                    <th>Nr of Scans</th>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>`
        res.write(html);
        res.write(`</div>`);
        res.end();
    } catch(err) {
        res.send(err.message)
    }
});

apiRoutes.get("/dailywifi", async function (req, res, next) {
    try {
        let lang = req.query.lang || 'en'
        let format = req.query.format || ''
        let page = await eventController.generateDailyWiFiPage(format, lang);
        res.send(page)
    } catch(err) {
        res.send(err.message)
    }
});

apiRoutes.get("/dailywifi/pdf", async function (req, res, next) {
    try {

        let pdf = await eventController.generatePdfPageDailyWifi(req.query.format);
        res.set({ 'Content-Type': 'application/pdf', 'Content-Length': pdf.length })
        res.send(pdf)

    } catch(err) {
        res.send(err.message)
    }
});

apiRoutes.get("/imas/realtime", eventController.getImasRealtime);

apiRoutes.get("/imas/smartsignpage", async function (req, res) {
    try {
        let kiosk
        req.query.kiosk == 'true' ? kiosk = true : kiosk = false;
        let serverurl
        req.query.internal == 'true' ? serverurl = process.env.SERVERLURL : serverurl = process.env.EXTERNALSERVERURL;
        res.render('imas', {smartsignconfig: {"kiosk" : kiosk, "serverurl" : serverurl, "lang": req.query.lang || 'sv'}});
    } catch(err) {
        res.send(err.message)
    }

});

apiRoutes.get("/imas/polopoly", async function (req, res) {
    try {
        let serverurl
        req.query.internal == 'true' ? serverurl = process.env.SERVERLURL : serverurl = process.env.EXTERNALSERVERURL;
        res.render('imaspolopoly', {smartsignconfig: {"serverurl" : serverurl, "lang": req.query.lang || 'sv', "nojquery" : req.query.nojquery, "start": req.query.start}});
    } catch(err) {
        res.send(err.message)
    }

});

apiRoutes.get("/imas/image", async function (req, res, next) {
    try {
        let pageimage = await eventController.getImasAsImage();
        res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': pageimage.length,
        });
        res.end(pageimage);
    } catch(err) {
        res.send(err.message)
    }
});

apiRoutes.get("/grb/image", async function (req, res, next) {
    try {
        let pageimage = await eventController.getGrbAsImage();
        res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': pageimage.length,
        });
        res.end(pageimage);
    } catch(err) {
        res.send(err.message)
    }
});

apiRoutes.get("/timeedit/image", async function (req, res, next) {
    try {
        let pageimage = await eventController.getTimeeditAsImage();
        res.writeHead(200, {
            'Content-Type': 'image/png',
            'Content-Length': pageimage.length,
        });
        res.end(pageimage);
    } catch(err) {
        res.send(err.message)
    }
});

apiRoutes.get("/grb/smartsignpage", async function (req, res) {
    try {
        let kiosk
        req.query.kiosk == 'true' ? kiosk = true : kiosk = false;
        res.render('grb', {smartsignconfig: {"kiosk" : kiosk}});
    } catch(err) {
        res.send(err.message)
    }

});

apiRoutes.get("/timeedit/smartsignpage", async function (req, res) {
    try {
        let kiosk
        req.query.kiosk == 'true' ? kiosk = true : kiosk = false;
        res.render('timeedit', {smartsignconfig: {"kiosk" : kiosk}});
    } catch(err) {
        res.send(err.message)
    }

});

apiRoutes.get("/outlook/calendaritems/emailaddress/:emailaddress", eventController.getExchangeCalendarItems);

app.use(process.env.APIROUTESPATH, apiRoutes);

const server = app.listen(process.env.PORT || 3002, function () {
    const port = server.address().port;
    console.log("App now running on port", port);
});

const io = socketIo(server, {path: process.env.SOCKETIOPATH})

const sockets = {}

io.on("connection", (socket) => {
    socket.on("connectInit", (sessionId) => {
        sockets[sessionId] = socket.id
        app.set("sockets", sockets)
    })
})

app.set("io", io)

