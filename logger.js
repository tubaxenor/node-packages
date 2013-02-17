var request = require('request');

function getNpmRegistry() {
	time = Date.now();
	console.log(time)
	request("https://registry.npmjs.org/-/all/since?stale=update_after&startkey="+time, function(e, res, body){

		if (!e && res.statusCode == 200) {
			console.log(body)
			setTimeout(getNpmRegistry, 3000)
		} else {
			console.log(e)
			console.log(res)
		}
	})
}

getNpmRegistry();