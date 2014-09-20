var express = require('express');
var app = express();
var randomGiving = require('./randomgiving');


app.set('port', (process.env.PORT || 5000))

// Twilio Credentials 
var accountSid = 'ACd8782736eabc8ca85c913afc58091499'; 
var authToken = '8689348e4829c33fd126469c8d2fd488'; 
 
//require the Twilio module and create a REST client 
var client = require('twilio')(accountSid, authToken); 


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
			
			var eventLink = randomGiving.getlink(function(eventLink, eventName){
		
				// store donation details
				var donation = {
					reference : "",
					charity : eventName,
					amount : amount,
					complete : false
				};
			
			
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


app.get('/d/:ref', function(req, res) {

	// get the donation reference
	var donation_ref = req.params.ref;
	
	// find the donation
	
	
	if (true)
	{
		// update the record to say clicked
	
		// and dispatch to JG
		res.redirect('http://www.justgiving.com');
	}
	else
	{
		// donation not found
	}
}


function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'))
})
