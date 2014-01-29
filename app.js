var port_number = 3000;

var databaseUrl = "test";
var collections = ["filterPolygons", "postings", "edits"];
var mongodb = require('mongodb');
var _ = require('underscore');
var db = require("mongojs").connect(databaseUrl, collections);

function isPointInPoly(poly, pt){
    for(var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
        ((poly[i][0] <= pt[0] && pt[0] < poly[j][0]) || (poly[j][0] <= pt[0] && pt[0] < poly[i][0]))
        && (pt[1] < (poly[j][1] - poly[i][1]) * (pt[0] - poly[i][0]) / (poly[j][0] - poly[i][0]) + poly[i][1])
        && (c = !c);
    return c;
}

function polygonFilter(polygons) {
    return function(posting) {
        var i;
        for (i=0; i<polygons.length; ++i) {
            if (isPointInPoly(polygons[i].coords, [posting.Latitude,posting.Longitude])) {
                return true;
            }
        }
        return false;
    };
}

function postingPredicate(posting) {
    if (posting.PostingTitle.match(/superbowl/gi)) { return false; }
    if (posting.PostingTitle.match(/super\s+bowl/gi)) { return false; }
    return true;
}

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
     db.filterPolygons.save({
        'coords' : req.body
    }, function(err, value) {
        res.send(JSON.stringify({'status' : 'OKyes'}));
    });
});
app.post('/filterPolygons', function(req, res) {
    db.filterPolygons.find(function(err,filterPolygons) {
        res.send(JSON.stringify(filterPolygons));
    });
});
app.get('/postings', function(req, res) {
    db.filterPolygons.find(function(err,filterPolygons) {
        db.postings.find(function(err,postings) {
            postings = _.filter(postings, polygonFilter(filterPolygons));
            postings = _.filter(postings, postingPredicate);
            db.edits.findOne(function(err,edits) {
                if (edits) {
                    _.each(postings, function(posting) {
                        if (edits[posting]) {
                            _.extend(posting, edits);
                        }
                    });
                }
                res.send(JSON.stringify(postings));
            });
        });
    });
});

console.log('listening on port ' + port_number);

app.listen(port_number);
