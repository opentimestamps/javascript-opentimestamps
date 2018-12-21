'use strict'

/**
 * Blockstream module.
 * @module Blockstream
 * @author federicoon, fametrano
 * @license LPGL3
 */

const requestPromise = require('request-promise')
const Promise = require('promise')
const ChainExplorer = require('./chain-explorer.js')

/** Class used to query Blockstream API */
class Blockstream extends ChainExplorer.ChainExplorer {
  /**
   * Create a RemoteCalendar.
   * @param {int} timeout - timeout (in seconds) used for calls to Blockstream server
   */
  constructor (url, timeout) {
    super(url, timeout)
    this.urlBlockindex = url + '/block-height'
    this.urlBlock = url + '/block'
  }

  /**
   * This callback is called when the result is loaded.
   *
   * @callback resolve
   * @param {Timestamp} timestamp - The timestamp of the Calendar response.
   */

  /**
   * This callback is called when the result fails to load.
   *
   * @callback reject
   * @param {Error} error - The error that occurred while loading the result.
   */

  /**
   * Retrieve the block hash by calling an explorer server.
   * @param {Object} options - The http request options.
   * @returns {Promise} A promise that returns {@link resolve} if resolved
   * and {@link reject} if rejected.
   */
  parseBlockhash (options) {
    return new Promise((resolve, reject) => {
        requestPromise(options)
          .then(body => {
            if (!body) {
              console.error('Blockstream response error body ')
              reject(new Error('Blockstream response error body '))
              return
            }
            resolve(body)
          })
          .catch(err => {
            console.error('Blockstream response error: ' + err.toString().substr(0, 100))
            reject(err)
          })
      })
  }

  /**
   * Retrieve the block information by calling an explorer server.
   * @param {Object} options - The http request options.
   * @returns {Promise} A promise that returns {@link resolve} if resolved
   * and {@link reject} if rejected.
   */
  parseBlockInfo (options) {
    return new Promise((resolve, reject) => {
        requestPromise(options)
          .then(body => {
            if (!body) {
              console.error('Blockstream response error body ')
              return reject(new Error('Blockstream response error body '))
            }
            if (!body.merkle_root || !body.timestamp) {
              return reject(new Error('Blockstream response error body '))
            }
            resolve({merkleroot: body.merkle_root, time: body.timestamp})
          })
          .catch(err => {
            console.error('Blockstream response error: ' + err.toString().substr(0, 100))
            reject(err)
          })
      })
  }
}

module.exports = { Blockstream }
