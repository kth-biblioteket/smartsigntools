const database = require('./db');

//Hämta alla Events
const readEvents = () => {
    return new Promise(function (resolve, reject) {
        const sql = `SELECT * FROM events
                     ORDER BY eventtime`;
        database.db.query(database.mysql.format(sql,[]),(err, result) => {
            if(err) {
                console.error(err);
                reject(err.message)
            }
            resolve(result);
        });
    })
};

//Hämta alla Events efter angivet datum
const readEventsByDate = (eventtime) => {
    return new Promise(function (resolve, reject) {
        const sql = `SELECT * FROM events
                     WHERE eventtime > ?
                    ORDER BY eventtime`;
        database.db.query(database.mysql.format(sql,[eventtime]),(err, result) => {
            if(err) {
                console.error(err);
                reject(err.message)
            }
            resolve(result);
        });
    })
};

//Hämta alla Events med paginering
const readEventsPaginated = (page, limit) => {
    return new Promise(function (resolve, reject) {
        limit = parseInt(limit)
        let offset = (limit * page) - limit;
        const sql = `SELECT * FROM events
                    WHERE eventtime > now()
                    ORDER BY eventtime
                    LIMIT ? OFFSET ?`;
        database.db.query(database.mysql.format(sql,[limit, offset]),(err, result) => {
            if(err) {
                console.error(err);
                reject(err.message)
            }
            resolve(result);
        });
    })
};

//Hämta alla som är publicerade med datum > nu 
const readAllPublished = () => {
    return new Promise(function (resolve, reject) {
        const sql = `SELECT * FROM events 
                    WHERE published = 1 AND eventtime > now()
                    ORDER BY eventtime`;
        database.db.query(database.mysql.format(sql,[]),(err, result) => {
            if(err) {
                console.error(err);
                reject(err.message)
            }
            resolve(result);
        });
    })
};

//Hämta ett event GUID
const readEventGuid = (guid) => {
    return new Promise(function (resolve, reject) {
        const sql = `SELECT * FROM events 
                WHERE guid = ?`;
        database.db.query(database.mysql.format(sql,[guid]),(err, result) => {
            if(err) {
                console.error(err);
                reject(err.message)
            }
            resolve(result);
        });
    })

};

//Hämta ett event contentid
const readEventContentid = (contentid) => {
    return new Promise(function (resolve, reject) {
        const sql = `SELECT * FROM events 
                WHERE contentid = ?`;
        database.db.query(database.mysql.format(sql,[contentid]),(err, result) => {
            if(err) {
                console.error(err);
                reject(err.message)
            }
            resolve(result);
        });
    })

};

//Hämta ett event ID
const readEventId = (id) => {
    return new Promise(function (resolve, reject) {
        const sql = `SELECT * FROM events 
                    WHERE id = ?`;
        database.db.query(database.mysql.format(sql,[id]),(err, result) => {
            if(err) {
                console.error(err);
                reject(err.message)
            }
            resolve(result);
        });
    })
};

