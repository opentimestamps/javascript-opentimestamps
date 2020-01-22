'use strict'

/**
 * Calendar module.
 * @module Calendar
 * @author EternityWall
 * @license LPGL3
 */

const requestPromise = require('request-promise')
const minimatch = require('minimatch')
require('./extend-error.js')

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
      'Content-Type': 'application/x-www-form-urlencoded'
    }
    if (!process.browser) { // only in node.js
      this.headers['User-Agent'] = 'javascript-opentimestamps'
    }
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
      url: new URL('/digest', this.url),
      method: 'POST',
      headers: this.headers,
      timeout: this.timeout,
      encoding: null,
      body: Buffer.from(digest)
    }

    return requestPromise(options)
      .then(body => {
        if (body.size > 10000) {
          throw new ExceededSizeError('Calendar response exceeded size limit')
        }
        const ctx = new Context.StreamDeserialization(body)
        const timestamp = Timestamp.deserialize(ctx, digest)
        return timestamp
      }).catch(err => {
        throw new URLError(err.error.toString())
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
      url: new URL('/timestamp/' + Utils.bytesToHex(commitment), this.url),
      method: 'GET',
      headers: this.headers,
      timeout: this.timeout,
      encoding: null
    }

    return requestPromise(options)
      .then(body => {
        if (body.size > 10000) {
          throw new ExceededSizeError('Calendar response exceeded size limit')
        }
        const ctx = new Context.StreamDeserialization(body)
        const timestamp = Timestamp.deserialize(ctx, commitment)
        return timestamp
      }).catch(err => {
        if (err.statusCode === 404) {
          throw new CommitmentNotFoundError(err.error.toString())
        }
        throw new Error(err.error.toString())
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

const DEFAULT_CALENDAR_WHITELIST = new UrlWhitelist(
  ['https://*.calendar.opentimestamps.org', // Run by Peter Todd
    'https://*.calendar.eternitywall.com', // Run by Riccardo Casatta of Eternity Wall
    'https://*.calendar.catallaxy.com' // Run by Vincent Cloutier of Catallaxy
  ])

const DEFAULT_AGGREGATORS =
['https://a.pool.opentimestamps.org',
  'https://b.pool.opentimestamps.org',
  'https://a.pool.eternitywall.com',
  'https://ots.btc.catallaxy.com'
]

module.exports = {
  RemoteCalendar,
  UrlWhitelist,
  DEFAULT_CALENDAR_WHITELIST,
  DEFAULT_AGGREGATORS,
  CommitmentNotFoundError,
  URLError,
  ExceededSizeError
}
