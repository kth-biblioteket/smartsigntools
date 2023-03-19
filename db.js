require('dotenv').config()

/**
 * MySQL
 * 
 */
const mysql = require('mysql');

const db = mysql.createPool({
    connectionLimit: 100,
    host: process.env.DATABASEHOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    debug: false
});

/**
 * SQLite
 * 
 */

/*
const sqlite3 = require('sqlite3');
const path = require('path');

const dbFilePath = path.join(__dirname, "db", "smartsign.db");

const db = new sqlite3.Database(dbFilePath, (err) => {
    if (err) {
        console.log('Could not connect to database', err)
    } else {
        console.log('Connected to database')
    }
});
*/

module.exports = { db, mysql }