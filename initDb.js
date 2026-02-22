const { db } = require('./db');

const initDb = () => {
    return new Promise((resolve, reject) => {
        // En lista på alla tabeller du behöver
        const queries = [
            // Din nya tabell för planritningar
            `CREATE TABLE IF NOT EXISTS floor_plans (
                floor_id VARCHAR(50) PRIMARY KEY,
                file_path VARCHAR(255) NOT NULL,
                last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );`,

            
            // Lägg till fler tabeller här efter behov...
        ];

        // Kör frågorna efter varandra
        let completed = 0;
        queries.forEach(sql => {
            db.query(sql, (err) => {
                if (err) {
                    console.error("Fel vid initiering av databas-tabell:", err);
                    return reject(err);
                }
                completed++;
                if (completed === queries.length) {
                    console.log("✅ Alla databastabeller är verifierade/skapade.");
                    resolve();
                }
            });
        });
    });
};

module.exports = initDb;