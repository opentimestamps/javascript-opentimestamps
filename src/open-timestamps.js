'use strict';

/**
 * OpenTimestamps module.
 * @module OpenTimestamps
 * @author EternityWall
 * @license LPGL3
 */

const Context = require('./context.js');
const DetachedTimestampFile = require('./detached-timestamp-file.js');
const Timestamp = require('./timestamp.js');
const Utils = require('./utils.js');
const Ops = require('./ops.js');
const Calendar = require('./calendar.js');
const Notary = require('./notary.js');
const Insight = require('./insight.js');

module.exports = {

  /**
   * Show information on a timestamp.
   * @exports OpenTimestamps/info
   * @param {ArrayBuffer} ots - The ots array buffer.
   */
  info(ots) {
    if (ots === undefined) {
      console.error('No ots file');
      return;
    }

    const ctx = new Context.StreamDeserialization(ots);
    const detachedTimestampFile = DetachedTimestampFile.DetachedTimestampFile.deserialize(ctx);

    const fileHash = Utils.bytesToHex(detachedTimestampFile.timestamp.msg);
    const hashOp = detachedTimestampFile.fileHashOp._HASHLIB_NAME();
    const firstLine = 'File ' + hashOp + ' hash: ' + fileHash + '\n';

    return firstLine + 'Timestamp:\n' + detachedTimestampFile.timestamp.strTree();
  },

  /**
   * Create timestamp with the aid of a remote calendar. May be specified multiple times.
   * @exports OpenTimestamps/stamp
   * @param {ArrayBuffer} plain - The plain array buffer to stamp.
   */
  stamp(plain) {
    return new Promise((resolve, reject) => {
      const ctx = new Context.StreamDeserialization(plain);

      const fileTimestamp = DetachedTimestampFile.DetachedTimestampFile.fromBytes(new Ops.OpSHA256(), ctx);

          /* Add nonce

          # Remember that the files - and their timestamps - might get separated
          # later, so if we didn't use a nonce for every file, the timestamp
          # would leak information on the digests of adjacent files. */

      const bytesRandom16 = Utils.randBytes(16);

      // nonce_appended_stamp = file_timestamp.timestamp.ops.add(OpAppend(os.urandom(16)))
      const opAppend = new Ops.OpAppend(Utils.arrayToBytes(bytesRandom16));
      let nonceAppendedStamp = fileTimestamp.timestamp.ops.get(opAppend);
      if (nonceAppendedStamp === undefined) {
        nonceAppendedStamp = new Timestamp(opAppend.call(fileTimestamp.timestamp.msg));
        fileTimestamp.timestamp.ops.set(opAppend, nonceAppendedStamp);

        // console.log(Timestamp.strTreeExtended(fileTimestamp.timestamp));
      }

      // merkle_root = nonce_appended_stamp.ops.add(OpSHA256())
      const opSHA256 = new Ops.OpSHA256();
      let merkleRoot = nonceAppendedStamp.ops.get(opSHA256);
      if (merkleRoot === undefined) {
        merkleRoot = new Timestamp(opSHA256.call(nonceAppendedStamp.msg));
        nonceAppendedStamp.ops.set(opSHA256, merkleRoot);

        // console.log(Timestamp.strTreeExtended(fileTimestamp.timestamp));
      }

      // console.log('fileTimestamp:');
      // console.log(fileTimestamp.toString());

      // console.log('merkleRoot:');
      // console.log(merkleRoot.toString());

      // merkleTip  = make_merkle_tree(merkle_roots)
      const merkleTip = merkleRoot;

      const calendarUrls = [];
      calendarUrls.push('https://alice.btc.calendar.opentimestamps.org');
      // calendarUrls.append('https://b.pool.opentimestamps.org');
      calendarUrls.push('https://ots.eternitywall.it');

      this.createTimestamp(merkleTip, calendarUrls).then(timestamp => {
        // serialization
        if (timestamp === undefined) {
          reject();
          return;
        }

        // fileTimestamp.timestamp = timestamp;

        const css = new Context.StreamSerialization();
        fileTimestamp.serialize(css);
        resolve(css.getOutput());
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
    for (const calendarUrl of calendarUrls) {
      const remote = new Calendar.RemoteCalendar(calendarUrl);
      res.push(remote.submit(timestamp.msg));
    }
    return new Promise((resolve, reject) => {
      Promise.all(res.map(Utils.softFail)).then(results => {
        // console.log('results=' + results);
        for (const resultTimestamp of results) {
          if (resultTimestamp !== undefined) {
            timestamp.merge(resultTimestamp);
          }
        }
        // console.log(Timestamp.strTreeExtended(timestamp));
        return resolve(timestamp);
      }).catch(err => {
        console.error('Error: ' + err);
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
  verify(ots, plain) {
    const ctx = new Context.StreamDeserialization(ots);

    const detachedTimestamp = DetachedTimestampFile.DetachedTimestampFile.deserialize(ctx);
    // console.log('Hashing file, algorithm ' + detachedTimestamp.fileHashOp._TAG_NAME());

    const ctxHashfd = new Context.StreamDeserialization(plain);

    const actualFileDigest = detachedTimestamp.fileHashOp.hashFd(ctxHashfd);
    // console.log('actualFileDigest ' + Utils.bytesToHex(actualFileDigest));
    // console.log('detachedTimestamp.fileDigest() ' + Utils.bytesToHex(detachedTimestamp.fileDigest()));

    const detachedFileDigest = detachedTimestamp.fileDigest();
    if (!Utils.arrEq(actualFileDigest, detachedFileDigest)) {
      console.error('Expected digest ' + Utils.bytesToHex(detachedTimestamp.fileDigest()));
      console.error('File does not match original!');
      return;
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

      for (const [msg, attestation] of timestamp.allAttestations()) {
        if (attestation instanceof Notary.PendingAttestation) {
          // console.log('PendingAttestation: pass ');
        } else if (attestation instanceof Notary.BitcoinBlockHeaderAttestation) {
          // console.log('Request to insight ');
          const insight = new Insight.MultiInsight();

          insight.blockhash(attestation.height).then(blockHash => {
            insight.block(blockHash).then(blockInfo => {
              const merkle = Utils.hexToBytes(blockInfo.merkleroot);
              const message = msg.reverse();

              // console.log('merkleroot: ' + Utils.bytesToHex(merkle));
              // console.log('msg: ' + Utils.bytesToHex(message));
              // console.log('Time: ' + (new Date(blockInfo.time * 1000)));

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
          // Verify only the first BitcoinBlockHeaderAttestation
          return;
        }
      }
      resolve();
    });
  },

  /** Upgrade a timestamp.
   * @param {ArrayBuffer} ots - The ots array buffer containing the proof to verify.
   * @return {Promise} resolve(changed) : changed = True if the timestamp has changed, False otherwise.
   */
  upgrade(ots) {
    return new Promise((resolve, reject) => {
      const ctx = new Context.StreamDeserialization(ots);
      const detachedTimestampFile = DetachedTimestampFile.DetachedTimestampFile.deserialize(ctx);

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
        const css = new Context.StreamSerialization();
        detachedTimestampFile.serialize(css);
        resolve(new Buffer(css.getOutput()));

        // console.log('SERIALIZATION');
        // console.log(Utils.bytesToHex(css.getOutput()));
      }).catch(err => {
        console.error('Error : ' + err);
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
    for (const subStamp of timestamp.directlyVerified()) {
      for (const attestation of subStamp.attestations) {
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
      }
    }

    return new Promise((resolve, reject) => {
      Promise.all(promises).then(results => {
        // console.log('Timestamp before merged');
        // console.log(Timestamp.strTreeExtended(timestamp));

        for (const result of results) {
          if (result !== undefined) {
            result.subStamp.merge(result.upgradedStamp);
          }
        }
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
