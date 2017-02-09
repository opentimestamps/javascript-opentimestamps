'use strict';

/**
 * Timestamp module.
 * @module Timestamp
 * @author EternityWall
 * @license LPGL3
 */

const Utils = require('./utils.js');
const Notary = require('./notary.js');
const Ops = require('./ops.js');

/**
 * Class representing Timestamp interface
 * Proof that one or more attestations commit to a message.
 * The proof is in the form of a tree, with each node being a message, and the
 * edges being operations acting on those messages. The leafs of the tree are
 * attestations that attest to the time that messages in the tree existed prior.
 */
class Timestamp {

  /**
   * Create a Timestamp object.
   * @param {string} msg - The server url.
   */
  constructor(msg) {
    this.msg = msg;
    this.attestations = [];
    this.ops = new Map();
  }

  /**
   * Deserialize a Timestamp.
   * Because the serialization format doesn't include the message that the
   * timestamp operates on, you have to provide it so that the correct
   * operation results can be calculated.
   * The message you provide is assumed to be correct; if it causes a op to
   * raise MsgValueError when the results are being calculated (done
   * immediately, not lazily) DeserializationError is raised instead.
   * @param {StreamDeserializationContext} ctx - The stream deserialization context.
   * @param {initialMsg} initialMsg - The initial message.
   * @return {Timestamp} The generated Timestamp.
   */
  static deserialize(ctx, initialMsg) {
    // console.log('deserialize: ', Utils.bytesToHex(initialMsg));
    const self = new Timestamp(initialMsg);

    function doTagOrAttestation(tag, initialMsg) {
      // console.log('doTagOrAttestation: ', tag);
      if (tag === 0x00) {
        const attestation = Notary.TimeAttestation.deserialize(ctx);
        self.attestations.push(attestation);
        // console.log('attestation ', attestation);
      } else {
        const op = Ops.Op.deserializeFromTag(ctx, tag);

        const result = op.call(initialMsg);
        // console.log('result: ', Utils.bytesToHex(result));

        const stamp = Timestamp.deserialize(ctx, result);
        self.ops.set(op, stamp);
      }
    }

    let tag = ctx.readBytes(1)[0];
    while (tag === 0xff) {
      const current = ctx.readBytes(1)[0];
      doTagOrAttestation(current, initialMsg);
      tag = ctx.readBytes(1)[0];
    }
    doTagOrAttestation(tag, initialMsg);

    return self;
  }

  /**
   * Create a Serialize object.
   * @param {StreamSerializationContext} ctx - The stream serialization context.
   */
  serialize(ctx) {
    // console.log('SERIALIZE');
    // console.log(ctx.toString());

    // sort
    const sortedAttestations = this.attestations;
    if (sortedAttestations.length > 1) {
      for (let i = 0; i < sortedAttestations.length; i++) {
        ctx.writeBytes([0xff, 0x00]);
        sortedAttestations[i].serialize(ctx);
      }
    }
    if (this.ops.size === 0) {
      ctx.writeByte(0x00);
      if (sortedAttestations.length > 0) {
        sortedAttestations[sortedAttestations.length - 1].serialize(ctx);
      }
    } else if (this.ops.size > 0) {
      if (sortedAttestations.length > 0) {
        ctx.writeBytes([0xff, 0x00]);
        sortedAttestations[sortedAttestations.length - 1].serialize(ctx);
      }

      // all op/stamp
      let counter = 0;
      this.ops.forEach((stamp, op) => {
        if (counter < this.ops.size - 1) {
          ctx.writeBytes([0xff]);
          counter++;
        }
        op.serialize(ctx);
        stamp.serialize(ctx);
      });

      // last op/stamp
      /* let lastOp;
      let lastStamp;
      for (const [op, stamp] of this.ops) {
        lastOp = op;
        lastStamp = stamp;
      } */
      // lastOp.serialize(ctx);
      // lastStamp.serialize(ctx);
    }
  }

  /**
   * Add all operations and attestations from another timestamp to this one.
   * @param {Timestamp} other - Initial other Timestamp to merge.
   */
  merge(other) {
    if (!(other instanceof Timestamp)) {
      console.error('Can only merge Timestamps together');
      return;
    }
    if (!Utils.arrEq(this.msg, other.msg)) {
      console.error('Can\'t merge timestamps for different messages together');
      return;
    }

    other.attestations.forEach(attestation => {
      this.attestations.push(attestation);
    });

    other.ops.forEach((otherOpStamp, otherOp) => {
      // ourOpStamp = self.ops.add(otherOp)
      let ourOpStamp = this.ops.get(otherOp);
      if (ourOpStamp === undefined) {
        ourOpStamp = new Timestamp(otherOp.call(this.msg));
        this.ops.set(otherOp, ourOpStamp);
      }
      ourOpStamp.merge(otherOpStamp);
    });
  }

