var http = require('http');
var emitter = require('events').EventEmitter;
var request = require('request');
var apiKey = "fe77416d";
var justGivingUrl = "https://api.justgiving.com/" + apiKey + "/v1/";

module.exports = {
	
	getlink: function(callback) {
	
    	var random = Math.floor((Math.random() * 1000) + 1);
    	
		var options = {
        	method: 'GET',
        	url: justGivingUrl + "fundraising/search?status=active&pageSize=1&page=" + random, 
        	headers: {
        	    "Content-Type": "application/json"
        	}
    	};
    	    	
		request(options, function(error, response, body){
		
			var results = JSON.parse(body);
			console.log(results.SearchResults.length);
			var returned = false;
			
			for(var i = 0; i < results.SearchResults.length; i++) {
				if(!returned) {
					returned = true;
					callback(results.SearchResults[i].PageUrl, results.SearchResults[i].PageName);				
				}				
			}			
		});
	}	
};
