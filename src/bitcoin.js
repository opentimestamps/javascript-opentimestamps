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
    return new Promise(resolve => {
      const home = process.env.HOME;
      const list = ['/.bitcoin/bitcoin.conf', '\\AppData\\Roaming\\Bitcoin\\bitcoin.conf', '/Library/Application Support/Bitcoin/bitcoin.conf'];
      list.forEach(dir => {
        const file = home + dir;
        properties.parse(file, {path: true}, (error, obj) => {
          if (error) {
            return;
          }
          if (obj === null) {
            return;
          }
          if (obj.rpcuser !== null && obj.rpcpassword !== null) {
            if (obj.rpcconnect === null) {
              obj.rpcconnect = '127.0.0.1';
            }
            if (obj.rpcport === null) {
              obj.rpcport = '8332';
            }
          }
          resolve(obj);
        });
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
