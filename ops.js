'use strict';

const crypto = require('crypto');
const Utils = require('./utils.js');

const _SUBCLS_BY_TAG = [];

class Op {

  call(msg) {
    if (msg.length > this._MAX_MSG_LENGTH()) {
      console.log('Error : Message too long;');
      return;
    }

    const r = this.call(msg);

    if (r.length > this._MAX_RESULT_LENGTH()) {
      console.log('Error : Result too long;');
    }
    return r;
  }

  _MAX_RESULT_LENGTH() {
    return 4096;
  }
  _MAX_MSG_LENGTH() {
    return 4096;
  }

  static deserialize(ctx) {
    this.tag = ctx.readBytes(1);
    this.tag = String.fromCharCode(this.tag[0]);
    return Op.deserializeFromTag(ctx, this.tag);
  }

  static deserializeFromTag(ctx, tag) {
    if (Object.keys(_SUBCLS_BY_TAG).indexOf(tag) !== -1) {
      return _SUBCLS_BY_TAG[tag].deserializeFromTag(ctx, tag);
    }

    console.log('Unknown operation tag: ', Utils.bytesToHex([tag]));
  }
  serialize(ctx, tag) {
    ctx.writeBytes(tag);
  }
}

// BINARY SECTION
class OpBinary extends Op {

  constructor(arg_) {
    super();
    if (arg_ === undefined) {
      this.arg = [];
    } else {
      this.arg = arg_;
    }
  }

  static deserializeFromTag(ctx, tag) {
        // tag=String.fromCharCode(tag);
    if (Object.keys(_SUBCLS_BY_TAG).indexOf(tag) >= 0) {
      const arg = ctx.readVarbytes(new Op()._MAX_RESULT_LENGTH(), 1);
      console.log('read: ' + Utils.bytesToHex(arg));
      return new _SUBCLS_BY_TAG[tag](arg);
    }
  }
  serialize(ctx, tag) {
    super.serialize(ctx, tag);
    ctx.writeVarbytes(this.arg[0]);
  }
  toString() {
    return this._TAG_NAME() + ' ' + Utils.bytesToHex(this.arg);
  }
}

class OpAppend extends OpBinary {
  constructor(arg_) {
    super(arg_);
    if (arg_ === undefined) {
      this.arg = [];
    } else {
      this.arg = arg_;
    }
  }
  _TAG() {
    return '\xf0';
  }
  _TAG_NAME() {
    return 'append';
  }
  call(msg) {
    return msg.concat(this.arg);
  }
  static deserializeFromTag(ctx, tag) {
    return super.deserializeFromTag(ctx, tag);
  }
  serialize(ctx) {
    return super.serialize(ctx, new OpAppend()._TAG());
  }
}

class OpPrepend extends OpBinary {
  constructor(arg_) {
    super(arg_);
    if (arg_ === undefined) {
      this.arg = [];
    } else {
      this.arg = arg_;
    }
  }
  _TAG() {
    return '\xf1';
  }
  _TAG_NAME() {
    return 'prepend';
  }
  call(msg) {
    return this.arg.concat(msg);
  }
  static deserializeFromTag(ctx, tag) {
    return super.deserializeFromTag(ctx, tag);
  }
}

// UNARY SECTION
class OpUnary extends Op {
  constructor(arg_) {
    super();
    if (arg_ === undefined) {
      this.arg = [];
    } else {
      this.arg = arg_;
    }
  }
  static deserializeFromTag(ctx, tag) {
    if (Object.keys(_SUBCLS_BY_TAG).indexOf(tag) >= 0) {
      return new _SUBCLS_BY_TAG[tag]();
    }
    console.log('Unknown operation tag: ', Utils.bytesToHex([tag]));
  }
  toString() {
    return this._TAG_NAME() + ' ' + Utils.bytesToHex(this.arg);
  }
}

class OpReverse extends OpUnary {
  constructor(arg_) {
    super(arg_);
    if (arg_ === undefined) {
      this.arg = [];
    } else {
      this.arg = arg_;
    }
  }
  _TAG() {
    return '\xf2';
  }
  _TAG_NAME() {
    return 'reverse';
  }
  call(msg) {
    if (msg.length === 0) {
      console.log('Can\'t reverse an empty message');
    }
        // return msg;//[::-1];
  }
  static deserializeFromTag(ctx, tag) {
    return super.deserializeFromTag(ctx, tag);
  }
}

