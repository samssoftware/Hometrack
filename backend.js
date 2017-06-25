"use strict";
var http = require('http');

/* checks if the fields exist in the object.. if all fields exist returns true.. otherwise false */
function valid_fields( fields, obj) {

    var valid = true;

    fields.every(function(value) {
        return valid = obj.hasOwnProperty( value );
    });

    return valid;
}

/* sends a error message to client .. if function caller does not pass-in error text then uses a default message */
function report_error(res, errText) {

    if( arguments.length == 1) // if no error message is not passed then assign default error message
    {
        errText = "Could not decode request: JSON parsing failed"
    }

    res.writeHead(400, {'Content-Type': 'text/json'});
    res.end(JSON.stringify({ "error" :  errText}));
}

function requestListener(req, res){

    /* the fields below will be used for the following purpose
     1. Validate the incoming data to confirm the field actually exist if not a error  will be returned to caller
     2. If the above check passes the response will be sent to caller based on the values in fields.
     note that the order in which the address fields are listed is important as it will effect the order in which the
     values are included in the response
     */
    const address_fields = [ 'buildingNumber', 'street', 'suburb', 'state', 'postcode'];
    const other_fields = ['type', 'workflow'];

    if(req.method != 'POST' )
    {
        report_error(res, "Only POST method with JSON parameters in Body is supported. e.g: Query Parameters in URI will be ignored");
        return;
    }

    var body = '';
    req.on('data', function (data) {
        body += data;
    });

    req.on('end', function () {

        try {
            var o = JSON.parse(body);
        } catch (e) {
            report_error(res);
            return;
        }

        if( !o.hasOwnProperty('payload') ) {
            report_error(res);
            return;
        }

        var jsonResponse =  { "response": [] };

        for (var i = 0; i < o['payload'].length; i++) {

            var j = o['payload'][i];

            if ( !j.hasOwnProperty('address') || !valid_fields(address_fields, j.address )  || !valid_fields(other_fields, j ) ){
                report_error(res);
                return;
            }

            var addressStr='';
            address_fields.forEach(function(value) {
                if(addressStr.length > 0)           // if this is not the first field append a space to previous string
                    addressStr += ' ';
                addressStr += j.address[value];
            });

            var r = {};
            r["concataddress"] = addressStr;
            r["type"] = j.type;
            r["workflow"] = j.workflow;
            jsonResponse['response'].push(r);

        }

        res.writeHead(200, {"Content-Type": "application/json"});   // send final result to client
        res.end(JSON.stringify(jsonResponse));
    });
}

var server = http.createServer(requestListener);    // Create server
server.listen(8080);