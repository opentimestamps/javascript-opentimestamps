'use strict';

/**
 * Bitcoin module.
 * @module Bitcoin
 * @author EternityWall
 * @license LPGL3
 */

const properties = require('properties');
const requestPromise = require('request-promise');
const Promise = require('promise');
const Utils = require('./utils.js');

/** Class representing Bitcoin Header Interface */
class BlockHeader {

  constructor(merkleroot, hash, time) {
    this.merkleroot = merkleroot;
    this.hash = hash;
    this.time = time;
  }

  getMerkleroot() {
    return this.merkleroot;
  }
  getHash() {
    return this.hash;
  }
  getTime() {
    return this.time;
  }
}

/** Class representing Bitcoin Node Peer Interface */
class BitcoinNode {

    /**
     * Create a BitcoinNode.
     * @param {string} bitcoinConf - The server url.
     */
  constructor(bitcoinConf) {
    this.authString = Buffer.from(bitcoinConf.rpcuser + ':' + bitcoinConf.rpcpassword).toString('base64');
    this.urlString = 'http://' + bitcoinConf.rpcconnect + ':' + bitcoinConf.rpcport;
  }

  static readBitcoinConf() {
    const home = process.env.HOME;
    const list = ['/.bitcoin/bitcoin.conf', '\\AppData\\Roaming\\Bitcoin\\bitcoin.conf', '/Library/Application Support/Bitcoin/bitcoin.conf'];
    const promises = [];

    list.forEach(dir => {
      const file = home + dir;

      const promise = new Promise((resolve, reject) => {
        properties.parse(file, {path: true}, (error, obj) => {
          if (error) {
            return reject(error);
          }
          if (obj === undefined || obj.length === 0) {
            return reject(new Error('File empty'));
          }
          if (obj.rpcuser !== undefined && obj.rpcpassword !== undefined) {
            if (obj.rpcconnect === undefined) {
              obj.rpcconnect = '127.0.0.1';
            }
            if (obj.rpcport === undefined) {
              obj.rpcport = '8332';
            }
          }
          return resolve(obj);
        });
      });
      promises.push(promise);
    });

    return new Promise((resolve, reject) => {
      Promise.all(promises.map(Utils.softFail)).then(results => {
        if (results === undefined || results.length === 0) {
          return reject();
        }

        results.forEach(prop => {
          if (!(prop instanceof Error) && prop.rpcuser !== undefined && prop.rpcpassword !== undefined) {
            return resolve(prop);
          }
        });
        reject();
      });
    });
  }

  getInfo() {
    const params = {
      id: 'java',
      method: 'getinfo'
    };
    return this.callRPC(params);
  }

  getBlockHeader(height) {
    return new Promise((resolve, reject) => {
      const params = {
        id: 'java',
        method: 'getblockhash',
        params: [height]
      };
      this.callRPC(params).then(result => {
        const params = {
          id: 'java',
          method: 'getblockheader',
          params: [result]
        };
        this.callRPC(params).then(result => {
          const blockHeader = new BlockHeader(result.merkleroot, result.hash, result.time);
          resolve(blockHeader);
        }).catch(err => {
          console.error('getBlockHeader : ' + err);
          reject(err);
        });
      }).catch(err => {
        console.error('getBlockHeader : ' + err);
        reject(err);
      });
    });
  }

    /**
     * Retrieve the block information from the block hash.
     * @param {string} height - Height of the block.
     * @returns {Promise} A promise that returns {@link resolve} if resolved
     * and {@link reject} if rejected.
     */
  callRPC(params) {
    const options = {
      url: this.urlString,
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: 'Basic ' + this.authString,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      json: true,
      body: JSON.stringify(params)
    };
    return new Promise((resolve, reject) => {
      requestPromise(options)
                .then(body => {
                    // console.log('body ', body);
                  if (body.length === 0) {
                    console.error('RPC response error body ');
                    reject();
                    return;
                  }
                  resolve(body.result);
                })
                .catch(err => {
                  console.error('RPC response error: ' + err);
                  reject(err);
                });
    });
  }
}

module.exports = {
  BitcoinNode,
  BlockHeader
};
