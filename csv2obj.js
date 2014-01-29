/*
 * csv2obj reads a csv file and returns a JS object representing the file's contents.
 * The input file must start with a line containing a comma-separated list of field names.
 * Each subsequent line must contain a comma-separated list of field values.
 * The file should not contain comments or blank lines.
 * The specified callback is called once the file has been read; it is passed an object
 * with two properties: 'keys', which is an array of property names, and 'data', which an
 * array of objects having properties with those names.
 */
module.exports  = function(file, callback) {

    var lineReader = require('line-reader');

    var gotHeader = false;
    var obj = { 'data' : [] };
    lineReader.eachLine(file, function(line) {
        var fields = line.trim().split(','), i, e;
        if (fields.length > 0) {
            if (! gotHeader) {
                obj.keys = fields;
                gotHeader = true;
            } else {
                e = {};
                for (i=0; i<obj.keys.length; ++i) {
                    e[obj.keys[i]] = fields[i];
                }
                obj.data.push(e);
            }
        }
    }).then(function() {
        callback(obj);
    });
}
