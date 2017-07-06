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
   * @param {DetachedTimestampFile} detached - The array of detached file to stamp.
   * @return {String} The message to print.
   */
  info(detached) {
    if ((detached === undefined) && !(detached instanceof DetachedTimestampFile)) {
      console.error('Invalid input');
      return 'Invalid input';
    }

    const timestamp = detached.timestamp;
    const hashOp = detached.fileHashOp._HASHLIB_NAME();
    const fileHash = Utils.bytesToHex(detached.fileDigest());
    const firstLine = 'File ' + hashOp + ' hash: ' + fileHash + '\n';

    try {
      return firstLine + 'Timestamp:\n' + timestamp.strTree();
    } catch (err) {
      return 'Error parsing info ' + err;
    }
  },

  /**
   * Show information on a timestamp.
   * @exports OpenTimestamps/json
   * @param {ArrayBuffer} ots - The ots array buffer.
   */
  json(ots) {
    const json = {};

    if (ots === undefined) {
      json.result = 'KO';
      json.error = 'No ots file';
      return JSON.stringify(json);
    }

    let timestamp;

    if (ots instanceof Timestamp) {
      // Pass timestamp
      timestamp = ots;
      json.hash = Utils.bytesToHex(timestamp.msg);
    } else {
      // Deserialize timestamp from file
      try {
        const ctx = new Context.StreamDeserialization(ots);
        const detachedTimestampFile = DetachedTimestampFile.deserialize(ctx);
        timestamp = detachedTimestampFile.timestamp;
        json.hash = Utils.bytesToHex(timestamp.msg);
        json.op = detachedTimestampFile.fileHashOp._HASHLIB_NAME();
      } catch (err) {
        json.result = 'KO';
        json.error = 'Error deserialization ' + err;
        return JSON.stringify(json);
      }
    }

    try {
      json.result = 'OK';
      json.timestamp = timestamp.toJson();
    } catch (err) {
      json.result = 'KO';
      json.error = 'Error parsing info ' + err;
    }
    return JSON.stringify(json);
  },

  /**
   * Create timestamp with the aid of a remote calendar for one or multiple files.
   * @exports OpenTimestamps/stamp
   * @param {DetachedTimestampFile[]} detaches - The array of detached file to stamp.
   * @param {Object} options - publicCalendars, Public calendar url list; m, At least M calendars replied; privateCalendars, Private calendar url list with secret key.
   */
  stamp(detaches, options) {
    return new Promise((resolve, reject) => {
      const fileTimestamps = [];
      const merkleRoots = [];

      // Parse input detaches
      let detachedList;
      if (detaches instanceof DetachedTimestampFile) {
        detachedList = [detaches];
      } else if (detaches instanceof Array) {
        detachedList = detaches;
      } else {
        return reject('Invalid input');
      }

      // Fill merkle tree leaf
      detachedList.forEach(fileTimestamp => {
        if (!(fileTimestamp instanceof DetachedTimestampFile)) {
          console.error('Invalid input');
          return reject('Invalid input');
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

      // Build merkle tree
      const merkleTip = Merkle.makeMerkleTree(merkleRoots);

      // Parse options
      if (!options) {
        options = {};
      }
      if (options.privateCalendars) {
        options.publicCalendars = [];
        if (!options.m || options.m === 0) {
          options.m = options.privateCalendars.size();
        } else if (options.m < 0 || options.m > options.publicCalendars.size()) {
          console.log('m cannot be greater than available calendar neither less or equal 0');
          return reject('m cannot be greater than available calendar neither less or equal 0');
        }
      } else {
        // Parse options : public calendars
        options.privateCalendars = [];
        if (!options.publicCalendars || options.publicCalendars.length === 0) {
          options.publicCalendars = [];
          options.publicCalendars.push('https://alice.btc.calendar.opentimestamps.org');
          options.publicCalendars.push('https://bob.btc.calendar.opentimestamps.org');
          options.publicCalendars.push('https://finney.calendar.eternitywall.com');
        }
        if (!options.m || options.m === 0) {
          options.m = 1;
          if (options.publicCalendars.length >= 2) {
            options.m = 2;
          }
        } else if (options.m < 0 || options.m > options.publicCalendars.size()) {
          console.log('m cannot be greater than available calendar neither less or equal 0');
          return reject('m cannot be greater than available calendar neither less or equal 0');
        }
      }

      // Build timestamp from the merkle root
      this.createTimestamp(merkleTip, options.publicCalendars, options.m, options.privateCalendars).then(timestamp => {
        if (timestamp === undefined) {
          return reject();
        }
        resolve();
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
  createTimestamp(timestamp, publicCalendars, m, privateCalendars) {
    const res = [];
    if (publicCalendars) {
      publicCalendars.forEach(calendar => {
        const remote = new Calendar.RemoteCalendar(calendar);
        res.push(remote.submit(timestamp.msg));
      });
    }
    if (privateCalendars) {
      privateCalendars.forEach(calendar => {
        const remote = new Calendar.RemoteCalendar(calendar);
        res.push(remote.submit(timestamp.msg));
      });
    }

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
   * @param {DetachedTimestampFile} detachedStamped - The detached of stamped file.
   * @param {DetachedTimestampFile} detachedOriginal - The detached of original file.
   */
  verify(detachedStamped, detachedOriginal) {
    // Compare stamped vs original detached file
    if (!Utils.arrEq(detachedStamped.fileDigest(), detachedOriginal.fileDigest())) {
      console.error('Expected digest ' + Utils.bytesToHex(detachedStamped.fileDigest()));
      console.error('File does not match original!');
      return new Promise((resolve, reject) => {
        reject('File does not match original!');
      });
    }

    const self = this;
    return new Promise((resolve, reject) => {
      if (detachedStamped.timestamp.isTimestampComplete()) {
        // Timestamp completed
        self.verifyTimestamp(detachedStamped.timestamp).then(attestedTime => {
          return resolve(attestedTime);
        }).catch(err => {
          return reject(err);
        });
      } else {
        // Timestamp not completed
        self.upgradeTimestamp(detachedStamped.timestamp).then(changed => {
          if (changed) {
            console.log('Timestamp upgraded');
          }
          self.verifyTimestamp(detachedStamped.timestamp).then(attestedTime => {
            return resolve(attestedTime);
          }).catch(err => {
            return reject(err);
          });
        }).catch(err => {
          return reject(err);
        });
      }
    });
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
   * @param {DetachedTimestampFile} detached - The DetachedTimestampFile object.
   * @return {Promise} resolve(changed) : changed = True if the timestamp has changed, False otherwise.
   */
  upgrade(detached) {
    return new Promise((resolve, reject) => {
      // Upgrade timestamp
      this.upgradeTimestamp(detached.timestamp).then(changed => {
        if (changed) {
          // console.log('Timestamp upgraded');
        }

        if (detached.timestamp.isTimestampComplete()) {
          // console.log('Timestamp complete');
        } else {
          // console.log('Timestamp not complete');
        }

        resolve(changed);
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
    calendarUrls.push('https://finney.calendar.eternitywall.com');

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
