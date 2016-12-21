'use strict';
/**
 * Created by luca on 14/12/16.
 */
const Request = require('request');
const Utils = require('./utils.js');
const Context = require('./context.js');
const Timestamp = require('./timestamp.js');
const RequestPromise = require('request-promise');
var Promise = require("promise");
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

    //let test='96f4e14889c69ddfb3dca5c59516b12530ab54e04f7b134e1a9c2b1f215b647b';
    //digest = new Buffer(test, 'hex');


    console.log('digest ', Utils.bytesToHex(digest) );

    let options = {
      url: this.url + '/digest',
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.opentimestamps.v1',
        'User-Agent': 'javascript-opentimestamps',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      encoding: null,
      body: new Buffer(digest)
    };



      return new Promise(function (resolve, reject) {

          RequestPromise(options)
              .then(function (body) {
                  console.log('body ', body);
                  if (body.size > 10000){
                      console.log("Calendar response exceeded size limit");
                      return;
                  }

                  const ctx = new Context.StreamDeserialization();
                  ctx.open(Utils.arrayToBytes(body));


                  let timestamp = Timestamp.deserialize(ctx, digest);
                  resolve(timestamp);

              })
              .catch(function (error) {
                  console.log("Calendar response error: " + error);
                  resolve();
              });
      });


  }
}

module.exports = {
  RemoteCalendar
};
