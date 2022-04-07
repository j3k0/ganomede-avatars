var request = require("request");
var fs = require("fs");

function loadConfig(cb: { (config: any): void; (arg0: { host: any; port: number; }): void; }) {
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

function login(config: { baseurl: string; username: any; password: any; }, callback: { (token: any): void; (arg0: any): void; }) {
    console.log('logging in...');
    request.post({
        uri: config.baseurl + "/users/v1/login",
        json: true,
        body: {
            username: config.username,
            password: config.password
        }
    },
    function(error: any, res: any, body: { token: string; }) {
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

function post(config: { token: string; baseurl: string; filename: string; }, callback: any) {
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
    function(error: any, res: any, body: any) {
        if (error)
            console.error(error);
        if (body)
            console.log(body);
    });
    // filestream.pipe(webstream);
}


function changeImage(config: { token: any; }, callback: undefined) {
    login(config, function(token: any) {
        config.token = token;
        post(config, callback);
    });
}

loadConfig(function(config: { filename: any; host: any; }) {
    if (!config.filename || !config.host) {
        console.error("usage: node change-image.js <username> <password> <file>");
        console.error("       ENV: SERVER_HOST, SERVER_PORT");
        process.exit(1);
    }
    changeImage(config);
});

