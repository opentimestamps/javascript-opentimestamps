'use strict';

/**
 * Detached Timestamp File module.
 * @module DetachedTimestampFile
 * @author EternityWall
 * @license LPGL3
 */

const Ops = require('./ops.js');
const Timestamp = require('./timestamp.js');

/**
 * Header magic bytes
 * Designed to be give the user some information in a hexdump, while being identified as 'data' by the file utility.
 * @type {int[]}
 * @default \x00OpenTimestamps\x00\x00Proof\x00\xbf\x89\xe2\xe8\x84\xe8\x92\x94
 */
const HEADER_MAGIC = [0x00, 0x4f, 0x70, 0x65, 0x6e, 0x54, 0x69, 0x6d, 0x65, 0x73, 0x74, 0x61, 0x6d, 0x70, 0x73, 0x00, 0x00, 0x50, 0x72, 0x6f, 0x6f, 0x66, 0x00, 0xbf, 0x89, 0xe2, 0xe8, 0x84, 0xe8, 0x92, 0x94];

/**
 * While the git commit timestamps have a minor version, probably better to
 * leave it out here: unlike Git commits round-tripping is an issue when
 * timestamps are upgraded, and we could end up with bugs related to not
 * saving/updating minor version numbers correctly.
 * @type {int}
 * @default 1
 */
const MAJOR_VERSION = 1;
// const MIN_FILE_DIGEST_LENGTH = 20;
// const MAX_FILE_DIGEST_LENGTH = 32;

/**
 * Class representing Detached Timestamp File.
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

  /**
   * Serialize a Timestamp File.
   * @param {StreamSerializationContext} ctx - The stream serialization context.
   * @return {byte[]} The serialized DetachedTimestampFile object.
   */
  serialize(ctx) {
    ctx.writeBytes(HEADER_MAGIC);
    ctx.writeVaruint(MAJOR_VERSION);
    this.fileHashOp.serialize(ctx);
    ctx.writeBytes(this.timestamp.msg);
    this.timestamp.serialize(ctx);
  }

  /**
   * Deserialize a Timestamp File.
   * @param {StreamDeserializationContext} ctx - The stream deserialization context.
   * @return {DetachedTimestampFile} The generated DetachedTimestampFile object.
   */
  static deserialize(ctx) {
    ctx.assertMagic(HEADER_MAGIC);
    ctx.readVaruint();

    const fileHashOp = Ops.CryptOp.deserialize(ctx);
    const fileHash = ctx.readBytes(fileHashOp._DIGEST_LENGTH());
    const timestamp = Timestamp.deserialize(ctx, fileHash);

    ctx.assertEof();
    return new DetachedTimestampFile(fileHashOp, timestamp);
  }

  /**
   * Read the Detached Timestamp File from bytes.
   * @param {Op} fileHashOp - The file hash operation.
   * @param {StreamDeserializationContext} ctx - The stream deserialization context.
   * @return {DetachedTimestampFile} The generated DetachedTimestampFile object.
   */
  static fromBytes(fileHashOp, ctx) {
    const fdHash = fileHashOp.hashFd(ctx);
    return new DetachedTimestampFile(fileHashOp, new Timestamp(fdHash));
  }

  /**
   * Read the Detached Timestamp File from hash.
   * @param {Op} fileHashOp - The file hash operation.
   * @param {int[]} fdHash - The hash file.
   * @return {DetachedTimestampFile} The generated DetachedTimestampFile object.
   */
  static fromHash(fileHashOp, fdHash) {
    return new DetachedTimestampFile(fileHashOp, new Timestamp(fdHash));
  }

  /**
   * Print the object.
   * @return {string} The output.
   */
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
