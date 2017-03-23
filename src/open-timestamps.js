'use strict';

/**
 * OpenTimestamps module.
 * @module OpenTimestamps
 * @author EternityWall
 * @license LPGL3
 */

const Web3 = require('web3');
const Context = require('./context.js');
const DetachedTimestampFile = require('./detached-timestamp-file.js');
const Timestamp = require('./timestamp.js');
const Utils = require('./utils.js');
const Ops = require('./ops.js');
const Calendar = require('./calendar.js');
const Notary = require('./notary.js');
const Insight = require('./insight.js');
const Merkle = require('./merkle.js');
const Bitcoin = require('./bitcoin.js');

module.exports = {

  /**
   * Show information on a timestamp.
   * @exports OpenTimestamps/info
   * @param {ArrayBuffer} ots - The ots array buffer.
   */
  info(ots) {
    if (ots === undefined) {
      console.error('No ots file');
      return 'No ots file';
    }

    try {
      const ctx = new Context.StreamDeserialization(ots);
      const detachedTimestampFile = DetachedTimestampFile.DetachedTimestampFile.deserialize(ctx);
      const fileHash = Utils.bytesToHex(detachedTimestampFile.timestamp.msg);
      const hashOp = detachedTimestampFile.fileHashOp._HASHLIB_NAME();
      const firstLine = 'File ' + hashOp + ' hash: ' + fileHash + '\n';
      return firstLine + 'Timestamp:\n' + detachedTimestampFile.timestamp.strTree();
    } catch (err) {
      return 'Error deserialization ' + err;
    }
  },

  /**
   * Create timestamp with the aid of a remote calendar. May be specified multiple times.
   * @exports OpenTimestamps/stamp
   * @param {ArrayBuffer} plain - The plain array buffer to stamp.
   * @param {Boolean} isHash - 1 = Hash , 0 = Data File
   */
  stamp(plain, isHash) {
    return new Promise((resolve, reject) => {
      let fileTimestamp;
      if (isHash !== undefined && isHash === true) {
        // Read Hash
        try {
          fileTimestamp = DetachedTimestampFile.DetachedTimestampFile.fromHash(new Ops.OpSHA256(), Array.from(plain));
        } catch (err) {
          return reject(err);
        }
      } else {
        // Read from file stream
        try {
          const ctx = new Context.StreamDeserialization(plain);
          fileTimestamp = DetachedTimestampFile.DetachedTimestampFile.fromBytes(new Ops.OpSHA256(), ctx);
        } catch (err) {
          return reject(err);
        }
      }

      /* Add nonce:
       * Remember that the files - and their timestamps - might get separated
       * later, so if we didn't use a nonce for every file, the timestamp
       * would leak information on the digests of adjacent files.
       * */
      let merkleRoot;
      try {
        const bytesRandom16 = Utils.randBytes(16);

        // nonce_appended_stamp = file_timestamp.timestamp.ops.add(OpAppend(os.urandom(16)))
        const opAppend = new Ops.OpAppend(Utils.arrayToBytes(bytesRandom16));
        let nonceAppendedStamp = fileTimestamp.timestamp.ops.get(opAppend);
        if (nonceAppendedStamp === undefined) {
          nonceAppendedStamp = new Timestamp(opAppend.call(fileTimestamp.timestamp.msg));
          fileTimestamp.timestamp.ops.set(opAppend, nonceAppendedStamp);
        }

        // merkle_root = nonce_appended_stamp.ops.add(OpSHA256())
        const opSHA256 = new Ops.OpSHA256();
        merkleRoot = nonceAppendedStamp.ops.get(opSHA256);
        if (merkleRoot === undefined) {
          merkleRoot = new Timestamp(opSHA256.call(nonceAppendedStamp.msg));
          nonceAppendedStamp.ops.set(opSHA256, merkleRoot);
        }
      } catch (err) {
        return reject(err);
      }

      // merkleTip  = make_merkle_tree(merkle_roots)
      const merkleTip = merkleRoot;

      // Calendars
      const calendarUrls = [];
      calendarUrls.push('https://alice.btc.calendar.opentimestamps.org');
      // calendarUrls.append('https://b.pool.opentimestamps.org');
      calendarUrls.push('https://ots.eternitywall.it');

      this.createTimestamp(merkleTip, calendarUrls).then(timestamp => {
        if (timestamp === undefined) {
          return reject();
        }
        // Timestamp serialization
        const css = new Context.StreamSerialization();
        fileTimestamp.serialize(css);
        resolve(css.getOutput());
      }).catch(err => {
        reject(err);
      });
    });
  },

  /**
   * Create timestamp with the aid of a remote calendar for multiple files.
   * @exports OpenTimestamps/stamp
   * @param {ArrayBuffer[]} plains - The array of plain array buffer to stamp.
   * @param {Boolean} isHash - 1 = Hash , 0 = Data File
   */
  multistamp(plains, isHash) {
    return new Promise((resolve, reject) => {
      const fileTimestamps = [];
      const merkleRoots = [];

      plains.forEach(plain => {
        let fileTimestamp;
        if (isHash !== undefined && isHash === true) {
          // Read Hash
          try {
            fileTimestamp = DetachedTimestampFile.DetachedTimestampFile.fromHash(new Ops.OpSHA256(), plain);
          } catch (err) {
            return reject(err);
          }
        } else {
          // Read from file stream
          try {
            const ctx = new Context.StreamDeserialization(plain);
            fileTimestamp = DetachedTimestampFile.DetachedTimestampFile.fromBytes(new Ops.OpSHA256(), ctx);
          } catch (err) {
            return reject(err);
          }
        }

        /* Add nonce:
         * Remember that the files - and their timestamps - might get separated
         * later, so if we didn't use a nonce for every file, the timestamp
         * would leak information on the digests of adjacent files.
         * */
        let merkleRoot;
        try {
          const bytesRandom16 = Utils.randBytes(16);

          // nonce_appended_stamp = file_timestamp.timestamp.ops.add(OpAppend(os.urandom(16)))
          const opAppend = new Ops.OpAppend(Utils.arrayToBytes(bytesRandom16));
          let nonceAppendedStamp = fileTimestamp.timestamp.ops.get(opAppend);
          if (nonceAppendedStamp === undefined) {
            nonceAppendedStamp = new Timestamp(opAppend.call(fileTimestamp.timestamp.msg));
            fileTimestamp.timestamp.ops.set(opAppend, nonceAppendedStamp);
          }

          // merkle_root = nonce_appended_stamp.ops.add(OpSHA256())
          const opSHA256 = new Ops.OpSHA256();
          merkleRoot = nonceAppendedStamp.ops.get(opSHA256);
          if (merkleRoot === undefined) {
            merkleRoot = new Timestamp(opSHA256.call(nonceAppendedStamp.msg));
            nonceAppendedStamp.ops.set(opSHA256, merkleRoot);
          }
        } catch (err) {
          return reject(err);
        }

        fileTimestamps.push(fileTimestamp);
        merkleRoots.push(merkleRoot);
      });

      const merkleTip = Merkle.makeMerkleTree(merkleRoots);

      // Calendars
      const calendarUrls = [];
      calendarUrls.push('https://alice.btc.calendar.opentimestamps.org');
      // calendarUrls.append('https://b.pool.opentimestamps.org');
      calendarUrls.push('https://ots.eternitywall.it');

      this.createTimestamp(merkleTip, calendarUrls).then(timestamp => {
        if (timestamp === undefined) {
          return reject();
        }

        // Timestamps serialization
        const proofs = [];

        fileTimestamps.forEach(fileTimestamp => {
          const css = new Context.StreamSerialization();
          fileTimestamp.serialize(css);
          proofs.push(css.getOutput());
        });

        resolve(proofs);
      }).catch(err => {
        reject(err);
      });
    });
  },

  /**
   * Create a timestamp
   * @param {timestamp} timestamp - The timestamp.
   * @param {string[]} calendarUrls - List of calendar's to use.
   */
  createTimestamp(timestamp, calendarUrls) {
    // setup_bitcoin : not used

    const res = [];
    calendarUrls.forEach(calendarUrl => {
      const remote = new Calendar.RemoteCalendar(calendarUrl);
      res.push(remote.submit(timestamp.msg));
    });
    return new Promise((resolve, reject) => {
      Promise.all(res.map(Utils.softFail)).then(results => {
        // console.log('results=' + results);
        results.forEach(resultTimestamp => {
          if (resultTimestamp !== undefined) {
            timestamp.merge(resultTimestamp);
          }
        });
        // console.log(Timestamp.strTreeExtended(timestamp));
        return resolve(timestamp);
      }).catch(err => {
        reject(err);
      });
    });
  },

  /**
   * Verify a timestamp.
   * @exports OpenTimestamps/verify
   * @param {ArrayBuffer} ots - The ots array buffer containing the proof to verify.
   * @param {ArrayBuffer} plain - The plain array buffer to verify.
   */
  verify(ots, plain, isHash) {
    // Read OTS
    let detachedTimestamp;
    try {
      const ctx = new Context.StreamDeserialization(ots);
      detachedTimestamp = DetachedTimestampFile.DetachedTimestampFile.deserialize(ctx);
    } catch (err) {
      return new Promise((resolve, reject) => {
        reject(err);
      });
    }

    let actualFileDigest;
    if (isHash === undefined || !isHash) {
      // Read from file stream
      try {
        const ctxHashfd = new Context.StreamDeserialization(plain);
        actualFileDigest = detachedTimestamp.fileHashOp.hashFd(ctxHashfd);
      } catch (err) {
        return new Promise((resolve, reject) => {
          reject(err);
        });
      }
    } else {
      // Read Hash
      try {
        actualFileDigest = Array.from(plain);
      } catch (err) {
        return new Promise((resolve, reject) => {
          reject(err);
        });
      }
    }

    const detachedFileDigest = detachedTimestamp.fileDigest();
    if (!Utils.arrEq(actualFileDigest, detachedFileDigest)) {
      console.error('Expected digest ' + Utils.bytesToHex(detachedTimestamp.fileDigest()));
      console.error('File does not match original!');
      return new Promise((resolve, reject) => {
        reject();
      });
    }

    // console.log(Timestamp.strTreeExtended(detachedTimestamp.timestamp, 0));
    return this.verifyTimestamp(detachedTimestamp.timestamp);
  },

  /** Verify a timestamp.
   * @param {Timestamp} timestamp - The timestamp.
   * @return {int} unix timestamp if verified, undefined otherwise.
   */
  verifyTimestamp(timestamp) {
    return new Promise((resolve, reject) => {
      // upgradeTimestamp(timestamp, args);
      let found = false;

      timestamp.allAttestations().forEach((attestation, msg) => {
        if (!found) { // Verify only the first BitcoinBlockHeaderAttestation
          if (attestation instanceof Notary.PendingAttestation) {
            // console.log('PendingAttestation: pass ');
          } else if (attestation instanceof Notary.EthereumBlockHeaderAttestation) {
            found = true;
            try {
              const web3 = new Web3();
              web3.setProvider(new web3.providers.HttpProvider('http://localhost:8545'));
              const block = web3.eth.getBlock(attestation.height);
              const attestedTime = attestation.verifyAgainstBlockheader(msg, block);
              // console.log("Success! Ethereum attests data existed as of " % time.strftime('%c %Z', time.localtime(attestedTime)))
              return resolve(attestedTime);
            } catch (err) {
              return reject(err);
            }
          } else if (attestation instanceof Notary.BitcoinBlockHeaderAttestation) {
            found = true;

            // Check for local bitcoin configuration
            Bitcoin.BitcoinNode.readBitcoinConf().then(properties => {
              const bitcoin = new Bitcoin.BitcoinNode(properties);
              bitcoin.getBlockHeader(attestation.height).then(blockHeader => {
                const merkle = Utils.hexToBytes(blockHeader.getMerkleroot());
                const message = msg.reverse();
                // One Bitcoin attestation is enought
                if (Utils.arrEq(merkle, message)) {
                  resolve(blockHeader.time);
                } else {
                  resolve();
                }
              });
            }).catch(() => {
              // There is no local node available
              // Request to insight
              const insight = new Insight.MultiInsight();
              insight.blockhash(attestation.height).then(blockHash => {
                console.log('Lite-client verification, assuming block ' + blockHash + ' is valid');
                insight.block(blockHash).then(blockInfo => {
                  const merkle = Utils.hexToBytes(blockInfo.merkleroot);
                  const message = msg.reverse();

                  // One Bitcoin attestation is enought
                  if (Utils.arrEq(merkle, message)) {
                    resolve(blockInfo.time);
                  } else {
                    resolve();
                  }
                }).catch(err => {
                  console.error('Error: ' + err);
                  reject(err);
                });
              }).catch(err => {
                console.error('Error: ' + err);
                reject(err);
              });
            });
          }
        }
      });
      if (!found) {
        resolve();
      }
    });
  },

  /** Upgrade a timestamp.
   * @param {ArrayBuffer} ots - The ots array buffer containing the proof to verify.
   * @return {Promise} resolve(changed) : changed = True if the timestamp has changed, False otherwise.
   */
  upgrade(ots) {
    return new Promise((resolve, reject) => {
      // Read DetachedTimestampFile
      let detachedTimestampFile;
      try {
        const ctx = new Context.StreamDeserialization(ots);
        detachedTimestampFile = DetachedTimestampFile.DetachedTimestampFile.deserialize(ctx);
      } catch (err) {
        return reject(err);
      }

      // Upgrade timestamp
      this.upgradeTimestamp(detachedTimestampFile.timestamp).then(changed => {
        if (changed) {
          // console.log('Timestamp upgraded');
        }

        if (detachedTimestampFile.timestamp.isTimestampComplete()) {
          // console.log('Timestamp complete');
        } else {
          // console.log('Timestamp not complete');
        }

        // serialization
        try {
          const css = new Context.StreamSerialization();
          detachedTimestampFile.serialize(css);
          resolve(new Buffer(css.getOutput()));
        } catch (err) {
          reject(err);
        }
      }).catch(err => {
        reject(err);
      });
    });
  },

  /** Attempt to upgrade an incomplete timestamp to make it verifiable.
   * Note that this means if the timestamp that is already complete, False will be returned as nothing has changed.
   * @param {Timestamp} timestamp - The timestamp.
   * @return {Promise} True if the timestamp has changed, False otherwise.
   */
  upgradeTimestamp(timestamp) {
    // Check remote calendars for upgrades.
    // This time we only check PendingAttestations - we can't be as agressive.

    const calendarUrls = [];
    // calendarUrls.push('https://alice.btc.calendar.opentimestamps.org');
    // calendarUrls.append('https://b.pool.opentimestamps.org');
    calendarUrls.push('https://ots.eternitywall.it');

    const existingAttestations = timestamp.getAttestations();
    const promises = [];
    const self = this;

    // console.log(timestamp.directlyVerified().length);
    timestamp.directlyVerified().forEach(subStamp => {
      subStamp.attestations.forEach(attestation => {
        if (attestation instanceof Notary.PendingAttestation) {
          const calendarUrl = attestation.uri;
          // var calendarUrl = calendarUrls[0];
          const commitment = subStamp.msg;

          // console.log('attestation url: ', calendarUrl);
          // console.log('commitment: ', Utils.bytesToHex(commitment));

          const calendar = new Calendar.RemoteCalendar(calendarUrl);
          // promises.push(self.upgradeStamp(subStamp, calendar, commitment, existingAttestations));
          promises.push(self.upgradeStamp(subStamp, calendar, commitment, existingAttestations));
        }
      });
    });

    return new Promise((resolve, reject) => {
      Promise.all(promises).then(results => {
        // console.log('Timestamp before merged');
        // console.log(Timestamp.strTreeExtended(timestamp));

        results.forEach(result => {
          if (result !== undefined) {
            result.subStamp.merge(result.upgradedStamp);
          }
        });
        // console.log('Timestamp merged');
        // console.log(Timestamp.strTreeExtended(timestamp));
        if (results.length === 0) {
          resolve(false);
        } else {
          resolve(true);
        }
      }).catch(err => {
        console.error('Error upgradeTimestamp: ' + err);
        reject(err);
      });
    });
  },

  upgradeStamp(subStamp, calendar, commitment, existingAttestations) {
    return new Promise(resolve => {
      calendar.getTimestamp(commitment).then(upgradedStamp => {
        // console.log(Timestamp.strTreeExtended(upgradedStamp, 0));

        // const atts_from_remote = get_attestations(upgradedStamp)
        const attsFromRemote = upgradedStamp.getAttestations();
        if (attsFromRemote.size > 0) {
          // console.log(attsFromRemote.size + ' attestation(s) from ' + calendar.url);
        }

        // Set difference from remote attestations & existing attestations
        const newAttestations = new Set([...attsFromRemote].filter(x => !existingAttestations.has(x)));
        if (newAttestations.size > 0) {
          // changed & found_new_attestations
          // foundNewAttestations = true;
          // console.log(attsFromRemote.size + ' attestation(s) from ' + calendar.url);

          // Set union of existingAttestations & newAttestations
          existingAttestations = new Set([...existingAttestations, ...newAttestations]);
          resolve({subStamp, upgradedStamp});
          // subStamp.merge(upgradedStamp);
          // args.cache.merge(upgraded_stamp)
          // sub_stamp.merge(upgraded_stamp)
        } else {
          resolve();
        }
      }).catch(err => {
        if (err === undefined) {
          resolve();
        } else {
          resolve();
        }
      });
    });
  }

};
