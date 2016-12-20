'use strict';
/**
 * Created by luca on 14/12/16.
 */
const request = require('request');
const Utils = require('./utils.js');
// const querystring = require('querystring');
// const http = require('http');
// const fs = require('fs');

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
      data: digest
    }, (error, response, body) => {
      //console.log('error ', error);
      //console.log('response ', response);
        let output=response.body;
      console.log('body ',output);
    });
  }
}

module.exports = {
  RemoteCalendar
};
