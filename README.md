# KTHB Smartsign
Skapa websidor att presentera på smartsign-skärmarna

## Funktioner
Startas i en Dockercontainer

###
Deploy via github actions som anropar en webhook
 
### Hämtar bl a bibliotekets kalender på webben 

#### Dependencies
sudo apt-get install chromium-browser

Node 16.13.2

##### Installation

1.  Skapa folder på server med namnet på repot: "/local/docker/smartsigntools"
2.  Skapa och anpassa docker-compose.yml i foldern
```
version: "3.6"

services:
  smartsigntools:
    container_name: "smartsigntools"
    image: ghcr.io/kth-biblioteket/smartsigntools:${REPO_TYPE}
    depends_on:
      - smartsigntools-db
    restart: "always"
    env_file:
      - ./smartsigntools.env
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.smartsigntools.rule=Host(`${DOMAIN_NAME}`) && PathPrefix(`${PATHPREFIX}`)"
      - "traefik.http.routers.smartsigntools.middlewares=smartsigntools-stripprefix"
      - "traefik.http.middlewares.smartsigntools-stripprefix.stripprefix.prefixes=${PATHPREFIX}"
      - "traefik.http.routers.smartsigntools.entrypoints=websecure"
      - "traefik.http.routers.smartsigntools.tls=true"
      - "traefik.http.routers.smartsigntools.tls.certresolver=myresolver"
    volumes:
      - "/local/docker/smartsigntools/imagebank:/app/imagebank"
      - "/local/docker/smartsigntools/publishedevents:/app/publishedevents"
    networks:
      - "apps-net"

  smartsigntools-db:
    container_name: smartsigntools-db
    image: mysql:8.0
    restart: unless-stopped
    command: --default-authentication-plugin=mysql_native_password
    environment:
      MYSQL_DATABASE: ${DB_DATABASE}
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASSWORD}
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
    volumes:
      - persistent-smartsigntools-db:/var/lib/mysql
      - ./dbinit:/docker-entrypoint-initdb.d
    networks:
      - "apps-net"

volumes:
  persistent-smartsigntools-db:

networks:
  apps-net:
    external: true
```
3.  Skapa och anpassa .env(för composefilen) i foldern
```
DATABASEHOST=smartsigntools-db
DB_DATABASE=smartsigntools
DB_USER=smartsigntools
DB_PASSWORD=xxxxxxxxx
DB_ROOT_PASSWORD=xxxxxxxxx
GITHUBTOKEN=xxxxxxxxxxxxxxxxxx
PATHPREFIX=/smartsign
DOMAIN_NAME=apps-ref.lib.kth.se
REPO_TYPE=ref
```
4.  Skapa och anpassa smartsigntools.env (för applikationen) i foldern
```
PORT=80
APIKEY=xxxxxxxxxxxxx
SECRET=xxxxxxxxxxxxxxx
LDAPAPIKEYREAD=xxxxxxxxxxxxxxxxxx
RSSFEED=https://apps.lib.kth.se/smartsign/calendar/calendar_feed.php
RSSFEED_SV=https://apps.lib.kth.se/smartsign/calendar/calendar_feed_sv.php
SMARTSIGNLINK=https://apps-ref.lib.kth.se/smartsign/api/v1/calendar/event/
QRCODELINK=https://apps-ref.lib.kth.se/smartsign/api/v1/qrcode/
SERVERURL=http://localhost/
APIROUTESPATH=/api/v1
SOCKETIOPATH=/api/v1/socket.io
DATABASEHOST=smartsigntools-db
DB_DATABASE=smartsigntools
DB_USER=smartsigntools
DB_PASSWORD=xxxxxxxx
DB_ROOT_PASSWORD=xxxxxxxx
NODE_ENV=development
IMAGE_FORMAT=jpg
AUTHORIZEDGROUPS=pa.anstallda.T.TR;pa.anstallda.M.MOE
IMAGEBANKPATH=imagebank
```
5.  Skapa folder "local/docker/smartsigntools/imagesbank"
6.  Skapa folder "local/docker/smartsigntools/publishedevents/images"
7.  Skapa folder "local/docker/smartsigntools/publishedevents/html"
8.  Skapa folder "local/docker/smartsigntools/publishedevents/pdf"
9.  Skapa folder "local/docker/smartsigntools/dbinit"
10. Skapa init.sql från repots dbinit/init.sql
11. Skapa deploy_ref.yml i github actions
12. Skapa deploy_prod.yml i github actions
13. Github Actions bygger en dockerimage i github packages
14. Starta applikationen med docker compose up -d --build i "local/docker/smartsigntools"

