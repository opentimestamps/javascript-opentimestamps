'use strict'

/**
 * ChainExplorer module.
 * @module ChainExplorer
 * @author federicoon, fametrano
 * @license LPGL3
 */

const requestPromise = require('request-promise')
const Promise = require('promise')
const Utils = require('./utils.js')

/** Abstract Class used to query block explorers API */
class ChainExplorer {
  /**
   * Create a ChainExplorer.
   * @param {String} url - blockchain explorer url
   * @param {int} timeout - timeout (in seconds) for calls to the blockchain explorer
   */
  constructor (url, timeout) {
    this.timeout = timeout * 1000
    this.urlBlockindex = url
    this.urlBlock = url
  }

  /**
   * Retrieve the block hash from the block height.
   * @param {string} height - Height of the block.
   * @returns {Promise} A promise that returns {@link resolve} if resolved
   * and {@link reject} if rejected.
   */
  blockhash (height) {
    const options = {
      url: this.urlBlockindex + '/' + height,
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      json: true,
      timeout: this.timeout
    }
    return new Promise((resolve, reject) => {
      requestPromise(options).then(body => {
        resolve(body)
      })
      .catch(err => {
        reject(err)
      })
    })
  }

  /**
   * Retrieve the block information from the block hash.
   * @param {string} hash - Hash of the block.
   * @returns {Promise} A promise that returns {@link resolve} if resolved
   * and {@link reject} if rejected.
   */
  block (hash) {
    const options = {
      url: this.urlBlock + '/' + hash,
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      json: true,
      timeout: this.timeout
    }
    return new Promise((resolve, reject) => {
      requestPromise(options)
        .then(body => {
          resolve(body)
        })
        .catch(err => {
          reject(err)
        })
    })
  }
}

module.exports = { ChainExplorer }
