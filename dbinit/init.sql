CREATE TABLE IF NOT EXISTS events (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
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
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(30) NOT NULL,
    description VARCHAR(200) NULL,
    CONSTRAINT constraint_type UNIQUE (type)
);

CREATE TABLE IF NOT EXISTS eventfields (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    events_id INT NOT NULL,
    fields_id INT NOT NULL,
    CONSTRAINT constraint_fields UNIQUE (events_id, fields_id)
);

CREATE TABLE IF NOT EXISTS images(
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    fullpath VARCHAR(300),
    name CHAR(50),
    size CHAR(50),
    type CHAR(50)
);

CREATE TABLE IF NOT EXISTS eventimage (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    events_id INT NOT NULL,
    images_id INT NOT NULL,
    CONSTRAINT constraint_fields UNIQUE (events_id)
);

CREATE TABLE IF NOT EXISTS qrcodetracking (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    events_id INT NOT NULL,
    url VARCHAR(500) NOT NULL,
    browser VARCHAR(500) NOT NULL,
    scantime TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS qrcodegeneral (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    url VARCHAR(500) NOT NULL
);

CREATE TABLE IF NOT EXISTS `dailywifi` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `code` varchar(20) NOT NULL,
  `daynumber` int NOT NULL,
  `code_date` date NOT NULL
);

/* Nya tabeller 2023-09-11 (Ny grafisk profil etc) */

CREATE TABLE IF NOT EXISTS colors (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name varchar(25) NOT NULL,
  description varchar(100) NOT NULL,
  code varchar(50) NOT NULL,
  sortorder int NOT NULL
);

INSERT INTO `colors` (`id`, `name`, `description`, `code`, `sortorder`) VALUES
(1, 'Vit', 'Vit', 'FFFFFF', 10),
(2, 'Sand', 'Warm Grey 1C', 'EBE5E0', 30),
(3, 'KTH-blå', '7686 C', '004791', 40),
(4, 'Himmelsblå', '2755 C', '6298D2', 50),
(5, 'Marinblå', 'Marinblå', '000061', 60),
(6, 'Ljusblå', '2707', 'DEF0FF', 70),
(7, 'Digitalblå', 'Den här färgen är inte möjlig att \r\ntrycka. Använd KTH-blå vid tryck.', '0029ED', 80),
(8, 'Svart', 'Svart', '000000', 20);

CREATE TABLE IF NOT EXISTS linepatternplacements (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name varchar(50) NOT NULL,
  description varchar(200) NOT NULL,
  code varchar(10) NOT NULL
);

INSERT INTO `linepatternplacements` (`id`, `name`, `description`, `code`) VALUES
(1, 'Längst ner till höger', 'Längst ner till höger', 'br'),
(2, 'Längst upp till vänster', 'Längst upp till vänster', 'tl');

CREATE TABLE IF NOT EXISTS linepatterns (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name varchar(50) NOT NULL,
  description varchar(200) NOT NULL,
  code varchar(10) NOT NULL
);

INSERT INTO `linepatterns` (`id`, `name`, `description`, `code`) VALUES
(1, 'Ett', 'Ett', '1'),
(2, 'Två', 'Två', '2'),
(3, 'Tre', 'Tre', '3'),
(4, 'Fyra', 'Fyra', '4');

CREATE TABLE IF NOT EXISTS eventbgcolor (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id int NOT NULL,
  color_id int NOT NULL
);

CREATE TABLE IF NOT EXISTS eventfieldsorder (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id int NOT NULL,
  field_id int NOT NULL,
  sortorder int NOT NULL
);

CREATE TABLE IF NOT EXISTS eventimageheader (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id int NOT NULL
);

CREATE TABLE IF NOT EXISTS eventimageoverlay (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id int NOT NULL,
  enabled tinyint(1) NOT NULL
);

CREATE TABLE IF NOT EXISTS eventimageoverlayopacity (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id int(11) NOT NULL,
  opacity decimal(5,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS eventlinepattern (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id int NOT NULL,
  linepattern_id int NOT NULL
);

CREATE TABLE IF NOT EXISTS eventlinepatterncolor (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id int NOT NULL,
  color_id int NOT NULL
);

CREATE TABLE IF NOT EXISTS eventlinepatternplacement (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id int NOT NULL,
  linepatternplacement_id int NOT NULL
);

CREATE TABLE IF NOT EXISTS eventtextcolor (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id int NOT NULL,
  color_id int NOT NULL
);

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
