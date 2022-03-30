var request = require("request");
var fs = require("fs");

function loadConfig(cb) {
    var config = {
        host: process.env.SERVER_HOST,
        port: +process.env.SERVER_PORT || 443
    };
    config.username = process.argv[2];
    config.password = process.argv[3];
    config.filename = process.argv[4];
    config.baseurl = "https://" + config.host + (config.port != 443 ? ':' + config.port : '');
    cb(config);
}

function login(config, callback) {
    console.log('logging in...');
    request.post({
        uri: config.baseurl + "/users/v1/login",
        json: true,
        body: {
            username: config.username,
            password: config.password
        }
    },
    function(error, res, body) {
        if (body && body.token) {
            console.log("logged in. token: " + body.token);
            callback(body.token);
        }
        else {
            console.error('login failed.');
            console.dir(arguments);
            if (error)
                console.error(error);
            process.exit(1);
        }
    });
}

function post(config, callback) {
    var endpoint = '/avatars/v1/auth/' + config.token + '/pictures';
    var url = config.baseurl + endpoint;
    console.log("uploading to " + url + "...");
    var filestream = fs.createReadStream(__dirname + "/" + config.filename);
    var webstream = request.post({
        uri: url,
        formData: {
            "files": [ filestream ]
        }
    },
    function(error, res, body) {
        if (error)
            console.error(error);
        if (body)
            console.log(body);
    });
    // filestream.pipe(webstream);
}


function changeImage(config, callback) {
    login(config, function(token) {
        config.token = token;
        post(config, callback);
    });
}

loadConfig(function(config) {
    if (!config.filename || !config.host) {
        console.error("usage: node change-image.js <username> <password> <file>");
        console.error("       ENV: SERVER_HOST, SERVER_PORT");
        process.exit(1);
    }
    changeImage(config);
});

