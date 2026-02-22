async function changeFloor(floorId) {
    if (!floorId) return;

    const container = document.getElementById('map-container');
    container.innerHTML = "Laddar ritning...";

    const response = await fetch(`/smartsigntools/api/v1/floorsvg/${floorId}`);
    
    // Injektera SVG
    container.innerHTML = await response.text();

    // Hitta alla rums-element i den nyss injicerade SVG:n
    const svgEl = container.querySelector('svg');

    const svgTop = container.querySelector('#svgTop');
    //rotateSvgCorrectly(svgEl);
    
    // Gå igenom all beläggningsdata vi fick från API:et
    Object.entries(data.occupancy).forEach(([roomId, status]) => {
        const roomElement = svgEl.getElementById(roomId);
        
        if (roomElement) {
            // Lägg till rätt CSS-klass baserat på status
            roomElement.classList.add(`room-status-${status}`);
            
            // Gör rummet klickbart
            roomElement.onclick = () => showRoomInfo(roomId, status);
        }
    });
}

function showRoomInfo(id, status) {
    alert(`Rum: ${id}\nStatus: ${status}`);
}