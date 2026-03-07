const STATUS_CONFIG = CONFIG.mapconfig.statusConfig;

const DEFAULT_COLOR = CONFIG.mapconfig.defaultColor || "#cccccc";

const SVG_NS = "http://www.w3.org/2000/svg";

const urlParams = new URLSearchParams(window.location.search);

const shouldGetStatus = urlParams.get('bookingstatus') !== 'false';

const bookingystemapiserverurl = CONFIG.bookingystemapiserverurl

document.addEventListener("DOMContentLoaded", async function () {
    try {
        await loadAndSetupMaps();

        if (shouldGetStatus) {
            getRoomAvailability();
            // Uppdatera var 5:e minut
            setInterval(getRoomAvailability, 300000);
        } else {
            renderInitialUI([]);
        }
    } catch (err) {
        console.error("Kunde inte initiera applikationen:", err);
    }
});

/**
 * HÄMTA DATA FRÅN API
 */
async function getRoomAvailability() {
    const d = new Date();
    const currentHour = String(d.getHours()).padStart(2, '0');
    const nextHour = String(d.getHours() + 1).padStart(2, '0');

    const appContent = document.getElementById("App-content");
    if (appContent) {
        appContent.innerHTML = `<div class="mapstatustext">Status ${currentHour}:00 - ${nextHour}:00</div>`;
    }

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const apiUrl = `${bookingystemapiserverurl}v1/roomsavailability/grouprooms/1/${currentTimestamp}`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        const roomsFiltered = data.filter(room => room.disabled !== 1);
        renderInitialUI(roomsFiltered);
    } catch (err) {
        console.error("Kunde inte hämta rumsstatus:", err);
        renderInitialUI([]);
    }
}

async function loadAndSetupMaps() {
    let html = '';
    
    CONFIG.mapconfig.floors.forEach((floor, index) => {
        const isRight = index % 2 !== 0 ? 'floor-plan-right' : '';
        html += `
            <div class="floor-plan ${isRight}">
                <div id="${floor.id}Container" class="map-container">Laddar ${floor.label}...</div>
                <div class="floor-label">${floor.label}</div>
                ${index === 0 ? `
                <div class="booking-footer">
                    <div class="qr-container">
                        <img src="/smartsigntools/api/v1/qrcode/general/generate/${CONFIG.mapconfig.grouproomsqrcodeid}" class="qr-code">
                    </div>
                    <div class="booking-callout">
                        <div class="book-here-text">Book here</div>
                        <svg class="curved-arrow" viewBox="0 0 100 100">
                            <path d="M10,10 Q60,10 90,80" stroke="black" fill="none" stroke-width="5" stroke-linecap="round" />
                            <path d="M70,65 L90,80 L90,55" stroke="black" fill="none" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                    </div>
                </div>` : ''}
            </div>`;
    });
    
    const mapSection = document.getElementById("map-section");
    if (mapSection) mapSection.innerHTML = html;

    try {
        const svgRequests = CONFIG.mapconfig.floors.map(floor => fetch(floor.svgUrl).then(r => r.text()));
        const svgs = await Promise.all(svgRequests);

        CONFIG.mapconfig.floors.forEach((floor, i) => {
            const container = document.getElementById(`${floor.id}Container`);
            if (container) container.innerHTML = svgs[i];
        });
        
    } catch (err) {
        console.error("Fel vid hämtning av SVG:er:", err);
    }
}

function renderInitialUI(rooms) {
    updateMapColors(rooms);
}

function updateMapColors(rooms) {
    CONFIG.mapconfig.floors.forEach(floor => {
        const container = document.getElementById(`${floor.id}Container`);
        if (!container) return;

        floor.rooms.forEach(conf => {
            const el = container.querySelector("#" + conf.id);
            if (!el) return;

            const roomData = rooms.find(r => r.room_name === conf.number);
            let color;
            if (conf.dropin) {
                color = CONFIG.mapconfig.dropinColor;
            } else {
                const statusColor = CONFIG.mapconfig.statusConfig[roomData?.status]?.color;
                color = statusColor || CONFIG.mapconfig.defaultColor;
            }

            el.setAttribute("fill", color);
            
            if (conf.label && !container.querySelector("#label-" + conf.id)) {
                const svgElement = container.querySelector("svg");
                if (svgElement) {
                    addRoomLabel(el, conf, svgElement);
                }
            }
        });
    });
}

