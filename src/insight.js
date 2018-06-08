'use strict'

/**
 * Insight module.
 * @module Insight
 * @author EternityWall
 * @license LPGL3
 */

const requestPromise = require('request-promise')
const Promise = require('promise')
const Utils = require('./utils.js')

/** Class used to query Insight API */
class Insight {
  /**
   * Create a RemoteCalendar.
   * @param {int} timeout - timeout (in seconds) used for calls to insight servers
   */
  constructor (url, timeout) {
    this.urlBlockindex = url + '/block-index'
    this.urlBlock = url + '/block'
    this.timeout = timeout * 1000

    // this.urlBlockindex = 'https://search.bitaccess.co/insight-api/block-index';
    // this.urlBlock = 'https://search.bitaccess.co/insight-api/block';
    // this.urlBlock = "https://insight.bitpay.com/api/block-index/447669";
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
        'User-Agent': 'javascript-opentimestamps',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      json: true,
      timeout: this.timeout
    }

    return new Promise((resolve, reject) => {
      requestPromise(options)
        .then(body => {
          // console.log('body ', body);
          if (body.size === 0) {
            console.error('Insight response error body ')
            reject(new Error('Insight response error body '))
            return
          }

          resolve(body.blockHash)
        })
        .catch(err => {
          console.error('Insight response error: ' + err)
          reject(err)
        })
    })
  }

  /**
   * Retrieve the block information from the block hash.
   * @param {string} height - Height of the block.
   * @returns {Promise} A promise that returns {@link resolve} if resolved
   * and {@link reject} if rejected.
   */
  block (hash) {
    const options = {
      url: this.urlBlock + '/' + hash,
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'javascript-opentimestamps',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      json: true,
      timeout: this.timeout
    }

    return new Promise((resolve, reject) => {
      requestPromise(options)
        .then(body => {
          // console.log('body ', body);
          if (!body) {
            console.error('Insight response error body ')
            return reject(new Error('Insight response error body '))
          }
          if (!body.merkleroot || !body.time){
            return reject(new Error('Insight response error body '))
          }
          resolve({merkleroot: body.merkleroot, time: body.time})
        })
        .catch(err => {
          console.error('Insight response error: ' + err)
          reject(err)
        })
    })
  }
}

const publicInsightUrls = {}
publicInsightUrls.bitcoin = [
  'https://www.localbitcoinschain.com/api',
  'https://search.bitaccess.co/insight-api',
  'https://insight.bitpay.com/api',
  'https://btc-bitcore1.trezor.io/api',
  'https://btc-bitcore4.trezor.io/api',
  'https://blockexplorer.com/api'
]
publicInsightUrls.litecoin = [
  'https://ltc-bitcore1.trezor.io/api',
  'https://insight.litecore.io/api'
]

class MultiInsight {
  /** Constructor
   * @param {object} options - Options
   *    urls: array of insight server urls
   *    timeout: timeout(in seconds) used for calls to insight servers
   */
  constructor (options) {
    this.insights = []

    // Sets requests timeout (default = 10s)
    const timeoutOptionSet = options && Object.prototype.hasOwnProperty.call(options, 'timeout')
    const timeout = timeoutOptionSet ? options.timeout : 10
    const chainOptionSet = options && Object.prototype.hasOwnProperty.call(options, 'chain')
    const chain = chainOptionSet ? options.chain : 'bitcoin'

    // We need at least 2 insight servers (for confirmation)
    const urlsOptionSet = options && Object.prototype.hasOwnProperty.call(options, 'urls') && options.urls.length > 1
    const urls = urlsOptionSet ? options.urls : publicInsightUrls[chain]

    urls.forEach(url => {
      this.insights.push(new Insight(url, timeout))
    })
  }

  blockhash (height) {
    const res = []
    this.insights.forEach(insight => {
      res.push(insight.blockhash(height))
    })
    return new Promise((resolve, reject) => {
      Promise.all(res.map(Utils.softFail)).then(results => {
        // console.log('results=' + results);
        const set = new Set();
        results.filter(result=> {if (result && !(result instanceof Error)){ set.add(JSON.stringify(result))}});
        if (set.size == 0) {
            reject(new Error('No block height ' + height + 'found'))
        } else if (set.size == 1) {
            resolve(JSON.parse(set.values().next().value))
        } else {
            reject(new Error('Different block height ' + height + 'found'))
        }
      })
    })
  }

  block (hash) {
    const res = []
    this.insights.forEach(insight => {
      res.push(insight.block(hash))
    })
    return new Promise((resolve, reject) => {
      Promise.all(res.map(Utils.softFail)).then(results => {
        // console.log('results=' + results);
          const set = new Set();
          results.filter(result=> {if (result && !(result instanceof Error)){ set.add(JSON.stringify(result))}});
          if (set.size == 0) {
              reject(new Error('No block hash ' + hash + 'found'))
          } else if (set.size == 1) {
              resolve(JSON.parse(set.values().next().value))
          } else {
              reject(new Error('Different block hash ' + hash + 'found'))
          }
      })
    })
  }
}

module.exports = {
  Insight,
  MultiInsight
}