//Skapa ett event
const createEvent = (guid, contentid, eventtime, pubstarttime, pubendtime, smartsignlink, published, published_as_image, lang) => {
    return new Promise(function (resolve, reject) {

        const sql = `INSERT INTO events(guid, contentid, eventtime, pubstarttime, pubendtime, smartsignlink, published, published_as_image, lang)
                VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        database.db.query(database.mysql.format(sql,[guid, contentid, eventtime, pubstarttime, pubendtime, smartsignlink, published, published_as_image, lang]), async function(err, result) {
            if(err) {
                console.error(err);
                reject(err.message)
            } else {
                //Lägg till fält
                //Skriv om detta!!
                if(result.insertId != 0) {
                    await createEventField(result.insertId, 1)
                    await createEventField(result.insertId, 2)
                    await createEventField(result.insertId, 3)
                    await createEventField(result.insertId, 4)
                    await createEventField(result.insertId, 5)
                    await createEventField(result.insertId, 6)
                    await createEventField(result.insertId, 7)
                    await createEventField(result.insertId, 8)
                }

                const successMessage = "The event was entered successfully."
                resolve(result.insertId);
            }
        });
    })
};

//Uppdatera ett event
const updateEvent = (guid, contentid, eventtime, pubstarttime, pubendtime, smartsignlink, published, published_as_image, lang, id) => {
    return new Promise(function (resolve, reject) {

        const sql = `UPDATE events 
                SET guid = ?, contentid = ?, eventtime = ?, pubstarttime = ?, pubendtime = ?, smartsignlink = ?, published = ?, published_as_image = ?, lang= ? 
                WHERE id = ?`;
        database.db.query(database.mysql.format(sql,[guid, contentid, eventtime, pubstarttime, pubendtime, smartsignlink, published, published_as_image, lang, id]),(err, result) => {
            if(err) {
                console.error(err);
                reject(err.message)
            }
            const successMessage = "The event was successfully updated."
            resolve(successMessage);
        });
    })
};

//Radera ett event.
const deleteEvent = (guid) => {
    return new Promise(function (resolve, reject) {

        const sql = `DELETE FROM events 
                WHERE guid = ?`;
        database.db.query(database.mysql.format(sql,[guid]),(err, result) => {
            if(err) {
                console.error(err);
                reject(err.message)
            }
            const successMessage = "The event was successfully deleted."
            resolve(successMessage);
        });
    })
};

const updateEventLang = (lang, id) => {
    return new Promise(function (resolve, reject) {
        const sql = `UPDATE events 
                SET lang= ? 
                WHERE id = ?`;
        database.db.query(database.mysql.format(sql,[lang, id]),(err, result) => {
            if(err) {
                console.error(err);
                reject(err.message)
            }
            const successMessage = "The event was successfully updated."
            resolve(successMessage);
        });
    })
};

//Uppdatera ett event
const updateEventPublish = (id, published) => {
    return new Promise(function (resolve, reject) {
        const sql = `UPDATE events 
                SET published = ? 
                WHERE id = ?`;
        database.db.query(database.mysql.format(sql,[published, id]),(err, result) => {
            if(err) {
                console.error(err);
                reject(err.message)
            }
            const successMessage = "The event was successfully updated."
            resolve(successMessage);
        });
    })
};

//Publicera ett event som image
const updateEventPublishAsImage = (id, published_as_image) => {
    return new Promise(function (resolve, reject) {
        const sql = `UPDATE events 
                SET published_as_image = ? 
                WHERE id = ?`;
        database.db.query(database.mysql.format(sql,[published_as_image, id]),(err, result) => {
            if(err) {
                console.error(err);
                reject(err.message)
            }
            const successMessage = "The event was successfully updated."
            resolve(successMessage);
        });
    })
};

//Hämta fält för ett event
const readEventFields = (events_id) => {
    return new Promise(function (resolve, reject) {

        const sql = `SELECT fields.id, eventfields.events_id, fields.type, fields.name, fields.description FROM fields
        LEFT JOIN eventfields ON eventfields.fields_id = fields.id
        AND eventfields.events_id = ?`;
        database.db.query(database.mysql.format(sql,[events_id]),(err, result) => {
            if(err) {
                console.error(err);
                reject(err.message)
            }
            resolve(result);
        });
    })

};

//Lägg till ett events fält
const createEventField = (event_id, field_id) => {
    return new Promise(function (resolve, reject) {
        const sql = `INSERT INTO eventfields(events_id, fields_id)
                VALUES(?, ?)`;
        database.db.query(database.mysql.format(sql,[event_id, field_id]),(err, result) => {
            if(err) {
                console.error(err);
                reject(err.message)
            }
            const successMessage = "The field was successfully created."
            resolve(successMessage);
        });
    })
};

//Ta bort ett events fält
const deleteEventField = (event_id, field_id) => {
    return new Promise(function (resolve, reject) {
        const sql = `DELETE FROM eventfields
                    WHERE events_id = ? AND fields_id = ?`;
        database.db.query(database.mysql.format(sql,[event_id, field_id]),(err, result) => {
            if(err) {
                console.error(err);
                reject(err.message)
            }
            const successMessage = "The field was successfully deleted."
            resolve(successMessage);
        });
    })
};

//Hämta bild för event
const readEventImage = (events_id) => {
    return new Promise(function (resolve, reject) {

        const sql = `SELECT images.id, eventimage.events_id, images.type, images.name, images.size, images.fullpath
                    FROM eventimage
                    JOIN images ON eventimage.images_id = images.id
                    AND eventimage.events_id = ?`;
        database.db.query(database.mysql.format(sql,[events_id]),(err, result) => {
            if(err) {
                console.error(err);
                reject(err.message)
            }
            resolve(result);
        });
    })

};

//Lägg till ett events bild
const createEventImage = (event_id, image_id) => {
    return new Promise(function (resolve, reject) {
        const sql = `INSERT INTO eventimage(events_id, images_id)
                VALUES(?, ?)`;
        database.db.query(database.mysql.format(sql,[event_id, image_id]),(err, result) => {
            if(err) {
                console.error(err);
                reject(err.message)
            }
            const successMessage = "The image was successfully created."
            resolve(successMessage);
        });
    })
};

//Ta bort ett events fält
const deleteEventImage = (event_id) => {
    return new Promise(function (resolve, reject) {
        const sql = `DELETE FROM eventimage
                    WHERE events_id = ?`;
        database.db.query(database.mysql.format(sql,[event_id]),(err, result) => {
            if(err) {
                console.error(err);
                reject(err.message)
            }
            const successMessage = "The image was successfully deleted."
            resolve(successMessage);
        });
    })
};

//Hämta alla bilder i bildbanken
const readImages = () => {
    return new Promise(function (resolve, reject) {
        const sql = `SELECT * FROM images`;
        database.db.query(database.mysql.format(sql,[]),(err, result) => {
            if(err) {
                console.error(err);
                reject(err.message)
            }
            resolve(result);
        });
    })
};

//Hämta en bild från bildbanken
const readImage = (id) => {
    return new Promise(function (resolve, reject) {
        const sql = `SELECT * FROM images 
                    WHERE id = ?`;
        database.db.query(database.mysql.format(sql,[id]),(err, result) => {
            if(err) {
                console.error(err);
                reject(err.message)
            }
            resolve(result);
        });
    })
};

//Lägg till en bild i bildbanken
const createImage = (fullpath, name, size, type) => {
    return new Promise(function (resolve, reject) {
        const sql = `INSERT INTO images(fullpath, name, size, type)
                VALUES(?, ?, ?, ?)`;
        database.db.query(database.mysql.format(sql,[fullpath, name, size, type]),(err, result) => {
            if(err) {
                console.error(err);
                reject(err.message)
            }
            const successMessage = "The image was successfully created."
            resolve(successMessage);
        });
    })
};

//Uppdatera bild i bildbanken
const updateImage = (id, name) => {
    return new Promise(function (resolve, reject) {
        const sql = `UPDATE images
                    SET name = ?
                    WHERE id = ?`;
        database.db.query(database.mysql.format(sql,[name, id]),(err, result) => {
            if(err) {
                console.error(err);
                reject(err.message)
            }
            const successMessage = "The image was successfully updated."
            resolve(successMessage);
        });
    })
};

//Ta bort en bild ur bildbanken
const deleteImage = (id) => {
    return new Promise(function (resolve, reject) {
        const sql = `DELETE FROM images
                    WHERE id = ?`;
        database.db.query(database.mysql.format(sql,[id]),(err, result) => {
            if(err) {
                console.error(err);
                reject(err.message)
            }
            const successMessage = "The image was successfully deleted."
            resolve(successMessage);
        });
    })
};

//Hämta qrcodetracking statistik
const readQrcodetracking = (id) => {
    return new Promise(function (resolve, reject) {
        const sql = `SELECT events_id, url, count(*) as nrofscans FROM qrcodetracking 
                    GROUP BY events_id, url
                    ORDER BY nrofscans DESC`;
        database.db.query(database.mysql.format(sql),(err, result) => {
            if(err) {
                console.error(err);
                reject(err.message)
            }
            resolve(result);
        });
    })
};

//Lägg till qrcodetracking
const createQrcodetracking = (events_id, url, browser) => {
    return new Promise(function (resolve, reject) {
        const sql = `INSERT INTO qrcodetracking(events_id, url, browser)
                VALUES(?, ?, ?)`;
        database.db.query(database.mysql.format(sql,[events_id, url, browser]),(err, result) => {
            if(err) {
                console.error(err);
                reject(err.message)
            }
            const successMessage = "The qrcodetracking was saved"
            resolve(successMessage);
        });
    })
};

//Hämta alla qrcodes
const readQrCodesGeneral = () => {
    return new Promise(function (resolve, reject) {
        const sql = `SELECT * FROM qrcodegeneral`;
        database.db.query(database.mysql.format(sql,[]),(err, result) => {
            if(err) {
                console.error(err);
                reject(err.message)
            }
            resolve(result);
        });
    })
};

//Hämta en qrcode
const readQrCodeGeneral = (id) => {
    return new Promise(function (resolve, reject) {
        const sql = `SELECT * FROM qrcodegeneral 
                    WHERE id = ?`;
        database.db.query(database.mysql.format(sql,[id]),(err, result) => {
            if(err) {
                console.error(err);
                reject(err.message)
            }
            resolve(result);
        });
    })
};

//Lägg till qrcode
const createQrCodeGeneral = (url) => {
    return new Promise(function (resolve, reject) {
        const sql = `INSERT INTO qrcodegeneral(url)
                VALUES(?)`;
        database.db.query(database.mysql.format(sql,[url]),(err, result) => {
            if(err) {
                console.error(err);
                reject(err.message)
            }
            const successMessage = "The qrcodeurl was successfully created."
            resolve(result.insertId);
        });
    })
};

//Uppdatera qrcode generell
const updateQrCodeGeneral = (id, url) => {
    return new Promise(function (resolve, reject) {
        const sql = `UPDATE qrcodegeneral
                    SET url = ?
                    WHERE id = ?`;
        database.db.query(database.mysql.format(sql,[url, id]),(err, result) => {
            if(err) {
                console.error(err);
                reject(err.message)
            }
            const successMessage = "The qrcode was successfully updated."
            resolve(successMessage);
        });
    })
};

//Ta bort qrcode generell
const deleteQrCodeGeneral = (id) => {
    return new Promise(function (resolve, reject) {
        const sql = `DELETE FROM qrcodegeneral
                    WHERE id = ?`;
        database.db.query(database.mysql.format(sql,[id]),(err, result) => {
            if(err) {
                console.error(err);
                reject(err.message)
            }
            const successMessage = "The qrcode was successfully deleted."
            resolve(successMessage);
        });
    })
};


module.exports = {
    readEvents,
    readEventsByDate,
    readEventsPaginated,
    readAllPublished,
    readEventGuid,
    readEventContentid,
    readEventId,
    createEvent,
    updateEvent,
    deleteEvent,
    updateEventLang,
    updateEventPublish,
    updateEventPublishAsImage,
    readEventFields,
    createEventField,
    deleteEventField,
    readEventImage,
    createEventImage,
    deleteEventImage,
    readImages,
    readImage,
    createImage,
    updateImage,
    deleteImage,
    readQrcodetracking,
    createQrcodetracking,
    readQrCodesGeneral,
    readQrCodeGeneral,
    createQrCodeGeneral,
    updateQrCodeGeneral,
    deleteQrCodeGeneral
};