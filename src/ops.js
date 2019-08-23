'use strict'

/**
 * Ops crypto operations module.
 * @module Notary
 * @author EternityWall
 * @license LPGL3
 */

const crypto = require('crypto')
const Utils = require('./utils.js')

const _SUBCLS_BY_TAG = new Map()

/**
 * Timestamp proof operations.
 * Operations are the edges in the timestamp tree, with each operation taking a message and zero or more arguments to produce a result.
 */
class Op {
  /**
   * Maximum length of an Op result
   *
   * For a verifier, this limit is what limits the maximum amount of memory you
   * need at any one time to verify a particular timestamp path; while verifying
   * a particular commitment operation path previously calculated results can be
   * discarded.
   *
   * Of course, if everything was a merkle tree you never need to append/prepend
   * anything near 4KiB of data; 64 bytes would be plenty even with SHA512. The
   * main need for this is compatibility with existing systems like Bitcoin
   * timestamps and Certificate Transparency servers. While the pathological
   * limits required by both are quite large - 1MB and 16MiB respectively - 4KiB
   * is perfectly adequate in both cases for more reasonable usage.
   *
   * Op subclasses should set this limit even lower if doing so is appropriate
   * for them.
   */
  _MAX_RESULT_LENGTH () {
    return 4096
  }

  /**
   * Maximum length of the message an Op can be applied too.
   *
   * Similar to the result length limit, this limit gives implementations a sane
   * constraint to work with; the maximum result-length limit implicitly
   * constrains maximum message length anyway.
   *
   * Op subclasses should set this limit even lower if doing so is appropriate
   * for them.
   */
  _MAX_MSG_LENGTH () {
    return 4096
  }

  /**
   * Deserialize operation from a buffer.
   * @param {StreamDeserializationContext} ctx - The stream deserialization context.
   * @return {Op} The subclass Operation.
   */
  static deserialize (ctx) {
    this.tag = ctx.readBytes(1)[0]
    return Op.deserializeFromTag(ctx, this.tag)
  }

  /**
   * Deserialize operation from a buffer.
   * @param {StreamDeserializationContext} ctx - The stream deserialization context.
   * @param {int} tag - The tag of the operation.
   * @return {Op} The subclass Operation.
   */
  static deserializeFromTag (ctx, tag) {
    if (_SUBCLS_BY_TAG.get(tag) !== undefined) {
      return _SUBCLS_BY_TAG.get(tag).deserializeFromTag(ctx, tag)
    }
    console.error('Unknown operation tag: ', Utils.bytesToHex([tag]))
  }

  /**
   * Serialize operation.
   * @param {StreamSerializationContext} ctx - The stream serialization context.
   */
  serialize (ctx) {
    ctx.writeByte(this._TAG())
  }

  /**
   * Apply the operation to a message.
   * Raises MsgValueError if the message value is invalid, such as it being
   * too long, or it causing the result to be too long.
   * @param {byte[]} msg - The message.
   */
  call (msg) {
    if (msg.length > this._MAX_MSG_LENGTH()) {
      console.error('Error : Message too long;')
      return
    }

    const r = this.call(msg)

    if (r.length > this._MAX_RESULT_LENGTH()) {
      console.error('Error : Result too long;')
    }
    return r
  }
}

/**
 * Operations that act on a message and a single argument.
 * @extends OpUnary
 */
class OpBinary extends Op {
  constructor (arg_) {
    super()
    if (arg_ === undefined) {
      this.arg = []
    } else {
      this.arg = arg_
    }
  }

  static deserializeFromTag (ctx, tag) {
    if (_SUBCLS_BY_TAG.get(tag) !== undefined) {
      const arg = ctx.readVarbytes(new Op()._MAX_RESULT_LENGTH(), 1)
      // console.log('read: ' + Utils.bytesToHex(arg));
      return new (_SUBCLS_BY_TAG.get(tag))(arg)
    }
  }

