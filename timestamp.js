'use strict';

const Utils = require('./utils.js');
const Notary = require('./notary.js');
const Ops = require('./ops.js');

class Timestamp {

  constructor(msg) {
    this.msg = msg;
    this.attestations = [];
    this.ops = new Map();
  }

  static deserialize(ctx, initialMsg) {
    console.log('deserialize: ', Utils.bytesToHex(initialMsg));
    const self = new Timestamp(initialMsg);

    function doTagOrAttestation(tag, initialMsg) {
      console.log('doTagOrAttestation: ', tag);
      if (tag === '\x00') {
        const attestation = Notary.TimeAttestation.deserialize(ctx);
        self.attestations.push(attestation);
        console.log('attestation ', attestation);
      } else {
        const op = Ops.Op.deserializeFromTag(ctx, tag);

        const result = op.call(initialMsg);
        console.log('result: ', Utils.bytesToHex(result));

        const stamp = Timestamp.deserialize(ctx, result);
        self.ops.set(op, stamp);

        console.log('OK');
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

  serialize(ctx) {
    console.log('serialize');

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
      sortedAttestations[sortedAttestations.length - 1].serialize(ctx);
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

      console.log('lastOp : ');
      console.log(lastOp.toString());
      console.log(lastStamp.toString());

      lastOp.serialize(ctx);
      lastStamp.serialize(ctx);
    }
  }

  toString() {
    let output = '';
    output += '*** Timestamp ***\n';
    output += 'msg: ' + Utils.bytesToHex(this.msg) + '\n';
    output += this.attestations.length + ' attestations: \n';
    let i = 0;
    for (const at of this.attestations) {
      output += '[' + i + '] ' + Utils.bytesToHex(at.toString());
      i++;
    }

    i = 0;
    output += this.ops.size + ' ops: \n';
    for (const [op, stamp] of this.ops) {
      output += '[' + i + '] op: ' + op.toString() + '\n';
      output += '[' + i + '] stamp: ' + stamp.toString() + '\n';
      i++;
    }
    output += '\n';
    return output;
  }

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

        output += ' ( ' + Utils.bytesToHex(this.msg) + ' ) ';
        output += '\n';
        output += timestamp.strTree(indent) + '\n';
      }
    }
    return output;
  }

  static indention(pos) {
    let output = '';
    for (let i = 0; i < pos; i++) {
      output += '\t';
    }
    return output;
  }

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

