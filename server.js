var express = require('express');
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectId;
var bodyParser = require('body-parser');
var bcrypt = require('bcryptjs');
var jwt = require('jwt-simple');
var app = express();

var JWT_SECRET = 'mediasharing';
var db = null;
MongoClient.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/media", function(err, dbconn) {
	if(!err) {
		console.log("We are connected");
		db = dbconn;
	} else {
		console.log(err)
	}
});

app.use(bodyParser.json());
app.use(express.static('public'));

app.get('/media', function(req, res, next) {
	
	db.collection('media', function(err, mediaCollection) {
		mediaCollection.find().toArray(function(err, media) {
			return res.json(media);
		});
	});
});

app.post('/media', function(req, res, next) {

	var token = req.headers.authorization;
	var user = jwt.decode(token, JWT_SECRET);

	db.collection('media', function(err, mediaCollection) {
		var newText = {
			text: req.body.newText,
			user: user._id,
			username: user.username
		}
		mediaCollection.insert(newText, {w:1}, function(err) {
			return res.send();
		});
	});
});

app.put('/media/remove', function(req, res, next) {

	var token = req.headers.authorization;
	var user = jwt.decode(token, JWT_SECRET);

	db.collection('media', function(err, mediaCollection) {		
		var mediaId = req.body.media._id;
		mediaCollection.remove({_id: ObjectId(mediaId), user: user._id}, {w:1}, function(err) {
			return res.send();
		});
	});
});


app.post('/users', function(req, res, next) {

	db.collection('users', function(err, usersCollection) {

		bcrypt.genSalt(10, function(err, salt) {
		    bcrypt.hash(req.body.password, salt, function(err, hash) {
		    	var newUser = {
		    		username: req.body.username,
		    		password: hash
		    	};
			    usersCollection.insert(newUser, {w:1}, function(err) {
					return res.send();
				});
		    });
		});
		
	});
});

app.put('/users/signin', function(req, res, next) {

	db.collection('users', function(err, usersCollection) {

		usersCollection.findOne({username: req.body.username}, function(err, user) {
			bcrypt.compare(req.body.password, user.password, function(err, result) {
				if(result) {
					var token = jwt.encode(user, JWT_SECRET);
					return res.json({token: token});
				} else {
					return res.status(400).send();
				}
			});
		});
	});
});

app.listen(process.env.PORT || 3000, function() {
	console.log('listening on port 3000!');
});