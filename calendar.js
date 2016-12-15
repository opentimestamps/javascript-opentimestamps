/**
 * Created by luca on 14/12/16.
 */

const Utils = require('./utils.js');
// var querystring = require('querystring');
// var http = require('http');
const request = require('request');
const fs = require('fs');

class RemoteCalendar {
    // Remote calendar server interface

  constructor(url) {
    this.url = url;
  }

  submit(digest) {
        // Submit a digest to the calendar
        // Returns a Timestamp committing to that digest

    console.log('digest ', Utils.bytesToHex(digest));

    request({
      url: this.url + '/digest',
      method: 'POST',
      headers: {
                // "content-type": "application/xml",  // <--Very important!!!
        Accept: 'application/vnd.opentimestamps.v1',
        'User-Agent': 'javascript-opentimestamps',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: digest
    }, (error, response, body) => {
      console.log('error ', error);
      console.log('response ', response);
      console.log('body ', body);
    });

        // var post_data = querystring.stringify({});
        /* var post_data = digest;

        var post_options = {
            host: this.url,
            port: '80',
            path: '/digest',
            method: 'POST',
            headers: {
                "Accept": "application/vnd.opentimestamps.v1",
                "User-Agent": "javascript-opentimestamps",
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(post_data)
            }
        };

        // Set up the request
        var post_req = http.request(post_options, function(res) {
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                console.log('Response: ' + chunk);
            });
        });

        // post the data
        post_req.write(post_data);
        post_req.end(); */
  }
}

module.exports = {
  RemoteCalendar
};
