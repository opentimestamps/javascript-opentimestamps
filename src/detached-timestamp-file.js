'use strict'

/**
 * Detached Timestamp File module.
 * @module DetachedTimestampFile
 * @author EternityWall
 * @license LPGL3
 */

const Ops = require('./ops.js')
const Timestamp = require('./timestamp.js')
const Utils = require('./utils.js')
const Context = require('./context.js')

/**
 * Header magic bytes
 * Designed to be give the user some information in a hexdump, while being identified as 'data' by the file utility.
 * @type {int[]}
 * @default \x00OpenTimestamps\x00\x00Proof\x00\xbf\x89\xe2\xe8\x84\xe8\x92\x94
 */
const HEADER_MAGIC = [0x00, 0x4f, 0x70, 0x65, 0x6e, 0x54, 0x69, 0x6d, 0x65, 0x73, 0x74, 0x61, 0x6d, 0x70, 0x73, 0x00, 0x00, 0x50, 0x72, 0x6f, 0x6f, 0x66, 0x00, 0xbf, 0x89, 0xe2, 0xe8, 0x84, 0xe8, 0x92, 0x94]

/**
 * While the git commit timestamps have a minor version, probably better to
 * leave it out here: unlike Git commits round-tripping is an issue when
 * timestamps are upgraded, and we could end up with bugs related to not
 * saving/updating minor version numbers correctly.
 * @type {int}
 * @default 1
 */
const MAJOR_VERSION = 1
// const MIN_FILE_DIGEST_LENGTH = 20;
// const MAX_FILE_DIGEST_LENGTH = 32;

/**
 * Class representing Detached Timestamp File.
 * A file containing a timestamp for another file.
 * Contains a timestamp, along with a header and the digest of the file.
 */
class DetachedTimestampFile {
  constructor (fileHashOp, timestamp) {
    if (!(fileHashOp instanceof Ops.Op) || !(timestamp instanceof Timestamp)) {
      throw new Context.ValueError('Invalid Timestamp or fileHashOp')
    }
    if (timestamp.msg.length !== fileHashOp._DIGEST_LENGTH()) {
      throw new Context.ValueError('Timestamp message length and fileHashOp digest length differ')
    }

    this.fileHashOp = fileHashOp
    this.timestamp = timestamp
  }

  /**
   * The digest of the file that was timestamped.
   * @return {byte} The message inside the timestamp.
   */
  fileDigest () {
    return this.timestamp.msg
  }

  /**
   * Serialize a Timestamp File.
   * @param {StreamSerializationContext} ctx - The stream serialization context.
   */
  serialize (ctx) {
    ctx.writeBytes(HEADER_MAGIC)
    ctx.writeVaruint(MAJOR_VERSION)
    this.fileHashOp.serialize(ctx)
    ctx.writeBytes(this.timestamp.msg)
    this.timestamp.serialize(ctx)
  }

  /**
   * Serialize a Timestamp File into a byte array.
   * @return {byte[]} The serialized DetachedTimestampFile object.
   */
  serializeToBytes () {
    const ctx = new Context.StreamSerialization()
    this.serialize(ctx)
    return ctx.getOutput()
  }

  /**
   * Deserialize a Timestamp File.
   * @param {StreamDeserializationContext} buffer - The stream deserialization context.
   * @return {DetachedTimestampFile} The generated DetachedTimestampFile object.
   */
  static deserialize (buffer) {
    // If ctx is a buffer, build the StreamDeserialization obj
    let ctx
    if (buffer instanceof Context.StreamDeserialization) {
      ctx = buffer
    } else if (buffer instanceof Array) {
      ctx = new Context.StreamDeserialization(buffer)
    } else if (buffer instanceof Uint8Array) {
      ctx = new Context.StreamDeserialization(Array.from(buffer))
    } else if (buffer instanceof ArrayBuffer) {
      ctx = new Context.StreamDeserialization(Array.from(buffer))
    } else {
      throw new Error('StreamDeserialization deserialize: Invalid param')
    }

    ctx.assertMagic(HEADER_MAGIC)
    const major = ctx.readVaruint()
    if (major !== MAJOR_VERSION) {
      throw new Context.UnsupportedMajorVersion('Version ' + major + ' detached timestamp files are not supported')
    }

    const fileHashOp = Ops.CryptOp.deserialize(ctx)
    const fileHash = ctx.readBytes(fileHashOp._DIGEST_LENGTH())
    const timestamp = Timestamp.deserialize(ctx, fileHash)

    ctx.assertEof()
    return new DetachedTimestampFile(fileHashOp, timestamp)
  }