  serialize (ctx) {
    super.serialize(ctx)
    ctx.writeVarbytes(this.arg)
  }

  toString () {
    return this._TAG_NAME() + ' ' + Utils.bytesToHex(this.arg)
  }
}

/**
 * Append a suffix to a message.
 * @extends OpBinary
 */
class OpAppend extends OpBinary {
  constructor (arg_) {
    super(arg_)
    if (arg_ === undefined) {
      this.arg = []
    } else {
      this.arg = arg_
    }
  }

  _TAG () {
    return 0xf0
  }

  _TAG_NAME () {
    return 'append'
  }

  call (msg) {
    return msg.concat(this.arg)
  }

  static deserializeFromTag (ctx, tag) {
    return super.deserializeFromTag(ctx, tag)
  }

  equals (another) {
    return (another instanceof OpAppend) && Utils.arrEq(this.arg, another.arg)
  }
}

/**
 * Prepend a prefix to a message.
 * @extends OpBinary
 */
class OpPrepend extends OpBinary {
  constructor (arg_) {
    super(arg_)
    if (arg_ === undefined) {
      this.arg = []
    } else {
      this.arg = arg_
    }
  }

  _TAG () {
    return 0xf1
  }

  _TAG_NAME () {
    return 'prepend'
  }

  call (msg) {
    return this.arg.concat(msg)
  }

  static deserializeFromTag (ctx, tag) {
    return super.deserializeFromTag(ctx, tag)
  }

  equals (another) {
    return (another instanceof OpPrepend) && Utils.arrEq(this.arg, another.arg)
  }
}

/**
 * Operations that act on a single message.
 * @extends Op
 */
class OpUnary extends Op {
  static deserializeFromTag (ctx, tag) {
    if (_SUBCLS_BY_TAG.get(tag) !== undefined) {
      return new (_SUBCLS_BY_TAG.get(tag))()
    }
    console.error('Unknown operation tag: ', Utils.bytesToHex([tag]))
  }

  toString () {
    return this._TAG_NAME()
  }
}

/**
 * Reverse a message.
 * @extends OpUnary
 */
class OpReverse extends OpUnary {
  _TAG () {
    return 0xf2
  }

  _TAG_NAME () {
    return 'reverse'
  }

  call (msg) {
    if (msg.length === 0) {
      console.error('Can\'t reverse an empty message')
    }
    return msg.reverse()
  }

  static deserializeFromTag (ctx, tag) {
    return super.deserializeFromTag(ctx, tag)
  }

  equals (another) {
    return (another instanceof OpReverse) && Utils.arrEq(this.arg, another.arg)
  }
}

/**
 * Hexlify a message.
 * @extends OpUnary
 */
class OpHexlify extends OpUnary {
  _TAG () {
    return 0xf3
  }

  _TAG_NAME () {
    return 'hexlify'
  }

  _MAX_MSG_LENGTH () {
    return OpUnary._MAX_RESULT_LENGTH() // 2
  }

  call (msg) {
    if (msg.length === 0) {
      console.error('Can\'t hexlify an empty message')
    }
  }

  static deserializeFromTag (ctx, tag) {
    return super.deserializeFromTag(ctx, tag)
  }

  equals (another) {
    return (another instanceof OpHexlify) && Utils.arrEq(this.arg, another.arg)
  }
}

/**
 * Cryptographic transformations.
 * These transformations have the unique property that for any length message,
 * the size of the result they return is fixed. Additionally, they're the only
 * type of operation that can be applied directly to a stream.
 * @extends OpUnary
 */
class CryptOp extends OpUnary {
  _HASHLIB_NAME () {
    return 0x00
  }

  call (cls, msg) {
    const shasum = crypto.createHash(cls._HASHLIB_NAME()).update(Buffer.from(msg))
    const hashDigest = shasum.digest()
    const output = [hashDigest.length]
    // from buffer to array
    for (let i = 0; i < hashDigest.length; i++) {
      output[i] = hashDigest[i]
    }
    return output
  }

