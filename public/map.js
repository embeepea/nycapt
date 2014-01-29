(function($) {

/*    var cloudmade_api_key = "a5b0d6c02084a00bd522ad1ee48e37f"; */
    var cloudmade_api_key = "8ee2a50541944fb9bcedded5165f09d9";

    var subway_routes_to_show = ['L', 'Q', 'R', 'G', 'J'];

    function is_station_on_shown_subway_route(station) {
        var i;
        for (i=0; i<subway_routes_to_show.length; ++i) {
            if (_.contains(station.rts, subway_routes_to_show[i])) {
                return true;
            }
        }
        return false;
    }
    
    $(document).ready(function() {

        var map = L.map('map', {
            'drawControl' : true
        }).setView([40.69, -73.93], 13);

        L.tileLayer("http://{s}.tile.cloudmade.com/" + cloudmade_api_key + "/997/256/{z}/{x}/{y}.png", {
            attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>',
            maxZoom: 18
        }).addTo(map);


        var layerControl = L.control.layers().addTo(map);

                $.ajax({
                    type: 'POST',
                    //data: JSON.stringify(data),
                    contentType: 'application/json',
                    url: '/polygons',
                        success: function(filterPolygons) {
                            var polys = JSON.parse(filterPolygons);
                            var polyLayers = [];
                            _.each(polys, function(polygon) {
                                polyLayers.push(L.polygon(polygon.coords));
                            });
                            var polyLayerGroup = L.layerGroup(polyLayers).addTo(map);
                            layerControl.addOverlay(polyLayerGroup, "Filter Polygons");
                        }
                    });

                $.ajax({
                    type: 'GET',
                    //data: JSON.stringify(data),
                    contentType: 'application/json',
                    url: '/stations.json',
                        success: function(stations) {
//console.log(data);
//                            var stations = JSON.parse(data);
                            var stationCircles = [];
                            _.each(stations, function(station) {
                                if (is_station_on_shown_subway_route(station)) {
                                    var stationCircle = L.circle([station.lat,station.lng], 10, {
                                        color : '#f00',
                                        weight: 2,
                                        fillColor: '#f03',
                                        fillOpacity: 0.5
                                    }).bindPopup(L.popup()
                                                 .setLatLng(L.latLng([station.lat,station.lng]))
                                                 .setContent(Mustache.render($('#stationpopup').text(), {
                                                     'name' : station.nm,
                                                     'routes' : station.rts.join(", ")
                                                 })));
                                    stationCircles.push(stationCircle);
                                }
                            });
                            var stationsLayerGroup = L.layerGroup(stationCircles).addTo(map);

                            layerControl.addOverlay(stationsLayerGroup, "Subway Stations");
                        }
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

        map.on('draw:created', function (e) {
            var type = e.layerType,
                layer = e.layer;

            console.log(type);
            console.log(layer);
            if (type === 'polygon') {

                // this converts the just-drawn polygon to a list of coordinates:
                //    data = [ [lat,lng],[lat,lng],[lat,lng],... ]
                var data = _.map(e.layer._latlngs, function(p) { return [p.lat,p.lng]; });

                $.ajax({
                    type: 'POST',
                    data: JSON.stringify(data),
                    contentType: 'application/json',
                    url: '/addpolygon',
                        success: function(data) {
                            // message: polygon added...
                        }
                    });

            }
            
            // Do whatever else you need to. (save to db, add to map etc)
            map.addLayer(layer);
        });


    });



}(jQuery));