  /**
   * Read the Detached Timestamp File from bytes.
   * @param {Op} fileHashOp - The file hash operation.
   * @param {StreamDeserialization} ctx - The stream deserialization context.
   * @return {DetachedTimestampFile} The generated DetachedTimestampFile object.
   */
  static fromBytes (fileHashOp, buffer) {
    if (!(fileHashOp instanceof Ops.Op)) {
      throw new Error('DetachedTimestampFile: Invalid fileHashOp param')
    }
    let fdHash
    if (buffer instanceof Context.StreamDeserialization) {
      fdHash = fileHashOp.hashFd(buffer)
    } else if (buffer instanceof Array) {
      const ctx = new Context.StreamDeserialization(buffer)
      fdHash = fileHashOp.hashFd(ctx)
    } else if (buffer instanceof Uint8Array) {
      const ctx = new Context.StreamDeserialization(Array.from(buffer))
      fdHash = fileHashOp.hashFd(ctx)
    } else if (buffer instanceof ArrayBuffer) {
      const ctx = new Context.StreamDeserialization(Array.from(buffer))
      fdHash = fileHashOp.hashFd(ctx)
    } else {
      throw new Error('DetachedTimestampFile: Invalid buffer param')
    }
    return new DetachedTimestampFile(fileHashOp, new Timestamp(fdHash))
  }

  /**
   * Read the Detached Timestamp File from hash.
   * @param {Op} fileHashOp - The file hash operation.
   * @param {int[]} fdHash - The hash of the file.
   * @return {DetachedTimestampFile} The generated DetachedTimestampFile object.
   */
  static fromHash (fileHashOp, fdHash) {
    if (!(fileHashOp instanceof Ops.Op)) {
      throw new Error('DetachedTimestampFile: Invalid fileHashOpss param')
    }
    if (fdHash instanceof Array) {
      return new DetachedTimestampFile(fileHashOp, new Timestamp(fdHash))
    } else if ((fdHash instanceof ArrayBuffer) || (fdHash instanceof Uint8Array)) {
      return new DetachedTimestampFile(fileHashOp, new Timestamp(Array.from(fdHash)))
    } else {
      throw new Error('DetachedTimestampFile: Invalid fdHash param')
    }
  }

  /**
   * Print the object.
   * @return {string} The output.
   */
  toString () {
    let output = 'DetachedTimestampFile\n'
    output += 'fileHashOp: ' + this.fileHashOp.toString() + '\n'
    output += 'timestamp: ' + this.timestamp.toString() + '\n'
    return output
  }

  /**
   * Print as json hierarchical object.
   * @return {string} The output json object.
   */
  toJson () {
    const json = {}
    json.hash = Utils.bytesToHex(this.fileDigest())
    json.op = this.fileHashOp._HASHLIB_NAME()
    json.timestamp = this.timestamp.toJson()
  }

  equals (another) {
    if (!(another instanceof DetachedTimestampFile)) {
      return false
    }
    if (!(another.fileHashOp.equals(this.fileHashOp))) {
      return false
    }
    if (!(another.timestamp.equals(this.timestamp))) {
      return false
    }
    return true
  }
}

module.exports = DetachedTimestampFile
