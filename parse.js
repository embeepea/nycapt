#! /usr/bin/node

var jsdom = require('jsdom');
var $ = require('jquery')(jsdom.jsdom().createWindow());
var fs = require('fs');
var geocode = require('./geocode.js').geocode;

var listing_source = "Shaw";

fs.readFile("ShawMHListings2/listings2.html", { encoding: 'utf8' }, function(err, data) {
    parse(data);
});

noutstanding = 0;
var listings = [];

function incr_noutstanding() {
    ++noutstanding;
    //console.log(noutstanding);
}

function decr_noutstanding() {
    --noutstanding;
    //console.log(noutstanding);
    if (noutstanding == 0) {
        generate_output();
    }
}

function dontgeocode(address, callback) {
    callback(1.234,5.678);
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
        var rent  = /Rent:\s+([^A-Za-z\s\|]+)/.exec($ltable.find('td:nth-child(2)').text().trim())[1];
        rent = rent.replace(/[\$,]+/g, '');
        var rooms = /Size:\s+[^\|]+\|\s*([\d/\.]+)/.exec($ltable.find('td:nth-child(2)').text().trim())[1];
        var url = $ltable.find('td:nth-child(2) a').attr('href');

        (function(listing) {
            incr_noutstanding();
            dontgeocode(address + ", Brooklyn NY", function(lat,lon) {
                listing.Latitude  = parseFloat(lat);
                listing.Longitude = parseFloat(lon);
                listings.push(listing);
                decr_noutstanding();
            });
        }({
            PostingID      : webid,
            Source         : listing_source,
            Address        : address,
            HTML           : $("<div></div>").append($ltable).html(),
            "Ask"          : rent,
            "Bedrooms"     : rooms,
            //"CategoryID": "39", 
            //"ImageThumb": "http://images.craigslist.org/01414_63IaTOTMW1l_50x50c.jpg", 
            "PostedDate"   : "1390955817", 
            "PostingTitle" : address,
            "PostingURL"   : url
        }));
        
        
        //break;
    }
    decr_noutstanding();

}

function generate_output() {
    console.log(JSON.stringify(listings));
}
