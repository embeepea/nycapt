#! /usr/bin/node

var https = require('https');

function geocode(address, callback) {
    https.request({
        host : "maps.google.com",
        path : "/maps?q="+encodeURIComponent(address)+"&output=classic&dg=ntvb"
    }, function(response) {
        var str = '';
        response.on('data', function(chunk) {
            str += chunk;
        });
        response.on('end', function() {
            var m = str.match('latlng:{lat:([-\\.\\d]+),lng:([-\\.\\d]+)}');
            var lat = m[1];
            var lon = m[2];
            callback(lat,lon);
        });
    }).end();
}

module.exports = { geocode : geocode };

//geocode('196 Marine Blvd, Moss Beach CA', function(lat,lon) {
//  console.log('lat = ' + lat + ', lon = ' + lon);
//});
