const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs').promises;
const { optimize } = require('svgo');
const { db } = require('./db');
const { JSDOM } = require('jsdom'); // Lägg till överst

const initDb = require('./initDb');

initDb().then(() => {
    console.log("Databasen är initierad. Startar worker...");
}).catch(err => {
    console.error("Kunde inte starta applikationen pga databasfel.");
    process.exit(1); // Stäng ner containern om DB inte kan nås
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function syncAllFloors() {
    const floorConfig = process.env.FLOOR_IDS || "";
    const floorIds = floorConfig.split(',').map(id => id.trim()).filter(id => id !== "");

    if (floorIds.length === 0) return;

    const targetDir = '/app/imagebank/svg_cache';

    try {
        await fs.mkdir(targetDir, { recursive: true });

        for (const floorId of floorIds) {
            console.log(`Hämtar våning ${floorId}...`);

            try {
                const url = `${process.env.PYTHAGORAS_API_URL}floor/${floorId}/graphic?incWsComps=false&incFlComps=false&sWMulti=200`;
                const response = await axios.get(url, {
                    headers: { 'api_key': process.env.PYTHAGORAS_API_KEY_READ },
                    timeout: 30000
                });

                let svgContent = response.data;

                // 1. Tvätta strängen innan parsing
                svgContent = svgContent.replace(/&amp;amp;apos;/g, "'");
                svgContent = svgContent.replace(/'Dialog'/g, "'Arial';");

                const dom = new JSDOM(svgContent, { contentType: "image/svg+xml" });
                const document = dom.window.document;
                
                // Hitta elementen
                const svgTop = document.querySelector('svg'); // Roten
                const svgDrawing = document.querySelector('#svgDrawing');

                if (svgTop && svgDrawing) {
                    // --- FLATTEN & CENTER LOGIK ---
                    
                    // 1. Kopiera viewBox från inre till yttre (viktigt för centrering)
                    // Vi använder din önskade viewBox här
                    svgTop.setAttribute('viewBox', '-40 -60 80 120');
                    svgTop.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                    svgTop.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                    svgTop.setAttribute('id', 'svgTop');

                    // 2. Flytta innehållet från inre SVG till den yttre
                    // Vi lägger allt i DrawingGroup för att behålla rotationen
                    const drawingGroup = document.querySelector('#svgDrawingGroup');
                    if (drawingGroup) {
                        drawingGroup.setAttribute('transform', 'rotate(90 0 0)');
                        // Flytta gruppen så den ligger direkt under svgTop
                        svgTop.appendChild(drawingGroup);
                    }

                    // 3. Ta bort den nu onödiga inre SVG-taggen (Pythagoras "Paper space")
                    svgDrawing.remove();

                    // 4. Styla former
                    const shapes = svgTop.querySelectorAll('path, rect, polygon, circle');
                    shapes.forEach(el => {
                        el.removeAttribute('style');
                        el.setAttribute('fill', '#e9ecee');
                        el.setAttribute('stroke', '#000000');
                        el.setAttribute('stroke-width', '0.1');
                    });

                    // 5. Fixa text
                    const texts = svgTop.querySelectorAll('text');
                    texts.forEach(t => {
                        t.setAttribute('fill', '#000000');
                        t.style.fontFamily = 'Arial, sans-serif';
                    });

                    svgContent = dom.serialize();
                }

                // 2. Optimera
                const result = optimize(svgContent, {
                    multipass: true,
                    plugins: [
                        {
                            name: 'preset-default',
                            params: {
                                overrides: {
                                    minifyStyles: false,
                                    cleanupIds: false,
                                    removeViewBox: false,
                                    removeUnknownsAndDefaults: false,
                                },
                            },
                        },
                    ],
                });
                
                let finalSvg = result.data;

                // Tvinga in XLink om det behövs
                if (!finalSvg.includes('xmlns:xlink')) {
                    finalSvg = finalSvg.replace('<svg ', '<svg xmlns:xlink="http://www.w3.org/1999/xlink" ');
                }

                const fileName = `floor_${floorId}.svg`;
                await fs.writeFile(`${targetDir}/${fileName}`, finalSvg);

                const sql = `INSERT INTO floor_plans (floor_id, file_path) VALUES (?, ?) ON DUPLICATE KEY UPDATE last_updated = NOW()`;
                db.query(sql, [floorId, fileName], (err) => {
                    if (err) console.error(`DB-fel våning ${floorId}:`, err);
                });

                console.log(`Våning ${floorId} klar och centrerad.`);

            } catch (floorError) {
                console.error(`Fel vid våning ${floorId}:`, floorError);
            }
            await sleep(2000);
        }
    } catch (error) {
        console.error('Kritiskt fel i worker:', error.message);
    }
}

async function syncWagnerMap() {
    console.log("Worker: Startar synkronisering av Wagner 3D-karta...");
    const targetDir = '/app';
    const fileName = 'kth_map_3d.json';

    try {
        
        const response = await axios.post(process.env.WAGNERGUIDE_API_URL, {
            CustomerUrlSlug: "kth",
            MapUrlSlug: process.env.WAGNERGUIDE_MAP_URL_SLUG
        }, {
            timeout: 30000,
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.data) {
            console.log("Worker: Data mottagen från Wagner. Skriver till fil...");
            const finalPath = `${targetDir}/${fileName}`;
            const jsonString = JSON.stringify(response.data, null, 2);
            
            await fs.writeFile(finalPath, jsonString);
            
            console.log(`Worker: SUCCESS! Sparade Wagner-fil i ${finalPath}`);
        }
    } catch (error) {
        console.error("Worker: Fel vid hämtning av Wagner-karta:", error.message);
    }
}

cron.schedule('0 3 * * *', syncAllFloors);
syncAllFloors();

// Schema för Wagner (Varje timme)
cron.schedule('0 * * * *', syncWagnerMap);
syncWagnerMap();