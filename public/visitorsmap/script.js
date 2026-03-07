const STATUS_CONFIG = CONFIG.statusConfig;

const DEFAULT_COLOR = CONFIG.defaultColor || "#cccccc";

const urlParams = new URLSearchParams(window.location.search);

document.addEventListener("DOMContentLoaded", async function () {
    getVisitors();
    setInterval(getVisitors, 120000);
});

async function getVisitors() {
    const url = `/smartsigntools/api/v1/imas/realtime`;
    try {
        const res = await fetch(url);
        let realtime = await res.json();
        if (urlParams.debug == 'true') {
            realtime.location = "open";
            realtime.data = {
                "location": {
                    "name": "Huvudbiblioteket",
                    "inside": 46,
                    "threshold": 0,
                    "offlineDevices": true
                },
                "zones": [
                    {
                        "name": "Hela Biblioteket",
                        "inside": 398,
                        "threshold": 650,
                        "offlineDevices": true
                    },
                    {
                        "name": "Sydöstra Galleriet",
                        "inside": 60,
                        "threshold": 65,
                        "offlineDevices": true
                    },
                    {
                        "name": "Newton",
                        "inside": 5,
                        "threshold": 18,
                        "offlineDevices": true
                    },
                    {
                        "name": "Norra Galleriet",
                        "inside": 77,
                        "threshold": 80,
                        "offlineDevices": true
                    },
                    {
                        "name": "Ångdomen",
                        "inside": 9,
                        "threshold": 140,
                        "offlineDevices": true
                    },
                    {
                        "name": "Södra Galleriet",
                        "inside": 14,
                        "threshold": 35,
                        "offlineDevices": true
                    },
                    {
                        "name": "Test",
                        "inside": 108,
                        "threshold": 0,
                        "offlineDevices": true
                    }
                ]
            }
        }

        renderMap(realtime);
    } catch (e) {
        renderMap(null);
    }
}

function setOccupancyColor(locationId, element, svgDoc) {
    const location = svgDoc.getElementById(locationId);
    let colorclass = 'green';
    let over50 = '';

    let occupancyrate = 0;
    if (element.inside <= 0) {
        occupancyrate = 0;

    } else {
        occupancyrate = Math.round(100 * element.inside / element.threshold);
    }

    if (occupancyrate > 100) {
        occupancyrate = 100
    }
    //Ändra färg beroende på beläggning
    colorclass = '#55a64b';
    over50 = ''

    if (occupancyrate >= 75 && occupancyrate < 95) {
        colorclass = '#ecec56';
        over50 = 'over50'
    }
    if (occupancyrate > 95) {
        colorclass = '#d3554f';
        over50 = 'over50'
    }

    location.setAttribute("fill", colorclass);

    // --- TEXTLOGIK START ---
    // Skapa eller uppdatera textetikett
    const textId = "label-" + locationId;
    let textLabel = svgDoc.getElementById(textId);

    const bgRectId = "bg-" + locationId;
    let bgRect = svgDoc.getElementById(bgRectId);

    if (!bgRect) {
        bgRect = svgDoc.createElementNS("http://www.w3.org/2000/svg", "rect");
        bgRect.setAttribute("id", bgRectId);
        bgRect.setAttribute("fill", "rgba(255, 255, 255, 0.7)"); // Semitransparent vit
        bgRect.setAttribute("rx", "2"); // Rundade hörn
        bgRect.setAttribute("pointer-events", "none");
        location.parentNode.insertBefore(bgRect, textLabel); // Lägg bakom texten
    }

    if (!textLabel) {
        // Skapa ett nytt textelement om det inte finns
        textLabel = svgDoc.createElementNS("http://www.w3.org/2000/svg", "text");
        textLabel.setAttribute("id", textId);
        textLabel.setAttribute("font-family", "Arial, sans-serif");
        textLabel.setAttribute("font-weight", "bold");
        textLabel.setAttribute("font-size", "4px"); // Justera storlek efter din karts skala
        textLabel.setAttribute("text-anchor", "middle"); // Centrerar horisontellt
        textLabel.setAttribute("dominant-baseline", "central"); // Centrerar vertikalt
        textLabel.setAttribute("fill", "#000"); // Textfärg
        textLabel.setAttribute("pointer-events", "none"); // Gör så att texten inte stör klick/hovring

        textLabel.setAttribute("style", "paint-order: stroke; stroke: #ffffff; stroke-width: 1px; stroke-linejoin: round;");

        // Lägg till texten i samma grupp eller direkt efter ytan
        location.parentNode.appendChild(textLabel);
    }


    // Beräkna mitten av ytan med getBBox()
    const bbox = location.getBBox();

    // Vid uppdatering av position:
    /*    
    bgRect.setAttribute("x", bbox.x - 1);
    bgRect.setAttribute("y", bbox.y - 1);
    bgRect.setAttribute("width", bbox.width + 2);
    bgRect.setAttribute("height", bbox.height + 2);
    */

    const centerX = bbox.x + bbox.width / 2;
    const centerY = bbox.y + bbox.height / 2;

    // Positionera texten
    textLabel.setAttribute("x", centerX);
    textLabel.setAttribute("y", centerY);

    textLabel.setAttribute("transform", `rotate(-90, ${centerX}, ${centerY})`);

    //bgRect.setAttribute("transform", `rotate(-90, ${centerX}, ${centerY})`);

    // Sätt textinnehåll (t.ex. "75%")
    //textLabel.textContent = occupancyrate + "%";

    // Rensa tidigare innehåll
    textLabel.innerHTML = '';

    // Rad 1: Rumsnamn (Hämtas från element.name eller Pythagoras-data)
    const tspanName = svgDoc.createElementNS("http://www.w3.org/2000/svg", "tspan");
    tspanName.setAttribute("x", centerX);
    tspanName.setAttribute("dy", "-1.2em"); // Flytta upp första raden lite
    tspanName.textContent = element.name;
    textLabel.appendChild(tspanName);

    // Rad 2: Procent
    const tspanRate = svgDoc.createElementNS("http://www.w3.org/2000/svg", "tspan");
    tspanRate.setAttribute("x", centerX);
    tspanRate.setAttribute("dy", "1.4em"); // Radavstånd till nästa rad
    tspanRate.setAttribute("font-size", "1.2em"); // Gör procenten lite större om önskat
    tspanRate.textContent = occupancyrate + "%";
    textLabel.appendChild(tspanRate);

    // Rad 2: Antal
    const tspanCount = svgDoc.createElementNS("http://www.w3.org/2000/svg", "tspan");
    tspanCount.setAttribute("x", centerX);
    tspanCount.setAttribute("dy", "1.4em"); // Radavstånd till nästa rad
    tspanCount.setAttribute("font-size", "1.2em"); // Gör procenten lite större om önskat
    tspanCount.textContent = element.inside + '/' + element.threshold;
    textLabel.appendChild(tspanCount);
    // --- TEXTLOGIK SLUT ---
}

