var request = require('request'),
    express = require("express");
    app = express();
    config = require('./config'),
    util = require('util'),
    twitter = require('twitter'),
    fs = require('fs'),
    winston = require('winston');

var twit_cli = new twitter(config.twitter);
fs.exists('./logs', function(res){
  if(!res) {
    fs.mkdir("./logs");
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
    new winston.transports.File({ filename: './logs/np.log' })
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: './logs/exceptions.log' })
  ]
});
logger.exitOnError = false;
logger.setLevels(logLevel.levels);
var launched = false;
var getNpmRegistry = function(twit_cli) {
  time = Date.now()-1000*60*5; //check update in 15 mins
  request("https://registry.npmjs.org/-/all/since?stale=update_after&startkey="+time, function(e, res, body){
    if (!e && res.statusCode == 200) {
      data = JSON.parse(body)
      for(key in data) {
        if(key != '_updated'){
          logger.info("package_name : "+key)
          msg = key + " " +data[key]["dist-tags"].latest + " https://npmjs.org/package/"+key+" "+data[key].description;
          if(msg.length > 140) {
            msg = msg.substring(0,137)+"...";
          }
          twit_cli
            .verifyCredentials(function(data){
              logger.info(util.inspect(data));
            })
            .updateStatus(msg, function(data) {
              logger.info(util.inspect(data));
            });
        }
      }
      //console.log(util.inspect(data))
    } else {
      logger.error("errors : "+e+" response : "+res)
    }
  })
}

var get_last_lines = function(filename, lines) {
  var data = fs.readFileSync(filename, 'utf8');
  var all_lines = data.split("\n");
  var res = "";
  for(var i=lines+1; i>0; i-- ){
    if(all_lines[all_lines.length-i]){
      res += all_lines[all_lines.length-i] + "\n";
    }
  }
  return res;
}

var jobid = 0
app.get('/launch', function(req, res) {
  if(!launched) {
    launched = true;
    getNpmRegistry(twit_cli);
    jobid = setInterval(getNpmRegistry, (1000*60*5), twit_cli);
    var msg = "job launched";
  } else {
    var msg = "job is already launching";
  }
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.write(msg);
  res.end();
});

app.get('/stop', function(req, res) {
  if(!launched || jobid === 0){
    var msg = "no running job";
  } else {
    clearInterval(jobid);
    var msg = "job killed";
  }
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.write(msg);
  res.end();
});
app.get('/logs/:last_line_count', function(req, res) {
  var logs = get_last_lines('./logs/np.log', req.params.last_line_count)
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.write(logs);
  res.end();
});

app.listen(process.env.VCAP_APP_PORT || 3000);
