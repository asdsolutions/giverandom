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
var BitlyAPI = require('node-bitlyapi');
var Bitly = new BitlyAPI({
    client_id: '887b6aafcb0535792868e3bd50c7af08bf107c22',
    client_secret: 'ff64bf59a90b43355635b8a9519b2e34e5631c63'
});
Bitly.setAccessToken('2c0ada24bc4021921381978f3e8db5746ac9bf7c');

app.set('port', (process.env.PORT || 5000));

var expressHbs = require('express-handlebars');

app.engine('hbs', expressHbs({extname: 'hbs', defaultLayout: 'main.hbs'}));
app.set('view engine', 'hbs');

app.configure(function () {
    app.use('/assets', express.static(__dirname + '/assets'));
});

// Twilio Credentials 
var accountSid = 'ACd8782736eabc8ca85c913afc58091499';
var authToken = '8689348e4829c33fd126469c8d2fd488';

//require the Twilio module and create a REST client 
var client = require('twilio')(accountSid, authToken);

// JUST GIVING URIS
var justGivingUri = "http://v3-sandbox.justgiving.com/";
// var justGivingUri = "http://www.justgiving.com/";

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

                                Bitly.shorten({longUrl: shortUrl}, function (err, results) {
                                    var shortened = JSON.parse(results);

                                    // send something back
                                    client.messages.create({
                                        to: user.mobileNumber,
                                        from: "+441724410033",
                                        body: "Hi " + firstName + ", here's a link to donate £" + parseFloat(donation.amount).toFixed(2) + " to " + eventName + ": " + shortened.data.url,
                                    }, function (err, message) {
                                        console.log(message.sid);
                                    });
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

                                Bitly.shorten({longUrl: shortUrl}, function (err, results) {
                                    var shortened = JSON.parse(results);

                                    // send something back
                                    client.messages.create({
                                        to: user.mobileNumber,
                                        from: "+441724410033",
                                        body: "Hi " + firstName + ", here's a link to donate £" + parseFloat(donation.amount).toFixed(2) + " to " + eventName + ": " + shortened.data.url,
                                    }, function (err, message) {
                                        console.log(message.sid);
                                    });
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

            var exitUrl = encodeURIComponent(base_uri + 'done?donation_ref=' + donation_ref + '&donation_id=JUSTGIVING-DONATION-ID');

            // and dispatch to JG
            res.redirect(justGivingUri + donation.shortLink + '/4w350m3/donate/?amount=' + donation.amount + '&currency=GBP&exitUrl=' + exitUrl);


        } else {

            // 404...we'll come to this
        }
    });

});


app.get('/done', function (req, res) {

    var donation_ref = req.query.donation_ref;
    var justgiving_donation_id = req.query.donation_id;

    //var exitUrl = encodeURIComponent(base_uri + 'done?donation_ref=' + donation_ref + '&donation_id=JUSTGIVING-DONATION-ID');

    donationCollection.find({reference: donation_ref}).toArray(function (err, records) {
        if (!err && records && records.length > 0) {
            var donation = records[0];

            var donationData = randomGiving.getdonation(justgiving_donation_id, function (donationAmount, donationStatus) {
                donation.status = donationStatus;
                donation.amount = donationAmount;

                donationCollection.update({reference: donation_ref}, donation, {}, function () {
                    // DONE                    
            		res.render('thanks', {page_link: justGivingUri + donation.shortLink});
                });
            });
        } else { 
        	//  not found - error?        	
            res.render('sorry', {page_link: justGivingUri});
        }
        
    });
});

//
// filter the public stream by english tweets containing `#randomgive`
//
var stream = twit.stream('statuses/filter', {track: '#giverandom'})

stream.on('tweet', function (tweet) {
    // we have a tweet - lets reply with a random one!!!!
    console.log("Name: " + tweet.user.name);
    console.log("Handle: " + tweet.user.screen_name);

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
                        Bitly.shorten({longUrl: shortUrl}, function (err, results) {
                            var shortened = JSON.parse(results);
                            // tweet @ screen_name the above message
                            var status = "Hi @" + tweet.user.screen_name + ", here's a link to donate to " + eventName + ": " + shortened.data.url;
                            if (status.length > 140) {
                                status = "Hi @" + tweet.user.screen_name + ' ' + shortened.data.url + ' - ' + eventName;
                                status = status.substr(0, 140);
                            }
                            twit.post('statuses/update', {status: status}, function (err, data, response) {

                            });
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
                        Bitly.shorten({longUrl: shortUrl}, function (err, results) {
                            var shortened = JSON.parse(results);
                            // tweet @ screen_name the above message
                            var status = "Hi @" + tweet.user.screen_name + ", here's a link to donate to " + eventName + ": " + shortened.data.url;
                            if (status.length > 140) {
                                status = "Hi @" + tweet.user.screen_name + ' ' + shortened.data.url + ' - ' + eventName;
                                status = status.substr(0, 140);
                            }
                            twit.post('statuses/update', {status: status}, function (err, data, response) {

                            });
                        });
                    });
                });
            }
        });
    });
});


app.get('/', function (req, res) {

    donationCollection.find().toArray(function (err, records) {
        if (!err && records && records.length > 0) {
            res.render('index', {num_donations: records.length});
        } else {
            res.render('index', {num_donations: '4323'});
        }
    });

});


function isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

app.listen(app.get('port'), function () {
    console.log("Node app is running at localhost:" + app.get('port'))
});
