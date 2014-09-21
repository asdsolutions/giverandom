var express = require('express');
var app = express();
var randomGiving = require('./randomgiving');
var util = require('util');
var twitter = require('twit');
var twit = new twitter({
    consumer_key: 'hWvpGJcJBUfVep7AnP0pO1qrM',
    consumer_secret: 'K1DXIFdJJaWk44BgyI1MW6A62tLtnAlBILKsWz5SdirpfgK0Jn',
    access_token: '2823045272-tObkn9GhqvCBSJBH6J6g5Pg1ur0EkeE9XUfeoib',
    access_token_secret: 'uEZ4c1XfhBJM2ssa6pwjuD7Y3V4c2Ham7iVcAedyl58R0'
});

app.set('port', (process.env.PORT || 5000));
app.set('views', './views');
app.set('view engine', 'jade');

// Twilio Credentials 
var accountSid = 'ACd8782736eabc8ca85c913afc58091499';
var authToken = '8689348e4829c33fd126469c8d2fd488';

//require the Twilio module and create a REST client 
var client = require('twilio')(accountSid, authToken);

var base_uri = "http://lit-taiga-6522.herokuapp.com/";


var mongo = require('mongodb');

var mongoUri = process.env.MONGOLAB_URI ||
        process.env.MONGOHQ_URL ||
        'mongodb://localhost/mydb';

mongo.Db.connect(mongoUri, function (err, db) {
    db.collection('mydocs', function (er, collection) {
        collection.insert({'mykey': 'myvalue'}, {safe: true}, function (er, rs) {
        });
    });
});

// Mongo Database
var crypto = require("crypto"),
        mongoClient = require('mongodb').MongoClient,
        userCollection,
        donationCollection;

var mongoConnection = "mongodb://giverandom:giverandom@kahana.mongohq.com:10055/app29807507";
mongoClient.connect(mongoConnection, function (err, database) {
    if (err) {
        console.log(err);
        throw new Error("Can't connect.");
    } else {
        console.log("Connection to MongoDB server successful.");
        userCollection = database.collection('users');
        donationCollection = database.collection('donations');
    }
});


var bodyParser = require('body-parser')
app.use(bodyParser.json());       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded()); // to support URL-encoded bodies

app.use(express.json());       // to support JSON-encoded bodies
app.use(express.urlencoded()); // to support URL-encoded bodies


app.post('/messages', function (req, res) {
    var s_id = req.body.MessageSid,
            message_body = req.body.Body,
            phone_number = req.body.From;

    // parse message
    var str_array = message_body.split(" ");

    var full_name = "";
    var amount = 0.00;

    if (str_array.length >= 2)
    {
        var amount_is_numeric = isNumber(str_array[str_array.length - 1]);
        // check if last element is numeric
        if (amount_is_numeric === true)
        {
            // amount is last element
            amount = str_array[str_array.length - 1];


            var first_name = str_array[0];
            var other_names = "";

            if (str_array.length > 2)
            {
                // rest of elements is name
                for (var i = 1; i < str_array.length - 1; i++)
                {
                    other_names += str_array[i] + " ";
                }

                // remove last space
                other_names = other_names.substring(0, other_names.length - 1);
            }

            full_name = first_name + " " + other_names;


            var user, donation;


            // Get a Random Charity	
            var eventLink = randomGiving.getlink(function (eventLink, eventName, eventId) {

                // event has been returned
                // see if the user exists
                userCollection.find({mobileNumber: phone_number}).toArray(function (err, records) {
                    if (!err && records && records.length > 0) {
                        // exists - user me!
                        user = records[0];
                        user.name = full_name.trim();
                        userCollection.update({reference: user.reference}, user, {}, function () {

                            var jg_uri = eventLink.split("/");

                            // store donation details
                            var donation = {
                                reference: crypto.randomBytes(20).toString('hex'), // mongo id
                                event: eventName, //
                                amount: amount,
                                status: "sent",
                                user: user.reference,
                                shortLink: jg_uri[jg_uri.length - 1],
                                event: eventId
                            };

                            donationCollection.insert(donation, {}, function () {
                                var splitName = user.name.split(' ');
                                var firstName = splitName[0];
                                var shortUrl = base_uri + "d/" + donation.reference;

                                // send something back
                                client.messages.create({
                                    to: user.mobileNumber,
                                    from: "+441724410033",
                                    body: "Hi " + firstName + ", here's a link to donate £" + donation.amount + " to " + eventName + ": " + shortUrl,
                                }, function (err, message) {
                                    console.log(message.sid);
                                });
                            });
                        });
                    } else {
                        // doesn't exist - create me
                        user = {
                            reference: crypto.randomBytes(20).toString('hex'),
                            name: full_name.trim(),
                            mobileNumber: phone_number
                        };

                        userCollection.insert(user, {}, function () {
                            var jg_uri = eventLink.split("/");

                            // store donation details
                            var donation = {
                                reference: crypto.randomBytes(20).toString('hex'), // mongo id
                                event: eventName, //
                                amount: amount,
                                status: "sent",
                                user: user.reference,
                                shortLink: jg_uri[jg_uri.length - 1],
                                event: eventId
                            };

                            donationCollection.insert(donation, {}, function () {
                                var splitName = user.name.split('/');
                                var firstName = splitName[0];

                                var shortUrl = base_uri + "d/" + donation.reference;

                                // send something back
                                client.messages.create({
                                    to: user.mobileNumber,
                                    from: "+441724410033",
                                    body: "Hi " + firstName + ", here's a link to donate £" + donation.amount + " to " + eventName + ": " + shortUrl,
                                }, function (err, message) {
                                    console.log(message.sid);
                                });
                            });
                        });
                    }
                });
            });
        }
        else
        {
            // send something back
            client.messages.create({
                to: phone_number,
                from: "+441724410033",
                body: "Please send your text in the format Name Amount, for example John 3.50",
            }, function (err, message) {
                console.log(message.sid);
            });
        }
    }
    else
    {
        // send something back
        client.messages.create({
            to: phone_number,
            from: "+441724410033",
            body: "Please send your text in the format Name Amount, for example John 3.50",
        }, function (err, message) {
            console.log(message.sid);
        });
    }
});


