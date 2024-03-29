Avatars
-----------

User avatars.

Relations
---------

The avatar module will:

 * Associate users with a avatar picture.
 * Create thumbnails of different sizes.
 * Store pictures and thumbnails as CouchDB attachment.
 * Use the `redis_auth` database to check requester identity.

Configuration
-------------

 * `REDIS_AUTH_PORT_6379_TCP_ADDR` - IP of the AuthDB redis
 * `REDIS_AUTH_PORT_6379_TCP_PORT` - Port of the AuthDB redis
 * `COUCH_AVATARS_PORT_5984_TCP_ADDR` - IP of the Avatars couchdb
 * `COUCH_AVATARS_PORT_5984_TCP_PORT` - Port of the Avatars couchdb
 * `COUCH_AVATARS_DB_NAME` - Name of the avatars database
 * Optional link to [users service](https://github.com/j3k0/ganomede-users)
    - `USERS_PORT_8080_TCP_ADDR` — address
    - `USERS_PORT_8080_TCP_PORT`
    - If any of these options are missing, no ban check will be performed — every user account will be considered to be in good standing (no bans)

API
---

# About [/avatars/v1/about]

## Read the about [GET]

### response [200] OK

    {
      "type": "avatars/v1",
      "version": "1.0.0"
    }

# User's avatar pictures [/avatars/v1/auth/:token/pictures]

    + Parameters
        + token (string) ... User authentication token

## Set avatar picture [POST]

Will:

 * crop the image to be a square
 * create resized versions 256x256, 128x128 and 64x64
   * should keep transparency
 * store PNG images in DB (overriding any previously stored images)
   * (suggestion) CouchDB attachments

### body [image/png]

### response [200] OK

# Thumbnails [/avatars/v1/:username/:size]

  If linked to users service, will perform ban check. Banned `:username`s will return 404 no matter avatar's existence.

    + Parameters
        + username (string) ... User to retrieve the avatar image of
        + size (name) ... Image size (64.png, 128.png, or 256.png)

## Get [GET]

### response [200] OK

Content-type: image/png

## Delete [DELETE]

Delete the users' avatar picture from the database.

Alternatively, you can use `POST /avatars/v1/auth/:token/pictures/delete` on clients that do not support the DELETE method.

### response [200] OK
