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
const minimatch = require('minimatch')
require('./extend-error.js')
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
    this.headers = {
      Accept: 'application/vnd.opentimestamps.v1',
      'User-Agent': 'javascript-opentimestamps',
      'Content-Type': 'application/x-www-form-urlencoded'
    }
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
      headers: this.headers,
      encoding: null,
      body: Buffer.from(digest)
    }
    if (this.key !== undefined) {
      const privateKey = bitcore.PrivateKey.fromWIF(this.key)
      const message = Utils.bytesToHex(digest)
      const signature = Message(message).sign(privateKey)
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
      headers: this.headers,
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
          return reject(new Error(err.error.toString()))
        })
    })
  }
}

class UrlWhitelist {
  constructor (urls) {
    this.urls = new Set()
    if (!urls) {
      return
    }
    urls.forEach(u => this.add(u))
  }

  add (url) {
    if (typeof (url) !== 'string') {
      throw new TypeError('URL must be a string')
    }
    if (url.startsWith('http://') || url.startsWith('https://')) {
      this.urls.add(url)
    } else {
      this.urls.add('http://' + url)
      this.urls.add('https://' + url)
    }
  }

  contains (url) {
    return [...this.urls].filter(u => minimatch(url, u)).length > 0
  }

  toString () {
    return 'UrlWhitelist([' + this.urls.join(',') + '])'
  }
}

const DEFAULT_CALENDAR_WHITELIST =
    new UrlWhitelist(['https://*.calendar.opentimestamps.org', // Run by Peter Todd
    'https://*.calendar.eternitywall.com', // Run by Riccardo Casatta of Eternity Wall
    'https://*.calendar.catallaxy.com' // Run by Vincent Cloutier of Catallaxy
  ])

const DEFAULT_AGGREGATORS =
    ['https://a.pool.opentimestamps.org',
      'https://b.pool.opentimestamps.org',
      'https://a.pool.eternitywall.com',
      'https://ots.btc.catallaxy.com']

module.exports = {
  RemoteCalendar,
  UrlWhitelist,
  DEFAULT_CALENDAR_WHITELIST,
  DEFAULT_AGGREGATORS,
  CommitmentNotFoundError,
  URLError,
  ExceededSizeError
}
