var http = require('follow-redirects').http;
var Q = require('q');
var _ = require('underscore');
var sprintf = require('sprintf').sprintf;

module.exports = {

    'getPostings' : function(host, path, callback, options) {

        var settings = {
            timeout : 15000, // 15 second default total timeout
            requestTimeout : 15000, // 15 second default requestTimeout
            resolveClusters : true,
            progressFunc : undefined,
            progressFreq : 5000
        };
        if (options && options.timeout !== undefined) { settings.timeout = options.timeout; }
        if (options && options.requestTimeout !== undefined) { settings.requestTimeout = options.requestTimeout; }
        if (options && options.resolveClusters !== undefined) { settings.resolveClusters = options.resolveClusters; }
        if (options && options.progressFunc !== undefined) { settings.progressFunc = options.progressFunc; }
        if (options && options.progressFreq !== undefined) { settings.progressFreq = options.progressFreq; }

        var deferreds = [];
        var postings = [];
        var nOutstanding = 0;
        var globalTimeout = undefined;
        var progressTimeout = undefined;
        var _progressFunc;

        if (settings.progressFunc) {
            _progressFunc = function() {
                settings.progressFunc(nOutstanding);
                progressTimeout = setTimeout(_progressFunc, settings.progressFreq);
            };
            progressTimeout = setTimeout(_progressFunc, settings.progressFreq);
        }

        function getHttp(host, path, callback) {
            var request = http.request({
                'host': host,
                'path': path
            }, function (res) {
                var data = '';
                res.on('data', function (chunk) {
                    data += chunk;
                });
                res.on('end', function () {
                    callback(data);
                    
                });
            });
            request.on('error', function (e) {
                console.log(e.message);
            });
            request.end();
        }

        function getHttpJson(host, path, callback) {
            getHttp(host, path, function (data) {
                callback( JSON.parse(data) );
            });
        }
        function getHttpJsonPromise(host, path) {
            var deferred = Q.defer();
            getHttpJson(host, path, function(data) {
                deferred.resolve(data);
            });
            deferreds.push(deferred);
            return deferred.promise;
        }

        function incrOutstanding() {
            nOutstanding = nOutstanding + 1;
        }
        function decrOutstanding() {
            nOutstanding = nOutstanding - 1;
            if (nOutstanding <= 0) {
                if (progressTimeout) {
                    clearTimeout(progressTimeout);
                }
                if (globalTimeout !== undefined) {
                    clearTimeout(globalTimeout);
                }
                postings = postings.sort(function(a,b) {
                    return parseInt(b["PostedDate"],10) - parseInt(a["PostedDate"],10);
                });
                callback(postings);
            }
        }
    
        var maxClusters = 1000;
        var nClusters = 0;

        function processJsonResponse(json) {
            var promise;
            _.each(json[0], function(item) {
                var u = item["url"];
                if (item["PostingTitle"] !== undefined) {
                    postings.push(item);
                } else if (item["GeoCluster"] !== undefined) {
                    if (settings.resolveClusters) {
                        nClusters = nClusters + 1;
                        if (nClusters <= maxClusters) {
                            incrOutstanding();
                            promise = getHttpJsonPromise(host, item["url"])
                                .timeout(settings.requestTimeout)
                                .then(function(data) {
                                    processJsonResponse(data);
                                })
                                .fail(function(reason) {
                                    decrOutstanding();
                                });
                        }
                    } else {
                        postings.push(item);
                    }
                }
            });
            decrOutstanding();
        }
        incrOutstanding();
        getHttpJsonPromise(host, path).done(processJsonResponse);

        if (settings.timeout) {
            globalTimeout = setTimeout(function() {
                _.each(deferreds, function (deferred) {
                    if (deferred.promise.isPending()) {
                        deferred.reject(sprintf("global timeout of %1dms reached", settings.timeout));
                    }
                });
            }, settings.timeout);
        }



    }
    
};
