'use strict';
/**
 * Detached Timestamp File module.
 * @module DetachedTimestampFile
 * @author EternityWall
 * @license GPL3
 */

const Ops = require('./ops.js');
const Timestamp = require('./timestamp.js');
const Utils = require('./utils.js');

/** @constant
 * @type {string}
 * Header magic bytes
 * Designed to be give the user some information in a hexdump, while being identified as 'data' by the file utility.
 * @default \x00OpenTimestamps\x00\x00Proof\x00\xbf\x89\xe2\xe8\x84\xe8\x92\x94
 */
const HEADER_MAGIC = '\x00OpenTimestamps\x00\x00Proof\x00\xbf\x89\xe2\xe8\x84\xe8\x92\x94';

/** @constant
 * @type {int}
 * While the git commit timestamps have a minor version, probably better to
 * leave it out here: unlike Git commits round-tripping is an issue when
 * timestamps are upgraded, and we could end up with bugs related to not
 * saving/updating minor version numbers correctly.
 * @default 1
 */
const MAJOR_VERSION = 1;
// const MIN_FILE_DIGEST_LENGTH = 20;
// const MAX_FILE_DIGEST_LENGTH = 32;

/** Class representing Detached Timestamp File.
 * A file containing a timestamp for another file.
 * Contains a timestamp, along with a header and the digest of the file.
 */
class DetachedTimestampFile {

  constructor(fileHashOp, timestamp) {
    this.fileHashOp = fileHashOp;
    this.timestamp = timestamp;
  }

  /**
   * The digest of the file that was timestamped.
   * @return {byte} The message inside the timestamp.
   */
  fileDigest() {
    return this.timestamp.msg;
  }

  serialize(ctx) {
    ctx.writeBytes(Utils.charsToBytes(HEADER_MAGIC));
    ctx.writeVaruint(MAJOR_VERSION);
    this.fileHashOp.serialize(ctx);
    ctx.writeBytes(this.timestamp.msg);
    this.timestamp.serialize(ctx);
  }

  static deserialize(ctx) {
    ctx.assertMagic(HEADER_MAGIC);
    ctx.readVaruint();

    const fileHashOp = Ops.CryptOp.deserialize(ctx);
    const fileHash = ctx.readBytes(fileHashOp._DIGEST_LENGTH());
    const timestamp = Timestamp.deserialize(ctx, fileHash);

    ctx.assertEof();
    return new DetachedTimestampFile(fileHashOp, timestamp);
  }

  static fromBytes(fileHashOp, ctx) {
    const fdHash = fileHashOp.hashFd(ctx);
    return new DetachedTimestampFile(fileHashOp, new Timestamp(fdHash));
  }

  toString() {
    let output = 'DetachedTimestampFile\n';
    output += 'fileHashOp: ' + this.fileHashOp.toString() + '\n';
    output += 'timestamp: ' + this.timestamp.toString() + '\n';
    return output;
  }

}

module.exports = {
  DetachedTimestampFile
};