/**
 * SKAPA ETIKETTER I SVG
 */
function addRoomLabel(pathEl, conf, svgElement) {
    //const path = svgDoc.getElementById(conf.id);
    const targetGroup = svgElement.getElementById('workspacesFrontGroup') || svgElement;
    //if (!path || !targetGroup) return;

    //const bbox = path.getBBox();
    const bbox = pathEl.getBBox();
    const padding = 0.8;
    const offsetX = conf.offX || 0;
    const offsetY = conf.offY || 0;

    // Filter-hantering (endast en gång per SVG)
    if (conf.filter && !svgElement.getElementById('bg-highlight')) {
        let defs = svgElement.querySelector('defs');
        if (!defs) {
            defs = document.createElementNS(SVG_NS, 'defs');
            svgElement.insertBefore(defs, svgElement.firstChild);
        }
        
        const filter = document.createElementNS(SVG_NS, 'filter');
        filter.setAttribute('id', 'bg-highlight');
        filter.setAttribute('x', '-0.05'); // Lite marginal för bakgrunden
        filter.setAttribute('y', '-0.05');
        filter.setAttribute('width', '1.1');
        filter.setAttribute('height', '1.1');
        
        // feFlood skapar färgen, feMerge lägger texten ovanpå färgen
        filter.innerHTML = `
            <feFlood flood-color="#e9ecee" result="bg" />
            <feMerge>
                <feMergeNode in="bg" />
                <feMergeNode in="SourceGraphic" />
            </feMerge>`;
        defs.appendChild(filter);
    }

    let textX, textY, anchor, baseline;
    switch (conf.pos) {
        case 'right':
            textX = bbox.x + (bbox.width / 2) + offsetX;
            textY = bbox.y - padding + offsetY;
            anchor = "start"; baseline = "central";
            break;
        case 'left':
            textX = bbox.x + (bbox.width / 2) + offsetX;
            textY = bbox.y + bbox.height + padding + offsetY;
            anchor = "end"; baseline = "central";
            break;
        case 'top':
            textX = bbox.x - padding + offsetX;
            textY = bbox.y + (bbox.height / 2) + offsetY;
            anchor = "middle"; baseline = "text-top";
            break;
        case 'bottom':
            textX = bbox.x + bbox.width + padding + offsetX;
            textY = bbox.y + (bbox.height / 2) + offsetY;
            anchor = "middle"; baseline = "hanging";
            break;
        default:
            textX = bbox.x + (bbox.width / 2) + offsetX;
            textY = bbox.y - padding + offsetY;
            anchor = "start"; baseline = "central";
    }

    const newText = document.createElementNS(SVG_NS, "text");
    newText.setAttribute("id", "label-" + conf.id);
    newText.setAttribute("x", textX);
    newText.setAttribute("y", textY);
    newText.setAttribute("dominant-baseline", baseline);
    newText.setAttribute("text-anchor", anchor);
    newText.setAttribute("transform", `rotate(-90, ${textX}, ${textY})`);
    
    // Applicera filtret om conf.filter är true
    if (conf.filter) {
        newText.setAttribute("filter", "url(#bg-highlight)");
    }

    Object.assign(newText.style, {
        fontFamily: "Figtree, sans-serif",
        fontWeight: "700",
        fontSize: "3.68px",
        fill: "#000000",
        pointerEvents: "none"
    });

    newText.textContent = conf.label;
    targetGroup.appendChild(newText);
}

/**
 * BOX-VY (När map=false)
 */
function generateBoxes(rooms) {
    if (!rooms.length) return;
    
    let html = '<div style="display:flex; flex-wrap:wrap; width:100%;">';
    rooms.forEach(room => {
        const cssClass = CONFIG.mapconfig.statusConfig[room.status]?.cssClass || 'white';
        html += `<div class="${cssClass} Smartsign-item flex-container" style="width:31%; margin:1%;">
                    <div>${room.room_name}</div>
                 </div>`;
    });
    html += '</div>';
    const grouprooms = document.getElementById("grouprooms");
    if (grouprooms) grouprooms.innerHTML = html;
}