async function renderMap(response) {
    if (!response) return;
    if (response.location === "closed") {
        const appContent = document.querySelector(".App-content");
        appContent.classList.add("libraryclosed");

        const appContentMain = document.querySelector(".App-content .map-section");
        appContentMain.innerHTML = `<div class="libraryclosed">
                                        <h2>Library Closed / Biblioteket är stängt</h2>
                                    </div>`;
        return;
    } else {
        await loadAndSetupMaps();
        response.data.zones.forEach(element => {
            // Nu letar vi i hela dokumentet eftersom SVG:n är en del av det
            let roomId = "";
            switch (element.name) {
                case "Hela Biblioteket": roomId = "wsF4171"; break;
                case "Ångdomen": roomId = "wsF4205"; break;
                case "Newton": roomId = "wsF4182"; break;
                case "Norra Galleriet": roomId = "wsF4313"; break;
                case "Sydöstra Galleriet": roomId = "wsF4300"; break;
                case "Södra Galleriet": roomId = "wsF4286"; break;
            }

            if (roomId) {
                // Skicka 'document' som svgDoc eftersom allt nu ligger i samma DOM
                setOccupancyColor(roomId, element, document);
            }
        });
    }
}

setInterval(getVisitors, 120000);

/** --- KART-LADDNING (FETCH) --- **/
async function loadAndSetupMaps() {
    let html = '';

    // Generera containrar dynamiskt baserat på hur många våningar som finns i JSON
    CONFIG.mapconfig.floors.forEach((floor, index) => {
        html += `
                <div class="floor-plan">
                    <div id="${floor.id}Container" class="map-container">Laddar ${floor.label}...</div>
                    <div class="floor-label">${floor.label}</div>
                </div>`;
    });

    const mainElement = document.querySelector(".App-content .map-section");
    if (mainElement) {
        mainElement.innerHTML = html;
    }

    try {
        const svgRequests = CONFIG.mapconfig.floors.map(floor => fetch(floor.svgUrl).then(r => r.text()));
        const svgs = await Promise.all(svgRequests);

        CONFIG.mapconfig.floors.forEach((floor, i) => {
            document.getElementById(`${floor.id}Container`).innerHTML = svgs[i];
        });
    } catch (err) {
        console.error("Fel vid hämtning av SVG:er:", err);
    }
}

