'use strict';

const Utils = require('./Utils.js');
const Notary = require('./Notary.js');
const Ops = require('./Ops.js');
const Timestamp = require('./Timestamp.js');

const msg = '';
const attestations = {};
const ops = [];

const HEADER_MAGIC = '\x00OpenTimestamps\x00\x00Proof\x00\xbf\x89\xe2\xe8\x84\xe8\x92\x94';
const MIN_FILE_DIGEST_LENGTH = 20;
const MAX_FILE_DIGEST_LENGTH = 32;
const MAJOR_VERSION = 1;

class DetachedTimestampFile {

  constructor(file_hash_op, timestamp) {
    this.file_hash_op = file_hash_op;
    this.timestamp = timestamp;
  }

  file_digest() {
    return this.timestamp.msg;
  }

  serialize(ctx) {
    ctx.write_bytes(HEADER_MAGIC);
    ctx.write_varuint(MAJOR_VERSION);
    this.file_hash_op.serialize(ctx);
    ctx.write_bytes(this.timestamp.msg);
    this.timestamp.serialize(ctx);
  }

  static deserialize(ctx) {
    ctx.assert_magic(HEADER_MAGIC);
    ctx.read_varuint();

    const file_hash_op = Ops.CryptOp.deserialize(ctx);
    const file_hash = ctx.read_bytes(file_hash_op.DIGEST_LENGTH());
    const timestamp = Timestamp.deserialize(ctx, file_hash);

    ctx.assert_eof();
    return new DetachedTimestampFile(file_hash_op, timestamp);
  }

  static from_bytes(file_hash_op, ctx) {
    const fd_hash = file_hash_op.hash_fd(ctx);
    return new DetachedTimestampFile(file_hash_op, new Timestamp(fd_hash));
  }

}

module.exports = {
  DetachedTimestampFile
};
