CREATE TABLE IF NOT EXISTS events (
    id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    guid VARCHAR(200) NOT NULL,
    contentid VARCHAR(20) NOT NULL,
    eventtime DATETIME NOT NULL,
    pubstarttime DATETIME NOT NULL,
    pubendtime DATETIME NOT NULL,
    smartsignlink VARCHAR(200) NOT NULL,
    published TINYINT(1) NOT NULL,
    published_as_image TINYINT(1) NOT NULL,
    lang VARCHAR(10) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT constraint_guid UNIQUE (contentid)
);

CREATE TABLE IF NOT EXISTS fields (
    id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(30) NOT NULL,
    description VARCHAR(200) NULL,
    CONSTRAINT constraint_type UNIQUE (type)
);

CREATE TABLE IF NOT EXISTS eventfields (
    id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    events_id INT(6) NOT NULL,
    fields_id INT(6) NOT NULL,
    CONSTRAINT constraint_fields UNIQUE (events_id, fields_id)
);

CREATE TABLE IF NOT EXISTS images(
    id INT(6) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    fullpath VARCHAR(300),
    name CHAR(50),
    size CHAR(50),
    type CHAR(50)
);

CREATE TABLE IF NOT EXISTS eventimage (
    id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    events_id INT(6) NOT NULL,
    images_id INT(6) NOT NULL,
    CONSTRAINT constraint_fields UNIQUE (events_id)
);

CREATE TABLE IF NOT EXISTS qrcodetracking (
    id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    events_id int(6) NOT NULL,
    url VARCHAR(500) NOT NULL,
    browser VARCHAR(500) NOT NULL,
    scantime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS qrcodegeneral (
    id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    url VARCHAR(500) NOT NULL
);

CREATE TABLE IF NOT EXISTS `dailywifi` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `code` varchar(20) NOT NULL,
  `daynumber` int NOT NULL,
  `code_date` date NOT NULL
)

/*
INSERT INTO fields(type, name, description)
VALUES
('title','Titel','Rubriken från kalendern'),
('ingress','Ingress','Ingressen från kalendern'),
('time','Tid','Tiden för händelsen'),
('location','Plats','Platsen för händelsen'),
('language','Språk','Språket för händelsen'),
('lecturer','Föreläsare','Föreläsare för händelsen'),
('image','Bild','Bilden för händelsen(från polopoly)'),
('qrcode','QR-Kod','QR-kod med länk till händelsen'),
('typeofevent','Typ av event','Vad är det för typ av event');
*/
