(function($) {




/*    var cloudmade_api_key = "a5b0d6c02084a00bd522ad1ee48e37f"; */
    var cloudmade_api_key = "8ee2a50541944fb9bcedded5165f09d9";
    var itemEntryHtml;
    $.ajax({
        url : 'itemEntryPopup.html',
        dataType: "text",
        success:  function (data) {
            itemEntryHtml = data;
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.log(textStatus);
            console.log(jqXHR);
            console.log(errorThrown);
        }
    });
    
    $(document).ready(function() {

        var map = L.map('map', {
            'drawControl' : true
        }).setView([40.69, -73.93], 13);

        L.tileLayer("http://{s}.tile.cloudmade.com/" + cloudmade_api_key + "/997/256/{z}/{x}/{y}.png", {
            attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>',
            maxZoom: 18
        }).addTo(map);


L.circle([40.717304,-73.956872], 100, {
  color: 'red',
  fillColor: '#0f3',
  fillOpacity: 0.5
}).addTo(map);

        map.on('draw:created', function (e) {
            var type = e.layerType,
                layer = e.layer;

            console.log(type);
            console.log(layer);
            if (type === 'marker') {
                // Do marker specific actions
            }
            
            // Do whatever else you need to. (save to db, add to map etc)
            map.addLayer(layer);
        });


        var messageAreaVisible;

        var displayMessage = function(txt) {
            $('#messagearea').html(txt);
            if (!messageAreaVisible) {
                $('#messagearea').fadeIn(100);
            }
            messageAreaVisible = true;
        };
        var hideMessage = function(txt) {
            $('#messagearea').fadeOut(200);
            messageAreaVisible = false;
        };

        $('#messagearea').hide();
        messageAreaVisible = false;


        var addItem = function(lat,lng) {
             var circle = L.circle([lat, lng], 500, {
               color: 'red',
               fillColor: '#f03',
               fillOpacity: 0.5
             }).addTo(map).bindPopup(itemEntryHtml).openPopup();
        };

        var adding = false;
        $("button.additem").click(function() {
            if (adding) {
                hideMessage();
                adding = false;
            } else {
                displayMessage("Add an item by clicking somewhere on the map");
                adding = true;
            }
        });

        var googling = false;
        $("button.googleclick").click(function() {
            if (googling) {
                hideMessage();
                googling = false;
            } else {
                displayMessage("Click in the map to open a location in Google Maps");
                googling = true;
            }
        });

        map.on('click', function (e) {
            if (adding) {
                addItem(e.latlng.lat, e.latlng.lng);
                console.log("You added an item at " + e.latlng);
                hideMessage();
                adding = false;
            } else if (googling) {
                hideMessage();
                googling = false;
                url = 'https://www.google.com/maps/preview/@'+e.latlng.lat+','+e.latlng.lng+',15z';
                window.open(url, '_blank');
            }
        });



/*
        var osmUrl='http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        var osmAttrib='Map data © OpenStreetMap contributors';
        var osm = new L.TileLayer(osmUrl, {
            minZoom: 2,
            maxZoom: 20,
            attribution: osmAttrib
        });
        map.addLayer(osm);
*/




    });



}(jQuery));