app.get('/d/:ref', function (req, res) {

    // get the donation reference
    var donation_ref = req.params.ref;

    // find the donation
    donationCollection.find({reference: donation_ref}).toArray(function (err, records) {

        if (!err && records && records.length > 0) {
            // exists
            donation = records[0];


            // update the record to say clicked
            donation.status = "clicked";


            donationCollection.update({reference: donation_ref}, donation, {}, function () {

            });


            // and dispatch to JG
            res.redirect('http://www.justgiving.com/' + donation.shortLink + '/4w350m3/donate/?amount=' + donation.amount + '&currency=GBP&exitUrl=' + base_uri + 'done/' + donation.reference);


        } else {

            // 404...we'll come to this
        }
    });

});

//
// filter the public stream by english tweets containing `#randomgive`
//
var stream = twit.stream('statuses/filter', {track: '#randomgive'})

stream.on('tweet', function (tweet) {
    // we have a tweet - lets reply with a random one!!!!
    console.log("Name: " + tweet.user.name);
    console.log("Handle: " + tweet.user.screen_name);
    console.log(tweet)

    // we need to find / create the user.
    // Get a Random Charity	
    var user, donation;
    var eventLink = randomGiving.getlink(function (eventLink, eventName, eventId) {

        // event has been returned
        // see if the user exists
        userCollection.find({twitterHandle: tweet.user.screen_name}).toArray(function (err, records) {
            if (!err && records && records.length > 0) {
                // exists - user me!	
                user = records[0];
                user.name = tweet.user.name;
                userCollection.update({reference: user.reference}, user, {}, function () {

                    var jg_uri = eventLink.split("/");

                    // store donation details
                    var donation = {
                        reference: crypto.randomBytes(20).toString('hex'), // mongo id
                        event: eventName, //
                        amount: 5,
                        status: "sent",
                        user: user.reference,
                        shortLink: jg_uri[jg_uri.length - 1],
                        event: eventId
                    };

                    donationCollection.insert(donation, {}, function () {


                        var shortUrl = base_uri + "d/" + donation.reference;
                        // tweet @ screen_name the above message
                        var status = "Hi @" + tweet.user.screen_name + ", here's a link to donate to " + eventName + ": " + shortUrl;
                        console.log(status);
                        twit.post('statuses/update', {status: status}, function (err, data, response) {
                            console.log(data)
                            console.log(err);
                        });

                    });
                });
            } else {
                // doesn't exist - create me
                user = {
                    reference: crypto.randomBytes(20).toString('hex'),
                    name: tweet.user.name,
                    twitterHandle: tweet.user.screen_name
                };

                userCollection.insert(user, {}, function () {
                    var jg_uri = eventLink.split("/");

                    // store donation details
                    var donation = {
                        reference: crypto.randomBytes(20).toString('hex'), // mongo id
                        event: eventName, //
                        amount: 5,
                        status: "sent",
                        user: user.reference,
                        shortLink: jg_uri[jg_uri.length - 1],
                        event: eventId
                    };

                    donationCollection.insert(donation, {}, function () {


                        var shortUrl = base_uri + "d/" + donation.reference;
                        // tweet @ screen_name the above message
                        var status = "Hi @" + tweet.user.screen_name + ", here's a link to donate to " + eventName + ": " + shortUrl;
                        console.log(status);
                        twit.post('statuses/update', {status: status}, function (err, data, response) {
                            console.log(data)
                            console.log(err);
                        });
                    });
                });
            }
        });
    });
});


app.get('/', function (req, res) {
    res.render('index', {title: 'Hey', message: 'Hello there!'});
});


function isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

app.listen(app.get('port'), function () {
    console.log("Node app is running at localhost:" + app.get('port'))
});
