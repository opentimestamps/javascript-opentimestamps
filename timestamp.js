'use strict';
/**
 * Timestamp module.
 * @module Timestamp
 * @author EternityWall
 * @license GPL3
 */

const Utils = require('./utils.js');
const Notary = require('./notary.js');
const Ops = require('./ops.js');

/** Class representing Timestamp interface
 * Proof that one or more attestations commit to a message.
 * The proof is in the form of a tree, with each node being a message, and the
 edges being operations acting on those messages. The leafs of the tree are
 attestations that attest to the time that messages in the tree existed prior. */
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

  /** Deserialize a Timestamp.
   * Because the serialization format doesn't include the message that the
   timestamp operates on, you have to provide it so that the correct
   operation results can be calculated.

   The message you provide is assumed to be correct; if it causes a op to
   raise MsgValueError when the results are being calculated (done
   immediately, not lazily) DeserializationError is raised instead.
   * @param {StreamDeserializationContext} ctx - The stream deserialization context.
   * @param {initialMsg} initialMsg - The initial message.
   * @return {Timestamp} The generated Timestamp.
   */
  static deserialize(ctx, initialMsg) {
    // console.log('deserialize: ', Utils.bytesToHex(initialMsg));
    const self = new Timestamp(initialMsg);

    function doTagOrAttestation(tag, initialMsg) {
      // console.log('doTagOrAttestation: ', tag);
      if (tag === '\x00') {
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

    let tag = String.fromCharCode(ctx.readBytes(1)[0])[0];

    while (tag === '\xff') {
      let current = ctx.readBytes(1);
      current = String.fromCharCode(current[0])[0];
      doTagOrAttestation(current, initialMsg);
      tag = ctx.readBytes(1);
      tag = String.fromCharCode(tag[0])[0];
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
    // console.log(this.toString());

    // sort
    const sortedAttestations = this.attestations;
    if (sortedAttestations.length > 1) {
      for (let i = 0; i < sortedAttestations.length; i++) {
        ctx.writeBytes(['\xff', '\x00']);
        sortedAttestations[i].serialize(ctx);
      }
    }
    if (this.ops.size === 0) {
      ctx.writeBytes('\x00');
      if (sortedAttestations.length > 0) {
        sortedAttestations[sortedAttestations.length - 1].serialize(ctx);
      }
    } else if (this.ops.size > 0) {
      if (sortedAttestations.length > 0) {
        ctx.writeBytes(['\xff', '\x00']);
        sortedAttestations[sortedAttestations.length - 1].serialize(ctx);
      }
            // var sorted_ops = [];//sorted(self.ops.items(), key=lambda item: item[0])

      let lastOp;
      let lastStamp;

      for (const [key, value] of this.ops) {
        lastOp = key;
        lastStamp = value;
      }

      // console.log('lastOp : ');
      // console.log(lastOp.toString());
      // console.log(lastStamp.toString());

      lastOp.serialize(ctx);
      lastStamp.serialize(ctx);
    }
  }

  /**
   * Add all operations and attestations from another timestamp to this one.
   * @param {Timestamp} other - Initial other Timestamp to merge.
   */
  merge(other) {
    if (!(other instanceof Timestamp)) {
      console.error('Can only merge Timestamps together');
    }
    if (this.msg !== other.msg) {
      console.error('Can\'t merge timestamps for different messages together');
    }

    for (const attestation of other.attestations) {
      this.attestations.push(attestation);
    }

    for (const [otherOp, otherOpStamp] of other.ops) {
      // ourOpStamp = self.ops.add(otherOp)
      let ourOpStamp = this.ops.get(otherOp);
      if (ourOpStamp === undefined) {
        ourOpStamp = new Timestamp(otherOp.call(this.msg));
        this.ops.set(otherOp, ourOpStamp);
      }
      // otherOp_ts.ops.add(otherOp);
      ourOpStamp.merge(otherOpStamp);
    }
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
    for (const attestation of this.attestations) {
      output += Timestamp.indention(indent) + '[' + i + '] ' + attestation.toString() + '\n';
      i++;
    }

    i = 0;
    output += Timestamp.indention(indent) + this.ops.size + ' ops: \n';
    for (const [op, stamp] of this.ops) {
      output += Timestamp.indention(indent) + '[' + i + '] op: ' + op.toString() + '\n';
      output += Timestamp.indention(indent) + '[' + i + '] timestamp: \n';
      output += stamp.toString(indent + 1);
      i++;
    }
    output += '\n';
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
      for (const attestation of this.attestations) {
        for (let i = 0; i < indent; i++) {
          output += '\t';
        }
        output += 'verify ' + attestation.toString() + '\n';
      }
    }

    if (this.ops.size > 1) {
      for (const [op, timestamp] of this.ops) {
        for (let i = 0; i < indent; i++) {
          output += '\t';
        }
        output += ' -> ';
        output += op.toString() + '\n';
        output += timestamp.strTree(indent + 1) + '\n';
      }
    } else if (this.ops.size > 0) {
      for (let i = 0; i < indent; i++) {
        output += '\t';
      }
      for (const [op, timestamp] of this.ops) {
        for (let i = 0; i < indent; i++) {
          output += '\t';
        }
        output += op.toString() + '\n';

        // output += ' ( ' + Utils.bytesToHex(this.msg) + ' ) ';
        // output += '\n';
        output += timestamp.strTree(indent);
      }
    }
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
      output += '\t';
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
      for (const attestation of timestamp.attestations) {
        output += Timestamp.indention(indent);
        output += 'verify ' + attestation.toString();
        output += ' (' + Utils.bytesToHex(timestamp.msg) + ') ';
                // output += " ["+Utils.bytesToHex(timestamp.msg)+"] ";
        output += '\n';
      }
    }

    if (timestamp.ops.size > 1) {
      for (const [op, ts] of timestamp.ops) {
        output += Timestamp.indention(indent);
        output += ' -> ';
        output += op.toString();
        output += ' (' + Utils.bytesToHex(timestamp.msg) + ') ';
        output += '\n';
        output += Timestamp.strTreeExtended(ts, indent + 1);
      }
    } else if (timestamp.ops.size > 0) {
      output += Timestamp.indention(indent);
      for (const [op, ts] of timestamp.ops) {
        output += Timestamp.indention(indent);
        output += op.toString();

        output += ' ( ' + Utils.bytesToHex(timestamp.msg) + ' ) ';
        output += '\n';
        output += Timestamp.strTreeExtended(ts, indent);
      }
    }
    return output;
  }
}

module.exports = Timestamp;

