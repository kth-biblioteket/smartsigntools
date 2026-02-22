const getUrlVars = () => Object.fromEntries(new URLSearchParams(window.location.search));

const gaugePlugin = {
    id: 'gaugePlugin',
    afterDatasetsDraw(chart) {
        const { ctx, data } = chart;
        const meta = chart.getDatasetMeta(0);
        if (!meta.data[0]) return;

        const x = meta.data[0].x;
        const y = meta.data[0].y;
        const outerRadius = meta.data[0].outerRadius;
        const innerRadius = meta.data[0].innerRadius;
        const needleValue = data.datasets[0].needleValue;
        const arcCenterOffset = (outerRadius - innerRadius) / 2;

        ctx.save();
        // Nål
        const angle = Math.PI + (Math.PI * (needleValue / 100));
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(innerRadius, -(outerRadius * 0.07));
        ctx.lineTo(outerRadius + 5, 0);
        ctx.lineTo(innerRadius, (outerRadius * 0.07));
        ctx.fillStyle = '#000';
        ctx.fill();
        ctx.restore();

        // Procenttext
        ctx.save();
        ctx.translate(x, y);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const fontSize = Math.round(outerRadius * 0.35);
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.fillText(needleValue + '%', 0, -(outerRadius * 0.15)); 

        // 0 och 100 - Centrerade under bågens mittpunkt
        const labelSize = Math.round(outerRadius * 0.15);
        ctx.font = `bold ${labelSize}px sans-serif`;
        ctx.fillStyle = '#999';
        
        // Vänster (0)
        ctx.fillText('0', -outerRadius + arcCenterOffset, 30);
        // Höger (100)
        ctx.fillText('100', outerRadius - arcCenterOffset, 30);
        ctx.restore();
    }
};

async function getVisitors() {
    const url = `http://localhost:96/smartsigntools/api/v1/imas/realtime`;
    const sites = [
        ['gaugeHB', 'Hela Biblioteket', 'Hela biblioteket', 'KTH Library', 200, 'gauge-header-large'],
        ['gaugeSOG', 'Sydöstra Galleriet', 'Sydöstra galleriet', 'South-East Gallery', 30, 'gauge-header-medium'],
        ['gaugeNG', 'Norra Galleriet', 'Norra galleriet', 'North Gallery', 50, 'gauge-header-medium'],
        ['gaugeSG', 'Södra Galleriet', 'Södra galleriet', 'South Gallery', 20, 'gauge-header-medium'],
        ['gaugeANGDOMEN', 'Ångdomen', 'Ångdomen', 'Ångdomen', 40, 'gauge-header-medium'],
        ['gaugeOM', 'Newton', 'Newton', 'Newton', 15, 'gauge-header-medium']
    ];
    try {
        const res = await fetch(url);
        const data = await res.json();
        sites.forEach(s => renderChart(data.data, ...s));
    } catch (e) { sites.forEach(s => renderChart(null, ...s)); }
}

function renderChart(response, id, sitename, sv, en, max, cssClass) {
    const container = document.getElementById('just' + id);
    if (!container) return;
    const wrapper = container.closest('.gauge-unit');
    if (wrapper) wrapper.className = 'gauge-unit ' + cssClass;
    const header = document.getElementById(id + 'header');
    if (header) header.innerHTML = document.documentElement.lang.includes('en') ? en : sv;

    let val = 0;
    if (response?.zones) {
        const zone = response.zones.find(z => z.name === sitename);
        val = Math.min(Math.round(((zone?.inside || 0) / (zone?.threshold || max)) * 100), 100);
    }
    let color = (val >= 95) ? '#d3554f' : (val >= 75) ? '#ecec56' : '#55a64b';

    container.innerHTML = `<canvas id="ctx-${id}"></canvas>`;
    new Chart(document.getElementById(`ctx-${id}`), {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [val, 100 - val],
                backgroundColor: [color, '#eeeeee'], 
                needleValue: val,
                borderWidth: 0,
                cutout: '62%',
                circumference: 180,
                rotation: 270,
            }]
        },
        options: {
            animation: false,
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { bottom: id.includes('HB') ? 80 : 40, top: 10, left: 30, right: 30 } },
            plugins: { legend: { display: false }, tooltip: { enabled: false } }
        },
        plugins: [gaugePlugin]
    });
}

window.addEventListener('load', () => setTimeout(getVisitors, 100));
setInterval(getVisitors, 120000);