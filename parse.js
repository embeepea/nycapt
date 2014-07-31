#! /usr/bin/node

var jsdom = require('jsdom');
var $ = require('jquery')(jsdom.jsdom().createWindow());
var fs = require('fs');
var geocode = require('./geocode.js').geocode;

fs.readFile("ShawBKListings1/listings.html", { encoding: 'utf8' }, function(err, data) {
    parse(data);
});

noutstanding = 0;
var listings = [];

function incr_noutstanding() {
    ++noutstanding;
    console.log(noutstanding);
}

function decr_noutstanding() {
    --noutstanding;
    console.log(noutstanding);
    if (noutstanding == 0) {
        generate_output();
    }
}

function parse(data) {

    var $body = $(data).find('body');
    var $table = $($body.find('blockquote.gmail_quote table')[0]);
    var $stuff = $table.find('table[height=40]');

    incr_noutstanding();
    for (i=0; i<$stuff.length; ++i) {
        var $ltable = $($stuff[i]);
        // $ltable contains 3 td's:
        //   first one contains image
        //   second one contains 1st column of data (starting wtih address) ("address column")
        //   third one contains 2nd column of data (starting with Web ID)   ("WebID column")

        var address = $ltable.find('td:nth-child(2) a').text().trim();
        var webid = /Web ID:\s+(\S+)/.exec($ltable.find('td:nth-child(3) p').text().trim())[1];

        incr_noutstanding();
        geocode(address + ", Brooklyn NY", function(lat,lon) {
            listings.push({
                webid   : webid,
                address : address,
                html    : $("<div></div>").append($ltable).html(),
                lat     : parseFloat(lat),
                lon     : parseFloat(lon)
            });
            decr_noutstanding();
        });

        //break;
    }
    decr_noutstanding();

}

function generate_output() {
    console.log(listings);
}
