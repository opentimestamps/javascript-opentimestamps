'use strict'

/**
 * Notary module.
 * @module Notary
 * @author EternityWall
 * @license LPGL3
 */

require('./extend-error.js')
const Context = require('./context.js')
const Utils = require('./utils.js')

/* Errors */
const VerificationError = Error.extend('VerificationError')

/** Class representing Timestamp signature verification */
class TimeAttestation {
  _TAG_SIZE () {
    return 8
  }

  _MAX_PAYLOAD_SIZE () {
    return 8192
  }

  /**
     * Deserialize a general Time Attestation to the specific subclass Attestation.
     * @param {StreamDeserializationContext} ctx - The stream deserialization context.
     * @return {Attestation} The specific subclass Attestation.
     */
  static deserialize (ctx) {
    // console.log('attestation deserialize');

    const tag = ctx.readBytes(new TimeAttestation()._TAG_SIZE())
    // console.log('tag: ', Utils.bytesToHex(tag));

    const serializedAttestation = ctx.readVarbytes(new TimeAttestation()._MAX_PAYLOAD_SIZE())
    // console.log('serializedAttestation: ', Utils.bytesToHex(serializedAttestation));

    const ctxPayload = new Context.StreamDeserialization(serializedAttestation)

    /* eslint no-use-before-define: ["error", { "classes": false }] */
    if (Utils.arrEq(tag, new PendingAttestation()._TAG()) === true) {
      return PendingAttestation.deserialize(ctxPayload)
    } else if (Utils.arrEq(tag, new BitcoinBlockHeaderAttestation()._TAG()) === true) {
      return BitcoinBlockHeaderAttestation.deserialize(ctxPayload)
    } else if (Utils.arrEq(tag, new LitecoinBlockHeaderAttestation()._TAG()) === true) {
      return LitecoinBlockHeaderAttestation.deserialize(ctxPayload)
    }
    return UnknownAttestation.deserialize(ctxPayload, tag)
  }

  /**
     * Serialize a a general Time Attestation to the specific subclass Attestation.
     * @param {StreamSerializationContext} ctx - The output stream serialization context.
     */
  serialize (ctx) {
    ctx.writeBytes(this._TAG())
    const ctxPayload = new Context.StreamSerialization()
    this.serializePayload(ctxPayload)
    ctx.writeVarbytes(ctxPayload.getOutput())
  }

  compareTo (other) {
    const deltaTag = Utils.arrCompare(this._TAG(), other._TAG())
    if (deltaTag === 0) {
      return Utils.arrCompare(this.uri, other.uri)
    }
    return deltaTag
  }
}

/**
 * Placeholder for attestations that don't support
 * @extends TimeAttestation
 */
class UnknownAttestation extends TimeAttestation {
  _TAG () {
    return this._tag
  }

  constructor (tag, payload) {
    super()
    this._tag = tag
    this.payload = payload
  }

  serializePayload (ctx) {
    ctx.writeBytes(this.payload)
  }

  static deserialize (ctxPayload, tag) {
    const payload = ctxPayload.readBytes(new TimeAttestation()._MAX_PAYLOAD_SIZE())
    return new UnknownAttestation(tag, payload)
  }

  toString () {
    return 'UnknownAttestation ' + Utils.bytesToHex(this._TAG()) + ' ' + Utils.bytesToHex(this.payload)
  }

  equals (another) {
    return (another instanceof UnknownAttestation) &&
            (Utils.arrEq(this._TAG(), another._TAG())) &&
            (Utils.arrEq(this.payload, another.payload))
  }

  compareTo (other) {
    if (other instanceof UnknownAttestation) {
      return Utils.arrCompare(this.payload, other.payload)
    }
    return super.compareTo(other)
  }
}

/**
 * Pending attestations.
 * Commitment has been recorded in a remote calendar for future attestation,
 * and we have a URI to find a more complete timestamp in the future.
 * Nothing other than the URI is recorded, nor is there provision made to add
 * extra metadata (other than the URI) in future upgrades. The rational here
 * is that remote calendars promise to keep commitments indefinitely, so from
 * the moment they are created it should be possible to find the commitment in
 * the calendar. Thus if you're not satisfied with the local verifiability of
 * a timestamp, the correct thing to do is just ask the remote calendar if
 * additional attestations are available and/or when they'll be available.
 * While we could additional metadata like what types of attestations the
 * remote calendar expects to be able to provide in the future, that metadata
 * can easily change in the future too. Given that we don't expect timestamps
 * to normally have more than a small number of remote calendar attestations,
 * it'd be better to have verifiers get the most recent status of such
 * information (possibly with appropriate negative response caching).
 * @extends TimeAttestation
 */
class PendingAttestation extends TimeAttestation {
  _TAG () {
    return [0x83, 0xdf, 0xe3, 0x0d, 0x2e, 0xf9, 0x0c, 0x8e]
  }

  _MAX_URI_LENGTH () {
    return 1000
  }

  _ALLOWED_URI_CHARS () {
    return 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._/:'
  }

  constructor (uri_) {
    super()
    this.uri = uri_
  }

  static checkUri (uri) {
    if (uri.length > new PendingAttestation()._MAX_URI_LENGTH()) {
      console.error('URI exceeds maximum length')
      return false
    }
    for (let i = 0; i < uri.length; i++) {
      const char = String.fromCharCode(uri[i])
      if (new PendingAttestation()._ALLOWED_URI_CHARS().indexOf(char) < 0) {
        console.error('URI contains invalid character ')
        return false
      }
    }
    return true
  }

