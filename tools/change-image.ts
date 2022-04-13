const request = require("request");
const fs = require("fs");

export type Config = {
  protocol: string;
  host: string;
  port: number;
  filename: string;
  baseurl: string;
} & ({
  username: string;
  password: string;
} | {
  token: string;
});

// export type ConfigWithToken = Config & {
//   token?: string;
// }

function loadConfig(cb: (config: Config) => void) {
    let config:any = {
        protocol: process.env.SERVER_PROTOCOL || 'https',
        host: process.env.SERVER_HOST,
        port: +(process.env.SERVER_PORT || '443')
    };
    if (process.argv[2] === "token") {
      config.token = process.argv[3];
    }
    else {
      config.username = process.argv[2];
      config.password = process.argv[3];
    }
    config.filename = process.argv[4];
    config.baseurl = config.protocol + "://" + config.host + (config.port != 443 ? ':' + config.port : '');
    cb(config);
}

function login(config: Config, callback: (token: string) => void) {
    if ('token' in config) return callback(config.token);
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

function post(config: Config) {
    if (!('token' in config)) return;
    var endpoint = '/avatars/v1/auth/' + config.token + '/pictures';
    var url = config.baseurl + endpoint;
    console.log("uploading to " + url + "...");
    var filestream = fs.createReadStream(__dirname + "/" + config.filename);
    /* var webstream = */ request.post({
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


function changeImage(config: Config) {
    login(config, function(token: any) {
        const configWT: Config = {...config, token};
        post(configWT);
    });
}

loadConfig(function(config: Config) {
    if (!config.filename || !config.host) {
        console.error("usage: node change-image.js <username> <password> <file>");
        console.error("       ENV: SERVER_HOST, SERVER_PORT");
        process.exit(1);
    }
    changeImage(config);
});