class OpHexlify extends OpUnary {
  constructor(arg_) {
    super(arg_);
    if (arg_ === undefined) {
      this.arg = [];
    } else {
      this.arg = arg_;
    }
  }
  _TAG() {
    return '\xf3';
  }
  _TAG_NAME() {
    return 'hexlify';
  }
  _MAX_MSG_LENGTH() {
    return OpUnary._MAX_RESULT_LENGTH(); // 2
  }
  call(msg) {
    if (msg.length === 0) {
      console.log('Can\'t hexlify an empty message');
    }
  }
  static deserializeFromTag(ctx, tag) {
    return super.deserializeFromTag(ctx, tag);
  }
}

class CryptOp extends OpUnary {

  _HASHLIB_NAME() {
    return '';
  }

  call(msg) {
    const shasum = crypto.createHash(this._HASHLIB_NAME()).update(new Buffer(msg));
    const hashDigest = shasum.digest();
        // from buffer to array
    const output = [hashDigest.length];
    for (let i = 0; i < hashDigest.length; i++) {
      output[i] = hashDigest[i];
    }
    return output;
  }
  static deserializeFromTag(ctx, tag) {
    return super.deserializeFromTag(ctx, tag);
  }

  hashFd(ctx) {
    const hasher = crypto.createHash(this._HASHLIB_NAME());
    while (true) {
      const chunk = ctx.read(1048576); // (2**20) = 1MB chunks
      if (chunk === undefined || chunk.length === 0) {
        break;
      }
      hasher.update(new Buffer(chunk));
    }

    // from buffer to array
    const hashDigest = hasher.digest();
    const output = [hashDigest.length];
    for (let i = 0; i < hashDigest.length; i++) {
      output[i] = hashDigest[i];
    }
    return output;
  }
}

class OpSHA1 extends CryptOp {
  _TAG() {
    return '\x02';
  }
  _TAG_NAME() {
    return 'sha1';
  }
  _HASHLIB_NAME() {
    return 'sha1';
  }
  _DIGEST_LENGTH() {
    return 20;
  }
  static deserializeFromTag(ctx, tag) {
    return super.deserializeFromTag(this, ctx, tag);
  }
  call(msg) {
    return super.call(msg);
  }
}

class OpRIPEMD160 extends CryptOp {
  _TAG() {
    return '\x03';
  }
  _TAG_NAME() {
    return 'ripemd160';
  }
  _HASHLIB_NAME() {
    return 'ripemd160';
  }
  _DIGEST_LENGTH() {
    return 20;
  }
  static deserializeFromTag(ctx, tag) {
    return super.deserializeFromTag(this, ctx, tag);
  }
  call(msg) {
    return super.call(msg);
  }
}

class OpSHA256 extends CryptOp {

  _TAG() {
    return '\x08';
  }
  _TAG_NAME() {
    return 'sha256';
  }
  _HASHLIB_NAME() {
    return 'sha256';
  }
  _DIGEST_LENGTH() {
    return 32;
  }
  static deserializeFromTag(ctx, tag) {
    return super.deserializeFromTag(ctx, tag);
  }
  call(msg) {
    return super.call(msg);
  }
}

_SUBCLS_BY_TAG[new OpAppend()._TAG()] = OpAppend;
_SUBCLS_BY_TAG[new OpPrepend()._TAG()] = OpPrepend;
_SUBCLS_BY_TAG[new OpReverse()._TAG()] = OpReverse;
_SUBCLS_BY_TAG[new OpHexlify()._TAG()] = OpHexlify;
_SUBCLS_BY_TAG[new OpSHA1()._TAG()] = OpSHA1;
_SUBCLS_BY_TAG[new OpRIPEMD160()._TAG()] = OpRIPEMD160;
_SUBCLS_BY_TAG[new OpSHA256()._TAG()] = OpSHA256;

module.exports = {
  Op,
  OpAppend,
  OpPrepend,
  OpReverse,
  OpHexlify,
  OpSHA1,
  OpRIPEMD160,
  OpSHA256,
  CryptOp
};
