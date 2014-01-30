var port_number = 3000;

var databaseUrl = "test";
var collections = ["filterPolygons", "postings", "edits"];
var mongodb = require('mongodb');
var sprintf = require('sprintf');
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

// Call the callback with a single argument which is an object containing a property
// for each edit in the database; the property name is the PostingID, and the property
// value is the edit object for that posting.
function withEditsObj(callback) {
    db.edits.find(function(err,edits) {
//console.log('number of edits found is: ' + edits.length);
        var editsObj = {};
        _.each(edits, function(edit) {
            editsObj[edit["PostingID"]] = edit;
        });
        callback(editsObj);
    });
}

app.get('/postings', function(req, res) {
    db.filterPolygons.find(function(err,filterPolygons) {
        db.postings.find(function(err,postings) {
            postings = _.filter(postings, polygonFilter(filterPolygons));
            postings = _.filter(postings, postingPredicate);
            withEditsObj(function(edits) {
                _.each(postings, function(posting) {
                    if (edits[posting.PostingID]) {
                        _.each(edits[posting.PostingID], function(v,k) {
                            if (k !== "PostingID" && k !== "_id") {
                                posting[k] = v;
                            }
                        });
                    }
                });
                res.send(JSON.stringify(postings));
            });
        });
    });
});

app.post('/settags', function(req, res) {
    var PostingID = req.body.PostingID;
    var tags = req.body.tags;
    db.edits.findAndModify({
        query: { "PostingID":PostingID },
        update: { $set: { Tags : tags } }
    }, function() {
        res.send(JSON.stringify({'status' : 'OKyes'}));
    });
});

app.post('/postnotes', function(req, res) {
    var PostingID = req.body.PostingID;
    var notes = req.body.notes;
    db.edits.findAndModify({
        query: { "PostingID":PostingID },
        update: { $set: { Notes : notes } }
    }, function() {
        res.send(JSON.stringify({'status' : 'OKyes'}));
    });
});


console.log('listening on port ' + port_number);

app.listen(port_number);
