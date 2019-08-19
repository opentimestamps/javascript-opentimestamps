'use strict'

/**
 * Esplora module.
 * @module Esplora
 * @author EternityWall
 * @license LPGL3
 */

const requestPromise = require('request-promise')
require('./extend-error.js')
const URLError = Error.extend('URLError')

// Default public Esplora explorer url
const PUBLIC_ESPLORA_URL = 'https://blockstream.info/api'

/** Class used to query Esplora API */
module.exports = class Esplora {
  /**
   * Create a Esplora.
   * @param {Object} options - Esplora options parameters
   * @param {String} options.url -  explorer url
   * @param {int} options.timeout - timeout (in seconds) used for calls to esplora servers
   */
  constructor (options = {}) {
    this.url = options.url ? options.url : PUBLIC_ESPLORA_URL
    this.timeout = options.timeout ? options.timeout : 1000
  }

  /**
   * Retrieve the block hash from the block height.
   * @param {String} height - Height of the block.
   * @returns {Promise<String>} A promise that returns blockhash string
   */
  blockhash (height) {
    const options = {
      url: this.url + '/block-height/' + height,
      method: 'GET',
      headers: { Accept: 'plain/text' },
      timeout: this.timeout,
      gzip: true
    }
    return requestPromise(options)
      .then(body => {
        if (!body) { throw URLError('Empty body') }
        return body
      }).catch(err => {
        console.error('Response error: ' + err.toString().substr(0, 100))
        throw err
      })
  }

  /**
   * Retrieve the block information from the block hash.
   * @param {Long} height - Height of the block.
   * @returns {Promise<String,Long>} A promise that returns merkleroot and timestamp
   */
  block (hash) {
    const options = {
      url: this.url + '/block/' + hash,
      method: 'GET',
      headers: { Accept: 'application/json' },
      json: true,
      timeout: this.timeout,
      gzip: true
    }
    return requestPromise(options)
      .then(body => {
        if (!body) { throw URLError('Empty body') }
        if (!body.merkle_root || !body.timestamp) {
          throw URLError(body)
        }
        return { merkleroot: body.merkle_root, time: body.timestamp }
      }).catch(err => {
        console.error('Response error: ' + err.toString().substr(0, 100))
        throw err
      })
  }
}
