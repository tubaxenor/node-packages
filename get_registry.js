var request = require('request'),
		config = require('./config'),
		util = require('util'),
		twitter = require('twitter'),
		fs = require('fs'),
		winston = require('winston');

var twit_cli = new twitter(config.twitter);
fs.exists('logs', function(res){
	if(!res) {
		fs.mkdir("logs");
	}
});

var logLevel = {
  levels: {
    info: 0,
    sys: 1,
    warn: 2,
    error: 3
  },
  colors: {
    info: 'blue',
    sys: 'orange',
    warn: 'yellow',
    error: 'red'
  }
};
winston.addColors(logLevel.colors);
var logger = new (winston.Logger)({
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/np.log' })
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ]
});
logger.exitOnError = false;
logger.setLevels(logLevel.levels);
function getNpmRegistry() {
	time = Date.now()-1000*60*5; //check update in 15 mins
	request("https://registry.npmjs.org/-/all/since?stale=update_after&startkey="+time, function(e, res, body){
		if (!e && res.statusCode == 200) {
			data = JSON.parse(body)
			for(key in data) {
				if(key != '_updated'){
					logger.info("package_name : "+key)
					msg = "https://npmjs.org/package/"+key+" "+data[key].description;
					if(msg.length > 140) {
						msg = msg.substring(0,137)+"...";
					}
					twit_cli
					  .verifyCredentials(function(data){
					  	//logger.info(util.inspect(data));
					  })
					  .updateStatus(msg, function(data) {
				      //logger.info(util.inspect(data));
				    });
				}
			}
			//console.log(util.inspect(data))
		} else {
			logger.error("errors : "+e+" response : "+res)
		}
		setTimeout(getNpmRegistry, (1000*60*5))
	})
}

getNpmRegistry();