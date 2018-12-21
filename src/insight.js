'use strict'

/**
 * Insight module.
 * @module Insight
 * @author EternityWall
 * @license LPGL3
 */

const requestPromise = require('request-promise')
const Promise = require('promise')
const ChainExplorer = require('./chain-explorer.js')

/** Class used to query Insight API */
class Insight extends ChainExplorer.ChainExplorer {
  /**
   * Create an Insight.
   * @param {int} timeout - timeout (in seconds) used for calls to insight servers
   */
  constructor (url, timeout) {
    super(url, timeout)
    this.urlBlockindex = url + '/block-index'
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
            if (body.size === 0) {
              console.error('Insight response error body ')
              reject(new Error('Insight response error body '))
              return
            }
            resolve(body.blockHash)
          })
          .catch(err => {
            console.error('Insight response error: ' + err.toString().substr(0, 100))
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
              console.error('Insight response error body ')
              return reject(new Error('Insight response error body '))
            }
            if (!body.merkleroot || !body.time) {
              return reject(new Error('Insight response error body '))
            }
            resolve({merkleroot: body.merkleroot, time: body.time})
          })
          .catch(err => {
            console.error('Insight response error: ' + err.toString().substr(0, 100))
            reject(err)
          })
      })
  }
}

module.exports = { Insight }
