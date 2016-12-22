'use strict';

const Ops = require('./ops.js');
const Timestamp = require('./timestamp.js');
const Utils = require('./utils.js');

const HEADER_MAGIC = '\x00OpenTimestamps\x00\x00Proof\x00\xbf\x89\xe2\xe8\x84\xe8\x92\x94';
const MAJOR_VERSION = 1;
// const MIN_FILE_DIGEST_LENGTH = 20;
// const MAX_FILE_DIGEST_LENGTH = 32;

class DetachedTimestampFile {

  constructor(fileHashOp, timestamp) {
    this.fileHashOp = fileHashOp;
    this.timestamp = timestamp;
  }

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
