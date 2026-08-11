const STATUS_CONFIG = CONFIG.mapconfig.statusConfig;

const DEFAULT_COLOR = CONFIG.mapconfig.defaultColor || "#cccccc";

const SVG_NS = "http://www.w3.org/2000/svg";

const urlParams = new URLSearchParams(window.location.search);

// CONFIG för API-anrop och timeouts
const API_CONFIG = {
    UPDATE_INTERVAL_MS: 300000,  // 5 minuter
    REQUEST_TIMEOUT_MS: 10000,   // 10 sekunder
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 2000,
    SVG_LOAD_TIMEOUT_MS: 10000   // 10 sekunder per SVG
};

const shouldGetStatus = urlParams.get('bookingstatus') !== 'false';
const bookingystemapiserverurl = CONFIG.bookingystemapiserverurl

document.addEventListener("DOMContentLoaded", async function () {
    try {
        await loadAndSetupMaps();

        if (shouldGetStatus) {
            getRoomAvailability();
            setInterval(getRoomAvailability, API_CONFIG.UPDATE_INTERVAL_MS);
        } else {
            renderInitialUI([]);
        }
    } catch (err) {
        console.error("[INIT ERROR]", {
            message: err.message,
            timestamp: new Date().toISOString()
        });
        showErrorMessage("Kunde inte initiera applikationen:");
    }
});

/**
 * HÄMTA DATA FRÅN API - Med retry-logik och timeout
 */
async function getRoomAvailability(retryCount = 0) {
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
        // AbortController för timeout-skydd
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.REQUEST_TIMEOUT_MS);

        const response = await fetch(apiUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`API returned status ${response.status}`);
        }
        
        const data = await response.json();
        if (!Array.isArray(data)) {
            throw new Error('Invalid API response format');
        }

        const roomsFiltered = data.filter(room => room.disabled !== 1);
        renderInitialUI(roomsFiltered);
        
    } catch (err) {
        console.error(`[API ERROR] Attempt ${retryCount + 1}/${API_CONFIG.MAX_RETRIES}`, {
            message: err.message,
            url: apiUrl,
            timestamp: new Date().toISOString()
        });

        // Retry-logik
        if (retryCount < API_CONFIG.MAX_RETRIES - 1) {
            console.log(`[RETRY] Retrying in ${API_CONFIG.RETRY_DELAY_MS}ms...`);
            setTimeout(() => getRoomAvailability(retryCount + 1), API_CONFIG.RETRY_DELAY_MS);
        } else {
            // Efter alla retry-försök misslyckades
            console.error("[CRITICAL] All retry attempts failed");
            showErrorMessage(`Unable to load room availability: ${err.message}`);
            renderInitialUI([]);
        }
    }
}

/**
 * Visa felmeddelande till användare
 */
function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-banner';
    errorDiv.innerHTML = `
        <div style="padding: 15px; background-color: #f8d7da; border: 1px solid #f5c6cb; 
                    border-radius: 4px; color: #721c24; font-weight: 500;">
            ${message}
        </div>`;
    
    const appContent = document.getElementById("App-content");
    if (appContent) {
        appContent.innerHTML = '';
        appContent.appendChild(errorDiv);
    }
    
    // Automatisk borttagning efter 8 sekunder
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 8000);
}

/**
 * Ladda SVG-filer med timeout och graceful fallback
 */
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
        // Parallell SVG-laddning med timeout-skydd för varje floor
        const svgRequests = CONFIG.mapconfig.floors.map((floor, index) => 
            Promise.race([
                fetch(floor.svgUrl).then(r => {
                    if (!r.ok) throw new Error(`HTTP ${r.status}`);
                    return r.text();
                }),
                new Promise((_, reject) => 
                    setTimeout(() => {
                        reject(new Error(`Timeout loading ${floor.id}`));
                    }, API_CONFIG.SVG_LOAD_TIMEOUT_MS)
                )
            ]).catch(err => {
                console.error(`[SVG LOAD ERROR] Floor: ${floor.id}`, {
                    message: err.message,
                    url: floor.svgUrl,
                    timestamp: new Date().toISOString()
                });
                // Graceful fallback: returna placeholder SVG
                return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                    <rect width="100" height="100" fill="#f0f0f0"/>
                    <text x="50" y="50" text-anchor="middle" dy=".3em" fill="#999" font-size="12">
                        Failed to load floor plan
                    </text>
                </svg>`;
            })
        );
        
        const svgs = await Promise.all(svgRequests);

        CONFIG.mapconfig.floors.forEach((floor, i) => {
            const container = document.getElementById(`${floor.id}Container`);
            if (container) {
                container.innerHTML = svgs[i];
            }
        });
        
    } catch (err) {
        console.error("[CRITICAL SVG ERROR]", {
            message: err.message,
            timestamp: new Date().toISOString()
        });
        showErrorMessage("Failed to load floor maps. Please refresh the page.");
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
    const targetGroup = svgElement.getElementById('workspacesFrontGroup') || svgElement;
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