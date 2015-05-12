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

API
---

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

# Thumbnails [/avatars/v1/:username/size/:size]

    + Parameters
        + username (string) ... User to retrieve the avatar image of
        + size (integer) ... Image size (64, 128, or 256)

## Get [GET]

### response [200] OK

Content-type: image/png
