var express = require('express');
var app = express();
var randomGiving = require('./randomgiving');


app.set('port', (process.env.PORT || 5000))

// Twilio Credentials 
var accountSid = 'ACd8782736eabc8ca85c913afc58091499'; 
var authToken = '8689348e4829c33fd126469c8d2fd488'; 
 
//require the Twilio module and create a REST client 
var client = require('twilio')(accountSid, authToken); 

// Mongo Database
var crypto = require("crypto"),
    mongoClient = require('mongodb').MongoClient,
    mongodb_host = "127.0.0.1",
    mongodb_port = "27017",
    userCollection,
    donationCollection;
    
var mongoConnection = "mongodb://";
mongoConnection += mongodb_host + ":" + mongodb_port;
mongoConnection += "/library";
mongoClient.connect(mongoConnection, function(err, database) {
	if(err) {
		throw new Error("Can't connect.");
	} else {
		console.log("Connection to MongoDB server successful.");
  		userCollection = database.collection('users');
  		donationCollection = database.collection('donations');
  	}
});


var bodyParser = require('body-parser')
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use( bodyParser.urlencoded() ); // to support URL-encoded bodies

app.use(express.json());       // to support JSON-encoded bodies
app.use(express.urlencoded()); // to support URL-encoded bodies


app.post('/messages', function(req, res) {
    var s_id = req.body.MessageSid,
        message_body = req.body.Body,
        phone_number = req.body.From;

	
	// parse message
	var str_array = message_body.split(" ");
	
	var full_name = "";
	var amount = 0.00;
	
	if (str_array.length >= 2)
	{
		var amount_is_numeric = isNumber(str_array[str_array.length -1]);
		// check if last element is numeric
		if (amount_is_numeric === true)
		{
			// amount is last element
			amount = str_array[str_array.length -1];
		
		
			var first_name = str_array[0];
			var other_names = "";
			
			if (str_array.length > 2)
			{
				// rest of elements is name
				for (var i = 1; i < str_array.length -1; i++)
				{
					other_names += str_array[i] + " ";
				}
		
				// remove last space
				other_names = other_names.substring(0, other_names.length - 1);
			}
			
			full_name = first_name + " " + other_names;
			
			
			
			// store user details
			var user = {
				number : phone_number,
				first_name : first_name,
				other_names : other_names,
				full_name : full_name,
			};
	
			console.log(user);
		
			// get a random charity - Stephen to do!!
			
			var eventLink = randomGiving.getlink(function(eventLink, eventName, eventId){
		
				var user, donation;
				
				// event has been returned
				// see if the user exists
				userCollection.find({mobileNumber: phone_number}).toArray(function(err, records){
				
					if(records && records.length > 0) {
						// exists - user me!
						user = records[0];
					} else {
						// doesn't exist - create me
						user = {
							reference: crypto.randomBytes(20).toString('hex'),
							name: full_name,
							mobileNumber: phone_number			
						};
					}
				});		
		
				// store donation details
				var donation = {
					reference : crypto.randomBytes(20).toString('hex'), // mongo id
					event : eventName, //
					amount : amount,
					complete : false,
					user: user.reference,
					shortLink: "",
					event: eventId
				};
				
				donationCollection.insert(donation, {}, function() {
					
				});
				
				// send something back
				client.messages.create({  
					to: user.number,
					from: "+441724410033",    
					body: "Hi " + user.first_name + ", here's a link to donate £" + donation.amount + " to " + eventName + ": " + eventLink,
				}, function(err, message) { 
					console.log(message.sid); 
				});
			});
	
	
			
			
		}
		else
		{
			console.log("No amount specified");
			
			// send something back
			client.messages.create({  
				to: phone_number,
				from: "+441724410033",    
				body: "Please send your text in the format Name Amount, for example John 3.50",
			}, function(err, message) { 
				console.log(message.sid); 
			});
		}
	}
	else
	{
		console.log("Invalid format");
		
		// send something back
		client.messages.create({  
			to: phone_number,
			from: "+441724410033",    
			body: "Please send your text in the format Name Amount, for example John 3.50",
		}, function(err, message) { 
			console.log(message.sid); 
		});
	}
});


function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'))
})