  static deserialize (ctxPayload) {
    const utf8Uri = ctxPayload.readVarbytes(new PendingAttestation()._MAX_URI_LENGTH())
    if (this.checkUri(utf8Uri) === false) {
      console.error('Invalid URI: ')
      return
    }
    const decode = Buffer.from(utf8Uri).toString('ascii')
    return new PendingAttestation(decode)
  }

  serializePayload (ctx) {
    ctx.writeVarbytes(Utils.charsToBytes(this.uri))
  }

  toString () {
    return 'PendingAttestation(\'' + this.uri + '\')'
  }

  equals (another) {
    return (another instanceof PendingAttestation) &&
            (Utils.arrEq(this._TAG(), another._TAG())) &&
            (this.uri === another.uri)
  }

  compareTo (other) {
    if (other instanceof PendingAttestation) {
      return Utils.arrCompare(Utils.charsToBytes(this.uri), Utils.charsToBytes(other.uri))
    }
    return super.compareTo(other)
  }
}

/**
 * Bitcoin Block Header Attestation.
 * The commitment digest will be the merkleroot of the blockheader.
 * The block height is recorded so that looking up the correct block header in
 * an external block header database doesn't require every header to be stored
 * locally (33MB and counting). (remember that a memory-constrained local
 * client can save an MMR that commits to all blocks, and use an external service to fill
 * in pruned details).
 * Otherwise no additional redundant data about the block header is recorded.
 * This is very intentional: since the attestation contains (nearly) the
 * absolute bare minimum amount of data, we encourage implementations to do
 * the correct thing and get the block header from a by-height index, check
 * that the merkleroots match, and then calculate the time from the header
 * information. Providing more data would encourage implementations to cheat.
 * Remember that the only thing that would invalidate the block height is a
 * reorg, but in the event of a reorg the merkleroot will be invalid anyway,
 * so there's no point to recording data in the attestation like the header
 * itself. At best that would just give us extra confirmation that a reorg
 * made the attestation invalid; reorgs deep enough to invalidate timestamps are
 * exceptionally rare events anyway, so better to just tell the user the timestamp
 * can't be verified rather than add almost-never tested code to handle that case
 * more gracefully.
 * @extends TimeAttestation
 */
class BitcoinBlockHeaderAttestation extends TimeAttestation {
  _TAG () {
    return [0x05, 0x88, 0x96, 0x0d, 0x73, 0xd7, 0x19, 0x01]
  }

  constructor (height_) {
    super()
    this.height = height_
  }

  static deserialize (ctxPayload) {
    const height = ctxPayload.readVaruint()
    return new BitcoinBlockHeaderAttestation(height)
  }

  serializePayload (ctx) {
    ctx.writeVaruint(this.height)
  }

  toString () {
    return 'BitcoinBlockHeaderAttestation(' + parseInt(Utils.bytesToHex([this.height]), 16) + ')'
  }

  equals (another) {
    return (another instanceof BitcoinBlockHeaderAttestation) &&
            (Utils.arrEq(this._TAG(), another._TAG())) &&
            (this.height === another.height)
  }

  compareTo (other) {
    if (other instanceof BitcoinBlockHeaderAttestation) {
      return this.height - other.height
    }
    return super.compareTo(other)
  }

  /*
   Verify attestation against a block header
   Returns the block time on success; raises VerificationError on failure.
   */
  verifyAgainstBlockheader (digest, block) {
    if (digest.length !== 32) {
      throw new VerificationError('Expected digest with length 32 bytes; got ' + digest.length + ' bytes')
    } else if (!Utils.arrEq(digest, Utils.hexToBytes(block.merkleroot))) {
      throw new VerificationError('Digest does not match merkleroot')
    }
    return block.time
  }
}
class LitecoinBlockHeaderAttestation extends TimeAttestation {
  _TAG () {
    return [0x06, 0x86, 0x9a, 0x0d, 0x73, 0xd7, 0x1b, 0x45]
  }

  constructor (height_) {
    super()
    this.height = height_
  }

  static deserialize (ctxPayload) {
    const height = ctxPayload.readVaruint()
    return new LitecoinBlockHeaderAttestation(height)
  }

  serializePayload (ctx) {
    ctx.writeVaruint(this.height)
  }

  toString () {
    return 'LitecoinBlockHeaderAttestation(' + parseInt(Utils.bytesToHex([this.height]), 16) + ')'
  }

  equals (another) {
    return (another instanceof LitecoinBlockHeaderAttestation) &&
            (Utils.arrEq(this._TAG(), another._TAG())) &&
            (this.height === another.height)
  }

  compareTo (other) {
    if (other instanceof LitecoinBlockHeaderAttestation) {
      return this.height - other.height
    }
    return super.compareTo(other)
  }

  verifyAgainstBlockheader (digest, block) {
    if (digest.length !== 32) {
      throw new VerificationError('Expected digest with length 32 bytes; got ' + digest.length + ' bytes')
    } else if (!Utils.arrEq(digest, Utils.hexToBytes(block.merkleroot))) {
      throw new VerificationError('Digest does not match merkleroot')
    }
    return block.time
  }
}

module.exports = {
  VerificationError,
  TimeAttestation,
  UnknownAttestation,
  PendingAttestation,
  BitcoinBlockHeaderAttestation,
  LitecoinBlockHeaderAttestation
}