  /**
   * Iterate over all attestations recursively
   * @return {HashMap} Returns iterable of (msg, attestation)
   */
  allAttestations() {
    const map = new Map();
    this.attestations.forEach(attestation => {
      map.set(this.msg, attestation);
    });
    this.ops.forEach(opStamp => {
      const subMap = opStamp.allAttestations();
      subMap.forEach((b, a) => {
        map.set(a, b);
      });
    });
    return map;
  }

  /**
   * Print as memory hierarchical object.
   * @param {int} indent - Initial hierarchical indention.
   * @return {string} The output string.
   */
  toString(indent = 0) {
    let output = '';
    output += Timestamp.indention(indent) + 'msg: ' + Utils.bytesToHex(this.msg) + '\n';
    output += Timestamp.indention(indent) + this.attestations.length + ' attestations: \n';
    let i = 0;
    this.attestations.forEach(attestation => {
      output += Timestamp.indention(indent) + '[' + i + '] ' + attestation.toString() + '\n';
      i++;
    });

    i = 0;
    output += Timestamp.indention(indent) + this.ops.size + ' ops: \n';
    this.ops.forEach((stamp, op) => {
      output += Timestamp.indention(indent) + '[' + i + '] op: ' + op.toString() + '\n';
      output += Timestamp.indention(indent) + '[' + i + '] timestamp: \n';
      output += stamp.toString(indent + 1);
      i++;
    });
    output += '\n';
    return output;
  }

  /**
   * Indention function for printing tree.
   * @param {int} pos - Initial hierarchical indention.
   * @return {string} The output space string.
   */
  static indention(pos) {
    let output = '';
    for (let i = 0; i < pos; i++) {
      output += '    ';
    }
    return output;
  }

  /**
   * Print as tree hierarchical object.
   * @param {int} indent - Initial hierarchical indention.
   * @return {string} The output string.
   */
  strTree(indent = 0) {
    let output = '';
    if (this.attestations.length > 0) {
      this.attestations.forEach(attestation => {
        output += Timestamp.indention(indent);
        output += 'verify ' + attestation.toString() + '\n';
      });
    }

    if (this.ops.size > 1) {
      this.ops.forEach((timestamp, op) => {
        output += Timestamp.indention(indent);
        output += ' -> ';
        output += op.toString() + '\n';
        output += timestamp.strTree(indent + 1);
      });
    } else if (this.ops.size > 0) {
      // output += Timestamp.indention(indent);
      this.ops.forEach((timestamp, op) => {
        output += Timestamp.indention(indent);
        output += op.toString() + '\n';

        // output += ' ( ' + Utils.bytesToHex(this.msg) + ' ) ';
        // output += '\n';
        output += timestamp.strTree(indent);
      });
    }
    return output;
  }

  /**
   * Print as tree extended hierarchical object.
   * @param {int} indent - Initial hierarchical indention.
   * @return {string} The output string.
   */
  static strTreeExtended(timestamp, indent = 0) {
    let output = '';

    if (timestamp.attestations.length > 0) {
      timestamp.attestations.forEach(attestation => {
        output += Timestamp.indention(indent);
        output += 'verify ' + attestation.toString();
        output += ' (' + Utils.bytesToHex(timestamp.msg) + ') ';
                // output += " ["+Utils.bytesToHex(timestamp.msg)+"] ";
        output += '\n';
      });
    }

    if (timestamp.ops.size > 1) {
      timestamp.ops.forEach((ts, op) => {
        output += Timestamp.indention(indent);
        output += ' -> ';
        output += op.toString();
        output += ' (' + Utils.bytesToHex(timestamp.msg) + ') ';
        output += '\n';
        output += Timestamp.strTreeExtended(ts, indent + 1);
      });
    } else if (timestamp.ops.size > 0) {
      output += Timestamp.indention(indent);
      timestamp.ops.forEach((ts, op) => {
        output += Timestamp.indention(indent);
        output += op.toString();

        output += ' ( ' + Utils.bytesToHex(timestamp.msg) + ' ) ';
        output += '\n';
        output += Timestamp.strTreeExtended(ts, indent);
      });
    }
    return output;
  }

  /** Set of al Attestations.
   * @return {Array} Array of all sub timestamps with attestations.
   */
  directlyVerified() {
    if (this.attestations.length > 0) {
      return new Array(this);
    }
    let array = [];
    this.ops.forEach(value => {
      const result = value.directlyVerified();
      array = array.concat(result);
    });
    return array;
  }

  /** Set of al Attestations.
   * @return {Set} Set of all timestamp attestations.
   */
  getAttestations() {
    const set = new Set();
    this.allAttestations().forEach(attestation => {
      set.add(attestation);
    });
    return set;
  }

  /** Determine if timestamp is complete and can be verified.
   * @return {boolean} True if the timestamp is complete, False otherwise.
   */
  isTimestampComplete() {
    this.allAttestations().forEach(attestation => {
      if (attestation instanceof Notary.BitcoinBlockHeaderAttestation) {
        return true;
      }
    });
    return false;
  }

}

module.exports = Timestamp;

