#! /usr/bin/env node
//-*- mode: js2;-*-

var databaseUrl = "test";
var collections = ["nycapt_postings", "nycapt_edits", "filterPolygons"];
var mongodb = require('mongodb');
var _ = require('underscore');
var sprintf = require('sprintf').sprintf;
var fs = require('fs');
var db = require("mongojs").connect(databaseUrl, collections);

var count = 0;

var answer = {};

function countIncr() {
    ++count;
}

function countDecr() {
    --count;
    if (count == 0) { done(); }
}

function doQuery(queryFunc, callback) {
    ++count;
    queryFunc(function(err, data) {
        callback(err, data);
        countDecr();
    });
}

countIncr();

doQuery(db.nycapt_postings.find,
        function (err, postings) {
            answer.postings = postings;
        });
doQuery(db.nycapt_edits.find,
        function (err, edits) {
            answer.edits = edits;
        });
doQuery(db.filterPolygons.find,
        function (err, filterPolygons) {
            answer.filterPolygons = filterPolygons;
        });

/*
countIncr();
db.nycapt_postings.find(function(err, postings) {
    answer.postings = postings;
    countDecr();
});

countIncr();
db.nycapt_edits.find(function(err, edits) {
    answer.edits = edits;
    countDecr();
});


countIncr();
db.filterPolygons.find(function(err, filterPolygons) {
    answer.filterPolygons = filterPolygons;
    countDecr();
});
*/

countDecr();


function done() {
            console.log('database contains:');
            console.log(sprintf('    %1d filterPolygons', answer.filterPolygons.length));
            console.log(sprintf('    %1d postings', answer.postings.length));
            console.log(sprintf('    %1d edits', answer.edits.length));
            db.close();
}
