var port_number = 3000;

var databaseUrl = "test";
var collections = ["filterPolygons"];
var mongodb = require('mongodb');
var db = require("mongojs").connect(databaseUrl, collections);

var express = require('express')
  , util = require('util')
  ;

var app = express();

app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.logger());
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.session({ secret: 'keyboard cat' }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

var user = {
    'emails' : [ { 'value' : "foofoo@example.com" } ]
};


app.get('/', function(req, res){
    res.render('map', {
        'user' : user
    });
});

app.get('/list', function(req, res){
    res.render('list', {
        'user' : user
    });
});

app.get('/filter', function(req, res){
    res.render('filter', {
        'user' : user
    });
});

app.post('/addpolygon', function(req, res) {
    console.log('got polygon: ' + JSON.stringify(req.body));
    db.filterPolygons.save({
        'coords' : req.body
    }, function(err, value) {
        console.log('saved polygon to mongo');
        res.send(JSON.stringify({'status' : 'OKyes'}));
    });
});
app.post('/polygons', function(req, res) {
    db.filterPolygons.find(function(err,filterPolygons) {
        res.send(JSON.stringify(filterPolygons));
    });
});


console.log('listening on port ' + port_number);

app.listen(port_number);
