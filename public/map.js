(function($) {

/*    var cloudmade_api_key = "a5b0d6c02084a00bd522ad1ee48e37f"; */
    var cloudmade_api_key = "8ee2a50541944fb9bcedded5165f09d9";

    var subway_routes_to_show = ['L', 'Q', 'R', 'G', 'J', '2', '5'];

    var tags = ["new", "hidden", "favorite"];

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
            'drawControl' : true
        }).setView([40.70, -73.97], 14);

        L.tileLayer("http://{s}.tile.cloudmade.com/" + cloudmade_api_key + "/997/256/{z}/{x}/{y}.png", {
            attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>',
            maxZoom: 18
        }).addTo(map);


        var layerControl = L.control.layers().addTo(map);

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
                        // and moves the marker to the hidden group
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
                "posteddate"   : moment.unix(parseInt(posting.PostedDate)).format("D MMM HH:mm:ss"),  //(new Date(parseInt(posting.PostedDate)*1000)).toString(),
                "postingtitle" : posting.PostingTitle,
                "postingurl"   : "http://newyork.craigslist.org" + posting.PostingURL,
                "tags"         : _.map(tags, function(tag) {
                    return {
                        'id'      : 'cb_tag_' + posting.PostingID + '_' + tag,
                        'title'   : tag,
                        'checked' : _.contains(posting.Tags, tag) ? 'checked' : ''
                    };
                }),
                "postingid" : posting.PostingID,
                "lat" : posting.Latitude,
                "lng" : posting.Longitude
            });
        }
    
        function postings_are_close(a,b,epsilon) {
            var dy = a.Latitude - b.Latitude;
            var dx = a.Longitude - b.Longitude;
            var close = (dx*dx + dy*dy) <= epsilon*epsilon;

//console.log('a=['+a.Lng+','+a.Lat+']; b=['+b.Lng+','+b.Lat+']; eps='+epsilon+' ==> ' + close);

            return close;
        }
    
        function assignMarkerPositions(postings, r) {
            var n = postings.length;
            var centroid = { Latitude : 0, Longitude : 0 };
            if (n === 1) {
                postings[0].markerLatitude = postings[0].Latitude;
                postings[0].markerLongitude = postings[0].Longitude;
            } else {
console.log('spreading ' + n + ' markers');
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
            //hiddenPostingLayerGroup = L.layerGroup(hiddenPostingMarkers).addTo(map);
            hiddenPostingLayerGroup = L.layerGroup(hiddenPostingMarkers);
            layerControl.addOverlay(hiddenPostingLayerGroup, "Hidden Postings");
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
        
        
    });
    
}(jQuery));
