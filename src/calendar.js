'use strict'

/**
 * Calendar module.
 * @module Calendar
 * @author EternityWall
 * @license LPGL3
 */

const requestPromise = require('request-promise')
const Promise = require('promise')
const url = require('url')
require('extend-error')
/*
const bitcoin = require('bitcoinjs-lib') // v2.x.x
const bitcoinMessage = require('bitcoinjs-message');
*/
delete global._bitcore
const bitcore = require('bitcore-lib')
const Message = require('bitcore-message')
const Utils = require('./utils.js')
const Context = require('./context.js')
const Timestamp = require('./timestamp.js')

/* Errors */
const CommitmentNotFoundError = Error.extend('CommitmentNotFoundError')
const URLError = Error.extend('URLError')
const ExceededSizeError = Error.extend('ExceededSizeError')

/** Class representing Remote Calendar server interface */
class RemoteCalendar {
  /**
   * Create a RemoteCalendar.
   * @param {string} url - The server url.
   */
  constructor (url) {
    this.url = url
  }

  /**
   * Set private key.
   * @param key The private key.
   */
  setKey (key) {
    this.key = key
  }

  /**
  * Get private key.
  * @return The private key.
  */
  getKey () {
    return this.key
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
  submit (digest) {
    const options = {
      url: url.resolve(this.url, 'digest'),
      method: 'POST',
      headers: {
        Accept: 'application/vnd.opentimestamps.v1',
        'User-Agent': 'javascript-opentimestamps',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      encoding: null,
      body: Buffer.from(digest)
    }
    if (this.key !== undefined) {
      /* var privateKey = this.key.d.toBuffer(32);
      var message = String(digest);
      var messagePrefix = bitcoin.networks.bitcoin.messagePrefix;
      var signature = bitcoinMessage.sign(message, messagePrefix, privateKey, this.key.compressed).toString('base64');
      console.log(signature);
*/
      const privateKey = bitcore.PrivateKey.fromWIF(this.key)
      const message = digest.toString('hex')
      const signature = Message(message).sign(privateKey)
      console.log(signature)

      options.headers['x-signature'] = signature
    }

    return new Promise((resolve, reject) => {
      requestPromise(options)
        .then(body => {
          // console.log('body ', body);
          if (body.size > 10000) {
            return reject(new ExceededSizeError('Calendar response exceeded size limit'))
          }

          const ctx = new Context.StreamDeserialization(body)
          const timestamp = Timestamp.deserialize(ctx, digest)
          resolve(timestamp)
        })
        .catch(err => {
          return reject(new URLError(err.error.toString()))
        })
    })
  }

  /**
   * Get a timestamp for a given commitment.
   * @param {byte[]} digest - The digest hash to send.
   * @returns {Promise} A promise that returns {@link resolve} if resolved
   * and {@link reject} if rejected.
   */
  getTimestamp (commitment) {
    const options = {
      url: url.resolve(this.url, 'timestamp/') + Utils.bytesToHex(commitment),
      method: 'GET',
      headers: {
        Accept: 'application/vnd.opentimestamps.v1',
        'User-Agent': 'javascript-opentimestamps',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      encoding: null
    }

    return new Promise((resolve, reject) => {
      requestPromise(options)
        .then(body => {
          // /console.log('body ', body);
          if (body.size > 10000) {
            return reject(new ExceededSizeError('Calendar response exceeded size limit'))
          }
          const ctx = new Context.StreamDeserialization(body)

          const timestamp = Timestamp.deserialize(ctx, commitment)
          return resolve(timestamp)
        })
        .catch(err => {
          if (err.statusCode === 404) {
            return reject(new CommitmentNotFoundError(err.error.toString()))
          }
          return reject(new URLError(err.error.toString()))
        })
    })
  }
}

module.exports = {
  RemoteCalendar,
  CommitmentNotFoundError,
  URLError,
  ExceededSizeError
}
