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

module.exports = {

  /** Show information on a timestamp.
   * @exports OpenTimestamps/info
   * @param {ArrayBuffer} ots - The ots array buffer.
   */
  info(ots) {
    if (ots === undefined) {
      console.log('No ots file');
      return;
    }

    const ctx = new Context.StreamDeserialization();
    ctx.open(Utils.arrayToBytes(ots));
    const detachedTimestampFile = DetachedTimestampFile.DetachedTimestampFile.deserialize(ctx);

    const fileHash = Utils.bytesToHex(detachedTimestampFile.timestamp.msg);
    const hashOp = detachedTimestampFile.fileHashOp._HASHLIB_NAME();
    const firstLine = 'File ' + hashOp + ' hash: ' + fileHash + '\n';

    return firstLine + 'Timestamp:\n' + detachedTimestampFile.timestamp.strTree() + '\n';
  },

  /** Create timestamp with the aid of a remote calendar. May be specified multiple times.
   * @exports OpenTimestamps/stamp
   * @param {ArrayBuffer} plain - The plain array buffer to stamp.
   */
  stamp(plain) {
    return new Promise((resolve, reject) => {
      const ctx = new Context.StreamDeserialization();
      ctx.open(Utils.arrayToBytes(plain));

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

        console.log(Timestamp.strTreeExtended(fileTimestamp.timestamp));
      }

      // merkle_root = nonce_appended_stamp.ops.add(OpSHA256())
      const opSHA256 = new Ops.OpSHA256();
      let merkleRoot = nonceAppendedStamp.ops.get(opSHA256);
      if (merkleRoot === undefined) {
        merkleRoot = new Timestamp(opSHA256.call(nonceAppendedStamp.msg));
        nonceAppendedStamp.ops.set(opSHA256, merkleRoot);

        console.log(Timestamp.strTreeExtended(fileTimestamp.timestamp));
      }

      console.log('fileTimestamp:');
      console.log(fileTimestamp.toString());

      console.log('merkleRoot:');
      console.log(merkleRoot.toString());

      // merkleTip  = make_merkle_tree(merkle_roots)
      const merkleTip = merkleRoot;

      const calendarUrls = [];
      // calendarUrls.push('https://alice.btc.calendar.opentimestamps.org');
      // calendarUrls.append('https://b.pool.opentimestamps.org');
      calendarUrls.push('https://ots.eternitywall.it');

      this.createTimestamp(merkleTip, calendarUrls).then(timestamp => {
        console.log('Result Timestamp:');
        console.log(Timestamp.strTreeExtended(timestamp));

        console.log('Complete Timestamp:');
        console.log(Timestamp.strTreeExtended(fileTimestamp.timestamp));

        // serialization
        const css = new Context.StreamSerialization();
        css.open();
        fileTimestamp.serialize(css);

        console.log('SERIALIZATION');
        console.log(Utils.bytesToHex(css.getOutput()));

        resolve(css.getOutput());
      }).catch(err => {
        reject(err);
      });
    });
  },

  /** Create a timestamp
   * @param {timestamp} timestamp - The timestamp.
   * @param {string[]} calendarUrls - List of calendar's to use.
   */
  createTimestamp(timestamp, calendarUrls) {
    // setup_bitcoin : not used

    // const n = calendarUrls.length; // =1

    // only support 1 calendar
    const calendarUrl = calendarUrls[0];

    return new Promise((resolve, reject) => {
      console.log('Submitting to remote calendar ', calendarUrl);
      const remote = new Calendar.RemoteCalendar(calendarUrl);
      remote.submit(timestamp.msg).then(resultTimestamp => {
        timestamp.merge(resultTimestamp);

        resolve(timestamp);
      }, err => {
        console.log('Error: ' + err);

        reject(err);
      });
    });
  },

  /** Verify a timestamp.
   * @exports OpenTimestamps/verify
   * @param {ArrayBuffer} ots - The ots array buffer to stamp.
   * @param {ArrayBuffer} plain - The plain array buffer to stamp.
   */
  verify(ots, plain) {
    console.log('TODO');
    console.log('ots: ', ots);
    console.log('plain: ', plain);

    const ctx = new Context.StreamDeserialization();
    ctx.open(Utils.arrayToBytes(ots));

    const detachedTimestamp = DetachedTimestampFile.DetachedTimestampFile.deserialize(ctx);
    console.log('Hashing file, algorithm ' + detachedTimestamp.fileHashOp._TAG_NAME());

    const actualFileDigest = detachedTimestamp.fileHashOp.hashFd(Utils.arrayToBytes(plain));
    console.log('Got digest ' + Utils.bytesToHex(actualFileDigest));

    if (actualFileDigest !== detachedTimestamp.file_digest) {
      console.log('Expected digest ' + Utils.bytesToHex(detachedTimestamp.fileDigest()));
      console.log('File does not match original!');
      return;
    }

    this.verifyTimestamp(detachedTimestamp.timestamp);
  },
  verifyTimestamp(timestamp) {
    console.log('TODO ' + timestamp);
        // upgrade_timestamp(timestamp, args);
  }

};
