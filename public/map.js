(function($) {

/*    var cloudmade_api_key = "a5b0d6c02084a00bd522ad1ee48e37f"; */
    var cloudmade_api_key = "8ee2a50541944fb9bcedded5165f09d9";

    var subway_routes_to_show = ['A', 'C', 'E', 'L', 'N', 'Q', 'G', 'J', '4', '6'];

    var tags = ["new", "hidden", "favorite", "expired", "shared", "contacted"];

    var marker_icon_size = [20, 24];
    var marker_pngs = {
        'green'   : "/images/markers/marker-20x24-00e03c.png",
        'blue'    : "/images/markers/marker-20x24-4462c8.png",
        'cyan'    : "/images/markers/marker-20x24-54d6d6.png",
        'purple'  : "/images/markers/marker-20x24-7d54fb.png",
        'magenta' : "/images/markers/marker-20x24-e14f9e.png",
        'red'     : "/images/markers/marker-20x24-fb6254.png",
        'yellow'  : "/images/markers/marker-20x24-fcf357.png",
        'gray'    : "/images/markers/marker-20x24-cccccc.png"
    };

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
            // options here
        }).setView([40.70, -73.97], 14);




        L.circle([40.720666,-73.99906], 100, {
                        color : '#000',
                        weight: 2,
                        fillColor: '#0ff',
                        fillOpacity: 0.5
                    }).bindPopup('<b>Hacker School</b>').addTo(map);


        map.addControl(new L.Control.Draw({
            draw: {
                polyline: false,
                circle: false, // Turns off this drawing tool
                rectangle: false,
                marker: false
            }
        }));

        var cloudmadeBaseLayer = L.tileLayer("http://{s}.tile.cloudmade.com/" + cloudmade_api_key + "/997/256/{z}/{x}/{y}.png", {
//            attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>',
            maxZoom: 18
        }).addTo(map);

        var osmBaseLayer = L.tileLayer("http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 18
        });


        var layerControl = L.control.layers({
            'Cloudmade' : cloudmadeBaseLayer,
            'Open Street Map' : osmBaseLayer
        }).addTo(map);

        function createFilterPolygonsLayer(filterPolygons) {
            var polyLayers = [];
            _.each(filterPolygons, function(polygon) {
                polyLayers.push(L.polygon(polygon.coords));
            });
            layerControl.addOverlay(L.layerGroup(polyLayers).addTo(map), "Filter Polygons");
        }

        $.ajax({
            type: 'POST',
            contentType: 'application/json',
            url: '/filterPolygons',
            success: function(filterPolygons) {
                createFilterPolygonsLayer(JSON.parse(filterPolygons));
            }
        });

        function createNeighborhoodsLayer(nhoods) {
            var colors = ["#00e03c","#4462c8","#44c862","#54d6d6","#7d54fb","#fb7d54","#e14f9e","#fb6254","#fcf357","#cccccc"];
            var color_i = 0;


            function switchCoords(list) {
                if (list.length == 0) { return list; }
                if (typeof(list[0]) === "number") { return [ list[1], list[0] ]; }
                return _.map(list, switchCoords);
            }


            var nhoodsLayers = [];


            _.each(nhoods.features, function(feature) {
                var gon;
                if (feature.geometry.type === "Polygon") {
                    nhoodsLayers.push(gon = L.polygon(switchCoords(feature.geometry.coordinates), {
                        "fillColor" : colors[color_i++ % colors.length],
                        "color" : "#000000",
                        "weight" : 2
                    }).bindLabel(feature.properties.NAME));
                } else if (feature.geometry.type === "MultiPolygon") {
                    nhoodsLayers.push(gon = L.multiPolygon(switchCoords(feature.geometry.coordinates),{
                        "fillColor" : colors[color_i++ % colors.length],
                        "color" : "#000000",
                        "weight" : 2
                    }).bindLabel(feature.properties.NAME));
                }

            });


            layerControl.addOverlay(L.layerGroup(nhoodsLayers).addTo(map), "Neighborhoods");
        }

        $.ajax({
            type: 'GET',
            contentType: 'application/json',
            url: '/nhoods/neighborhoods.json',
            success: function(nhoods) {
                createNeighborhoodsLayer(nhoods);
            }
        });

        function createStationsLayer(stations) {
            var stationCircles = [];
            _.each(stations, function(station) {
                if (is_station_on_shown_subway_route(station)) {
                    var stationCircle = L.circle([station.lat,station.lng], 10, {
                        color : '#f00',
                        weight: 2,
                        fillColor: '#f03',
                        fillOpacity: 0.5
                    }).bindPopup(Mustache.render($('#stationpopup').text(), {
                        'name' : station.nm,
                        'routes' : station.rts.join(", ")
                    }));
                    stationCircles.push(stationCircle);
                }
            });
            layerControl.addOverlay(L.layerGroup(stationCircles).addTo(map), "Subway Stations");
        }

        $.ajax({
            type: 'GET',
            contentType: 'application/json',
            url: '/stations.json',
            success: function(stations) {
                createStationsLayer(stations);
            }
        });

        var postingsByPostingID = {};
        var postingLayerGroup;
        var hiddenPostingLayerGroup;

        function save_tags(posting) {
            $.ajax({
                type: 'POST',
                data: JSON.stringify({
                    'PostingID' : posting.PostingID,
                    'tags'      : posting.Tags
                }),
                contentType: 'application/json',
                url: '/settags',
                success: function(data) {
                    //...
                }
            });
        }

        function save_notes(posting) {
            $.ajax({
                type: 'POST',
                data: JSON.stringify({
                    'PostingID' : posting.PostingID,
                    'notes'     : posting.Notes
                }),
                contentType: 'application/json',
                url: '/postnotes',
                success: function(data) {
                    //...
                }
            });
        }

        var textarea_input_timeouts = {}; // hash to store timeouts for textarea widgets, keyed by postingid
        window.do_textarea = function(e) {
            // this function gets called on every keystroke in the input area ("oninput" event)
            var id = e.target.id;
            var checked = e.target.checked;
            var m = id.match(/notes_([^_]+)/);
            if (m) {
                var postingid = m[1];
                var posting = postingsByPostingID[postingid];
                posting.Notes = $('#'+id).val();
                // persist Notes value to server after 2 seconds of no typing
                if (textarea_input_timeouts[postingid]) {
                    clearTimeout(textarea_input_timeouts[postingid]);
                }
                textarea_input_timeouts[postingid] = setTimeout(function() {
                    save_notes(posting);
                    textarea_input_timeouts[postingid] = undefined;
                }, 2000);
            }
        };

        window.do_checkbox = function(e) {
            var id = e.target.id;
            var checked = e.target.checked;
            var m = id.match(/cb_tag_([^_]+)_([^_]+)/);
            if (m) {
                var postingid = m[1];
                var tag = m[2];
                var posting = postingsByPostingID[postingid];
                if (checked) {
                    $('#'+id).attr('checked', 'checked');
                    posting.Tags = _.union(posting.Tags, tag);
                    if (tag !== "new") {
                        // adding any tag other than "new" automatically removes the "new" tag
                        posting.Tags = _.without(posting.Tags, "new");
                        // and unsets the "new" checkbox on the dialog
                        $('#cb_tag_'+postingid+'_new').removeAttr('checked');
                    }
                    if (tag === "hidden") {
                        // adding the "hidden" tag moves the marker to the hidden group
                        postingLayerGroup.removeLayer(posting.marker);
                        hiddenPostingLayerGroup.addLayer(posting.marker);
                    }
                } else {
                    $('#'+id).attr('checked', 'undefined');
                    posting.Tags = _.without(posting.Tags, tag);
                    if (tag === "hidden") {
                        // removing the "hidden" tag moves the marker to the non-hidden group
                        hiddenPostingLayerGroup.removeLayer(posting.marker);
                        postingLayerGroup.addLayer(posting.marker);
                    }
                }
                save_tags(posting);
                setMarkerColor(posting.marker, postingColor(posting));
            }
            return true;
        };

        function setMarkerColor(marker, color) {
            marker.setIcon(L.icon({
                iconUrl: marker_pngs[color],
                iconSize: marker_icon_size
            }));
        }

        function postingColor(posting) {
            if (_.contains(posting.Tags, "contacted")) {
                return "yellow";
            }
            if (_.contains(posting.Tags, "new")) {
                return "green";
            }
            if (_.contains(posting.Tags, "hidden")) {
                return "gray";
            }
            if (_.contains(posting.Tags, "favorite")) {
                return "red";
            }
            return "purple";
        }

        function postingPopupHtml(posting) {
            return Mustache.render($('#postingpopup').text(), {
                "ask"          : posting.Ask,
                "bedrooms"     : posting.Bedrooms,
                "imagethumb"   : posting.ImageThumb ? ('<img src="' + posting.ImageThumb + '">') : "",
                "posteddate"   : moment.unix(parseInt(posting.PostedDate,10)).format("D MMM HH:mm:ss"),  //(new Date(parseInt(posting.PostedDate)*1000)).toString(),
                "postingtitle" : posting.PostingTitle,
                "postingurl"   : "http://newyork.craigslist.org" + posting.PostingURL,
                "postingid"    : posting.PostingID,
                "notes"        : posting.Notes,
                "tags"         : _.map(tags, function(tag) {
                    return {
                        'tag'     : tag,
                        'checked' : _.contains(posting.Tags, tag) ? 'checked' : ''
                    };
                }),
                "pid"       : posting.Pid,
                "postingid" : posting.PostingID,
                "lat"       : posting.Latitude,
                "lng"       : posting.Longitude
            });
        }
    
        function postings_are_close(a,b,epsilon) {
            var dy = a.Latitude - b.Latitude;
            var dx = a.Longitude - b.Longitude;
            var close = (dx*dx + dy*dy) <= epsilon*epsilon;
            return close;
        }
    
        function assignMarkerPositions(postings, r) {
            var n = postings.length;
            var centroid = { Latitude : 0, Longitude : 0 };
            if (n === 1) {
                postings[0].markerLatitude = postings[0].Latitude;
                postings[0].markerLongitude = postings[0].Longitude;
            } else {
                // compute the centroid of the n postings in this group
                _.each(postings, function(p) {
                    centroid.Latitude += p.Latitude;
                    centroid.Longitude += p.Longitude;
                });
                centroid.Latitude /= n;
                centroid.Longitude /= n;
                // assign positions evenly distributed around a circle of radius r, centered at the centroid
                _.each(postings, function(p,i) {
                    var a = i * 2*Math.PI/n;
                    p.markerLongitude = centroid.Longitude + r * Math.cos(a);
                    p.markerLatitude = centroid.Latitude + r * Math.sin(a);
                });
                
            }
        }

        var markerEpsilon = 0.001;
        
        function calculateMarkerPositions(postings) {
            var done = {};
            var groups = [];
            var i, j, pi, pj, g;
            
            for (i=0; i<postings.length; ++i) {
                pi = postings[i];
                if (!done[pi.PostingID]) {
                    // pi is not done.  Find all the postings within epsilon of it, and make a group
                    // of them.
                    g = [ pi ];
                    done[pi.PostingID] = true;
                    for (j=i; j<postings.length; ++j) {
                        pj = postings[j];
                        if (!done[pj.PostingID]) {
                            if (postings_are_close(pi,pj,markerEpsilon)) {
                                g.push(pj);
                                done[pj.PostingID] = true;
                            }
                        }
                    }
                }
                groups.push(g);
            }
            _.each(groups, function(g) {
                assignMarkerPositions(g, 0.25 * markerEpsilon);
            });
        }

        function createPostingsLayers(postings) {
            calculateMarkerPositions(postings);
            var postingMarkers = [];
            var hiddenPostingMarkers = [];
            _.each(postings, function(posting) {
                posting.marker = L.marker([posting.markerLatitude,posting.markerLongitude], {
                    title : posting.PostingTitle
                }).bindPopup();
                
                // set the content of the popup dynamically when it appears, rather than in advance, so that the
                // checkbox settings (and other future dynamic content) will be correctly populated based on the
                // current values in the posting object
                posting.marker.on('popupopen', function() {
                    posting.marker.setPopupContent(postingPopupHtml(posting));
                });
                
                setMarkerColor(posting.marker, postingColor(posting));
                postingsByPostingID[posting.PostingID] = posting;
                if (_.contains(posting.Tags, "hidden")) {
                    hiddenPostingMarkers.push(posting.marker);
                } else {
                    postingMarkers.push(posting.marker);
                }
            });
            postingLayerGroup = L.layerGroup(postingMarkers).addTo(map);
            layerControl.addOverlay(postingLayerGroup, "Postings");
            hiddenPostingLayerGroup = L.layerGroup(hiddenPostingMarkers);
            layerControl.addOverlay(hiddenPostingLayerGroup, "Hidden Postings");

            function set_dynamic_filter() {
                var maxAge = parseInt($('#hide_text_input').val(),10);
                if (isNaN(maxAge)) { maxAge = 999999; }
                var now = Number(((new Date()).getTime()/1000).toFixed(0)); // seconds since the epoch
                var minPrice = parseInt($('#min_price_input').val(),10);
                if (isNaN(minPrice)) { minPrice = 0; }
                var maxPrice = parseInt($('#max_price_input').val(),10);
                if (isNaN(maxPrice)) { maxPrice = 999999; }
                $('#hide_text_input').val(maxAge>0 && maxAge<999999 ? maxAge : "");
                $('#min_price_input').val(minPrice>0 && minPrice<999999 ? minPrice : "");
                $('#max_price_input').val(maxPrice>0 && maxPrice<999999 ? maxPrice : "");
                postingLayerGroup.clearLayers();
                hiddenPostingLayerGroup.clearLayers();
                _.each(postings, function(posting) {
                    var price = parseInt(posting.Ask,10);
                    if (price===undefined || isNaN(price)) { price = 0; }
                    var age = (now - parseInt(posting.PostedDate, 10)) / 86400; // age in days; (86400 = 60*60*24 seconds/day)
                    if (maxPrice !== undefined && price < minPrice) { return; } // posting too expensive
                    if (maxPrice !== undefined && price > maxPrice) { return; } // posting too cheap
                    if (age > maxAge) { return; } // posting too old
                    if (_.contains(posting.Tags, "hidden")) {
                        hiddenPostingLayerGroup.addLayer(posting.marker);
                    } else {
                        postingLayerGroup.addLayer(posting.marker);
                    }
                });
            }

            var dynamic_filter_timeout;
            window.do_dynamic_filter = function(event) {
                // this function gets called on every keystroke in the input area ("oninput" event)
                if (dynamic_filter_timeout) {
                    clearTimeout(dynamic_filter_timeout);
                }
                dynamic_filter_timeout = setTimeout(function() {
                    set_dynamic_filter();
                    dynamic_filter_timeout = undefined;
                }, 2000);
            };

            var search_timeout;
            window.do_search = function(event) {
                // this function gets called on every keystroke in the input area ("oninput" event)
                if (search_timeout) {
                    clearTimeout(search_timeout);
                }
                search_timeout = setTimeout(function() {
                    search_go();
                    search_timeout = undefined;
                }, 2000);
            };

            function search_go() {
                var searchText = $('#search_input').val();
                var searchInt = parseInt(searchText,10);
                var posting;
                if (searchText) {
                    posting = _.find(postings, function(posting) {
                        if (posting.PostingID === searchText) { return true; }
                        if (posting.Pid === searchInt) { return true; }
                        if (posting.PostingTitle.match(searchText)) { return true; }
                        if (posting.Notes && posting.Notes.match(searchText)) { return true; }
                        return false;
                    });
                    // only show the found posting if it is currently in one of the posting layer groups (otherwise it must have
                    // been eliminated by a dynamic search)
                    if (posting && (hiddenPostingLayerGroup.hasLayer(posting.marker) || postingLayerGroup.hasLayer(posting.marker))) {
                        // if the posting is hidden, turn on hidden postings, if they're not already on
                        if (_.contains(posting.Tags, "hidden") && !map.hasLayer(hiddenPostingLayerGroup)) {
                            hiddenPostingLayerGroup.addTo(map);
                        }
                        map.setView(posting.marker.getLatLng(), 14);
                        posting.marker.openPopup();
                    }
                }
            }


        }

        $.ajax({
            type: 'GET',
            contentType: 'application/json',
            url: '/postings',
            success: function(postings) {
                createPostingsLayers(JSON.parse(postings));
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
            if (googling) {
                hideMessage();
                googling = false;
                url = 'http://maps.google.com/?q='+e.latlng.lat+','+e.latlng.lng;
                //url = 'https://www.google.com/maps/preview/@'+e.latlng.lat+','+e.latlng.lng+',15z';
                window.open(url, '_blank');
            }
        });

        
    });
    
}(jQuery));
