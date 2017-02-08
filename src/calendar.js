'use strict';

/**
 * Calendar module.
 * @module Calendar
 * @author EternityWall
 * @license LPGL3
 */

const requestPromise = require('request-promise');
const Promise = require('promise');
const Utils = require('./utils.js');
const Context = require('./context.js');
const Timestamp = require('./timestamp.js');

/** Class representing Remote Calendar server interface */
class RemoteCalendar {

  /**
   * Create a RemoteCalendar.
   * @param {string} url - The server url.
   */
  constructor(url) {
    this.url = url;
  }

  /**
   * This callback is called when the result is loaded.
   * @callback resolve
   * @param {Timestamp} timestamp - The timestamp of the Calendar response.
   */

  /**
   * This callback is called when the result fails to load.
   * @callback reject
   * @param {Error} error - The error that occurred while loading the result.
   */

  /**
   * Submitting a digest to remote calendar. Returns a Timestamp committing to that digest.
   * @param {byte[]} digest - The digest hash to send.
   * @returns {Promise} A promise that returns {@link resolve} if resolved
   * and {@link reject} if rejected.
   */
  submit(digest) {
    // console.log('digest ', Utils.bytesToHex(digest));

    const options = {
      url: this.url + '/digest',
      method: 'POST',
      headers: {
        Accept: 'application/vnd.opentimestamps.v1',
        'User-Agent': 'javascript-opentimestamps',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      encoding: null,
      body: new Buffer(digest)
    };

    return new Promise((resolve, reject) => {
      requestPromise(options)
              .then(body => {
                // console.log('body ', body);
                if (body.size > 10000) {
                  console.error('Calendar response exceeded size limit');
                  return;
                }

                const ctx = new Context.StreamDeserialization(body);
                const timestamp = Timestamp.deserialize(ctx, digest);
                resolve(timestamp);
              })
              .catch(err => {
                console.error('Calendar response error: ' + err);
                reject();
              });
    });
  }

  /**
   * Get a timestamp for a given commitment.
   * @param {byte[]} digest - The digest hash to send.
   * @returns {Promise} A promise that returns {@link resolve} if resolved
   * and {@link reject} if rejected.
   */
  getTimestamp(commitment) {
    // console.error('commitment ', Utils.bytesToHex(commitment));

    const options = {
      url: this.url + '/timestamp/' + Utils.bytesToHex(commitment),
      method: 'GET',
      headers: {
        Accept: 'application/vnd.opentimestamps.v1',
        'User-Agent': 'javascript-opentimestamps',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      encoding: null
    };

    return new Promise((resolve, reject) => {
      requestPromise(options)
          .then(body => {
            // /console.log('body ', body);
            if (body.size > 10000) {
              console.error('Calendar response exceeded size limit');
              return reject();
            }
            const ctx = new Context.StreamDeserialization(body);

            const timestamp = Timestamp.deserialize(ctx, commitment);
            return resolve(timestamp);
          })
          .catch(err => {
            if (err.statusCode === 404) {
              // console.error(err.response.body);
            } else {
              console.error('Calendar response error: ' + err);
            }
            return reject();
          });
    });
  }
}

module.exports = {
  RemoteCalendar
};
