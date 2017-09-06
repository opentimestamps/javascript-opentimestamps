'use strict';

/**
 * Timestamp module.
 * @module Timestamp
 * @author EternityWall
 * @license LPGL3
 */

const bitcore = require('bitcore-lib');
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

  getDigest() {
    return this.msg;
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
    sortedAttestations.sort((a, b) => {
      return a.compareTo(b);
    });

    if (sortedAttestations.length > 1) {
      for (let i = 0; i < sortedAttestations.length - 1; i++) {
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
      let index = 0;
      this.ops.forEach((stamp, op) => {
        if (index < this.ops.size - 1) {
          ctx.writeBytes([0xff]);
          index++;
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
   * Print as json hierarchical object.
   * @return {string} The output json object.
   */
  toJson(fork) {
    const json = {};
    if (!fork) {
      fork = 0;
    }
    if (this.attestations.length > 0) {
      json.attestations = [];
      this.attestations.forEach(attestation => {
        const item = {};
        item.fork = fork;
        if (attestation instanceof Notary.PendingAttestation) {
          item.type = 'PendingAttestation';
          item.param = attestation.uri;
        } else if (attestation instanceof Notary.UnknownAttestation) {
          item.type = 'UnknownAttestation';
          item.param = attestation.payload;
        } else if (attestation instanceof Notary.BitcoinBlockHeaderAttestation) {
          item.type = 'BitcoinBlockHeaderAttestation';
          item.param = attestation.height;
          item.merkle = Utils.bytesToHex(this.msg.reverse());
        } else if (attestation instanceof Notary.EthereumBlockHeaderAttestation) {
          item.type = 'EthereumBlockHeaderAttestation';
          item.param = attestation.height;
          item.merkle = Utils.bytesToHex(this.msg.reverse());
        }
        json.attestations.push(item);
      });
    }

    json.result = Utils.bytesToHex(this.msg);
    try {
      bitcore.Transaction(Utils.bytesToHex(this.msg));
      json.tx = new Ops.OpSHA256().call(new Ops.OpSHA256().call(this.msg));
      json.tx = Utils.bytesToHex(json.tx.reverse());
    } catch (err) {
    }

    if (this.ops.size > 1) {
      fork++;
    }
    if (this.ops.size > 0) {
      json.ops = [];
      let count = 0;
      this.ops.forEach((timestamp, op) => {
        const item = {};
        item.fork = fork + count;
        item.op = op._TAG_NAME();
        item.arg = Utils.bytesToHex(op.arg);
        item.result = Utils.bytesToHex(timestamp.msg);
        item.timestamp = timestamp.toJson(fork + count);
        try {
          bitcore.Transaction(Utils.bytesToHex(timestamp.msg));
          item.tx = new Ops.OpSHA256().call(new Ops.OpSHA256().call(timestamp.msg));
          item.tx = Utils.bytesToHex(item.tx.reverse());
        } catch (err) {
        }
        json.ops.push(item);
        count++;
      });
    }
    return json;
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
    let found = false;
    this.allAttestations().forEach(attestation => {
      if (attestation instanceof Notary.BitcoinBlockHeaderAttestation) {
        found = true;
      }
    });
    return found;
  }

  /**  Compare timestamps
   * @param timestamp the timestamp to compare with
   * @return Returns true if timestamps are equals
   */
  equals(another) {
    if (!(another instanceof Timestamp)) {
      return false;
    }
    if (Utils.arrEq(this.getDigest(), another.getDigest()) === false) {
      return false;
    }

    // Check attestations
    if (this.getAttestations().size !== another.getAttestations().size) {
      return false;
    }
    if (this.attestations.length !== another.attestations.length) {
      return false;
    }

    for (let i = 0; i < this.attestations.length; i++) {
      const a1 = this.attestations[i];
      const a2 = another.attestations[i];
      if (!(a1.equals(a2))) {
        return false;
      }
    }

    // Check operations
    if (this.ops.size !== another.ops.size) {
      return false;
    }

    let it1 = this.ops.keys();
    let it2 = this.ops.keys();
    for (let i = 0; i < this.ops.size; i++) {
      const op1 = it1.next().value;
      const op2 = it2.next().value;
      if (!(op1.equals(op2))) {
        return false;
      }
    }

    it1 = this.ops.values();
    it2 = this.ops.values();
    for (let i = 0; i < this.ops.size; i++) {
      const t1 = it1.next().value;
      const t2 = it2.next().value;
      if (!(t1.equals(t2))) {
        return false;
      }
    }

    return true;
  }
}

module.exports = Timestamp;

