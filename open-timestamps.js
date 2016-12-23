'use strict';

const Context = require('./context.js');
const DetachedTimestampFile = require('./detached-timestamp-file.js');
const Timestamp = require('./timestamp.js');
const Utils = require('./utils.js');
const Calendar = require('./calendar.js');
const Ops = require('./ops.js');

module.exports = {

  info(fileOts) {
    if (fileOts === undefined) {
      console.log('No ots file');
      return;
    }

    const ctx = new Context.StreamDeserialization();
    const otsBytes = Utils.hexToBytes(fileOts);
    ctx.open(otsBytes);
    const detachedTimestampFile = DetachedTimestampFile.DetachedTimestampFile.deserialize(ctx);

    const fileHash = Utils.bytesToHex(detachedTimestampFile.timestamp.msg);
    const hashOp = detachedTimestampFile.fileHashOp._HASHLIB_NAME();
    const firstLine = 'File ' + hashOp + ' hash: ' + fileHash + '\n';

    return firstLine + 'Timestamp:\n' + detachedTimestampFile.timestamp.strTree() + '\n';
  },

    /* STAMP COMMAND */
  stamp(file) {
    console.log('TODO');

    const ctx = new Context.StreamDeserialization();
    const bytes = Utils.hexToBytes(file);
    ctx.open(bytes);

    const fileTimestamp = DetachedTimestampFile.DetachedTimestampFile.fromBytes(new Ops.OpSHA256(), ctx);

        /* Add nonce

        # Remember that the files - and their timestamps - might get separated
        # later, so if we didn't use a nonce for every file, the timestamp
        # would leak information on the digests of adjacent files. */

    const bytesRandom16 = Utils.randBytes(16);

    // nonce_appended_stamp = file_timestamp.timestamp.ops.add(OpAppend(os.urandom(16)))
    const opAppend = new Ops.OpAppend(bytesRandom16);
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

    // merkleTip  = make_merkle_tree(merkle_roots)
    const merkleTip = merkleRoot;

    const calendarUrls = [];
    calendarUrls.push('https://a.pool.opentimestamps.org');
        // calendarUrls.append('https://b.pool.opentimestamps.org');

    this.createTimestamp(merkleTip, calendarUrls);

        // serialization
  },
  createTimestamp(timestamp, calendarUrls) {
    console.log('TODO');
        // setup_bitcoin : not used

    // const n = calendarUrls.length; // =1

        // for all calendars
    for (const calendarUrl of calendarUrls) {
      this.submitAsync(calendarUrl, timestamp.msg);
    }
  },
  submitAsync(calendarUrl, msg) {
    console.log('TODO');

    console.log('Submitting to remote calendar ', calendarUrl);
    const remote = new Calendar.RemoteCalendar(calendarUrl);
    remote.submit(msg);

        // t = threading.Thread(target=submitAsync_thread, args=(remote, msg, q))
        // calendar_timestamp = remote.submit(msg)

    return '';
  },

    /* VERIFY COMMAND */
  verify(fileOts, file) {
    console.log('TODO');
    console.log('fileOts: ', fileOts);
    console.log('file: ', file);

    const ctx = new Context.StreamDeserialization();
    const otsBytes = Utils.hexToBytes(fileOts);
    ctx.open(otsBytes);

    const detachedTimestamp = DetachedTimestampFile.DetachedTimestampFile.deserialize(ctx);
    console.log('Hashing file, algorithm ' + detachedTimestamp.fileHashOp._TAG_NAME());

    const fileBytes = Utils.hexToBytes(file);
    const actualFileDigest = detachedTimestamp.fileHashOp.hashFd(fileBytes);
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