  static deserializeFromTag (ctx, tag) {
    return super.deserializeFromTag(ctx, tag)
  }

  hashFd (ctx) {
    const hasher = crypto.createHash(this._HASHLIB_NAME())
    let chunk = ctx.readBuffer(1048576)
    while (chunk !== undefined && chunk.length > 0) {
      hasher.update(chunk)
      chunk = ctx.readBuffer(1048576) // (2**20) = 1MB chunks
    }
    // from buffer to array
    const hashDigest = hasher.digest()
    const output = [hashDigest.length]
    for (let i = 0; i < hashDigest.length; i++) {
      output[i] = hashDigest[i]
    }
    return output
  }
}

/**
 * Cryptographic SHA1 operation
 * Cryptographic operation tag numbers taken from RFC4880, although it's not
 * guaranteed that they'll continue to match that RFC in the future.
 * Remember that for timestamping, hash algorithms with collision attacks
 * *are* secure! We've still proven that both messages existed prior to some
 * point in time - the fact that they both have the same hash digest doesn't
 * change that.
 * Heck, even md5 is still secure enough for timestamping... but that's
 * pushing our luck...
 * @extends CryptOp
 */
class OpSHA1 extends CryptOp {
  _TAG () {
    return 0x02
  }

  _TAG_NAME () {
    return 'sha1'
  }

  _HASHLIB_NAME () {
    return 'sha1'
  }

  _DIGEST_LENGTH () {
    return 20
  }

  static deserializeFromTag (ctx, tag) {
    return super.deserializeFromTag(ctx, tag)
  }

  call (msg) {
    return super.call(this, msg)
  }

  equals (another) {
    return another instanceof OpSHA1
  }
}

/**
 * Cryptographic RIPEMD160 operation
 * Cryptographic operation tag numbers taken from RFC4880, although it's not
 * guaranteed that they'll continue to match that RFC in the future.
 * @extends CryptOp
 */
class OpRIPEMD160 extends CryptOp {
  _TAG () {
    return 0x03
  }

  _TAG_NAME () {
    return 'ripemd160'
  }

  _HASHLIB_NAME () {
    return 'ripemd160'
  }

  _DIGEST_LENGTH () {
    return 20
  }

  static deserializeFromTag (ctx, tag) {
    return super.deserializeFromTag(ctx, tag)
  }

  call (msg) {
    return super.call(this, msg)
  }

  equals (another) {
    return another instanceof OpRIPEMD160
  }
}

/**
 * Cryptographic SHA256 operation
 * Cryptographic operation tag numbers taken from RFC4880, although it's not
 * guaranteed that they'll continue to match that RFC in the future.
 * @extends CryptOp
 */
class OpSHA256 extends CryptOp {
  _TAG () {
    return 0x08
  }

  _TAG_NAME () {
    return 'sha256'
  }

  _HASHLIB_NAME () {
    return 'sha256'
  }

  _DIGEST_LENGTH () {
    return 32
  }

  static deserializeFromTag (ctx, tag) {
    return super.deserializeFromTag(ctx, tag)
  }

  call (msg) {
    return super.call(this, msg)
  }

  equals (another) {
    return another instanceof OpSHA256
  }
}

_SUBCLS_BY_TAG.set(new OpAppend()._TAG(), OpAppend)
_SUBCLS_BY_TAG.set(new OpPrepend()._TAG(), OpPrepend)
_SUBCLS_BY_TAG.set(new OpReverse()._TAG(), OpReverse)
_SUBCLS_BY_TAG.set(new OpHexlify()._TAG(), OpHexlify)
_SUBCLS_BY_TAG.set(new OpSHA1()._TAG(), OpSHA1)
_SUBCLS_BY_TAG.set(new OpRIPEMD160()._TAG(), OpRIPEMD160)
_SUBCLS_BY_TAG.set(new OpSHA256()._TAG(), OpSHA256)

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
}
