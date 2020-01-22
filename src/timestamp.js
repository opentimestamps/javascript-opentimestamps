'use strict'

/**
 * Timestamp module.
 * @module Timestamp
 * @author EternityWall
 * @license LPGL3
 */

const bitcore = require('bitcore-lib')
const Utils = require('./utils.js')
const Notary = require('./notary.js')
const Ops = require('./ops.js')
const Context = require('./context.js')

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
  constructor (msg) {
    if (!msg || !(msg instanceof Array)) {
      throw new TypeError('Expected msg to be bytes; got ' + typeof (msg))
    } else if (msg.length > (new Ops.Op())._MAX_MSG_LENGTH()) {
      throw new TypeError('Message exceeds Op length limit; ' + msg.length + ' > ' + (new Ops.Op())._MAX_MSG_LENGTH())
    }
    this.msg = msg
    this.attestations = []
    this.ops = new Map()
  }

  getDigest () {
    return this.msg
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
  static deserialize (ctx, initialMsg) {
    // console.log('deserialize: ', Utils.bytesToHex(initialMsg));
    const self = new Timestamp(initialMsg)

    function doTagOrAttestation (tag, initialMsg) {
      // console.log('doTagOrAttestation: ', tag);
      if (tag === 0x00) {
        const attestation = Notary.TimeAttestation.deserialize(ctx)
        self.attestations.push(attestation)
        // console.log('attestation ', attestation);
      } else {
        const op = Ops.Op.deserializeFromTag(ctx, tag)

        const result = op.call(initialMsg)
        // console.log('result: ', Utils.bytesToHex(result));

        const stamp = Timestamp.deserialize(ctx, result)
        self.ops.set(op, stamp)
      }
    }

    let tag = ctx.readBytes(1)[0]
    while (tag === 0xff) {
      const current = ctx.readBytes(1)[0]
      doTagOrAttestation(current, initialMsg)
      tag = ctx.readBytes(1)[0]
    }
    doTagOrAttestation(tag, initialMsg)

    return self
  }

  /**
   * Create a Serialize object.
   * @param {StreamSerializationContext} ctx - The stream serialization context.
   */
  serialize (ctx) {
    // console.log('SERIALIZE');
    // console.log(ctx.toString());

    if (!(this.attestations) && !(this.ops)) {
      throw new Context.ValueError('An empty timestamp can\'t be serialized')
    }

    // sort
    const sortedAttestations = this.attestations
    sortedAttestations.sort((a, b) => {
      return a.compareTo(b)
    })

    if (sortedAttestations.length > 1) {
      for (let i = 0; i < sortedAttestations.length - 1; i++) {
        ctx.writeBytes([0xff, 0x00])
        sortedAttestations[i].serialize(ctx)
      }
    }

    if (this.ops.size === 0) {
      if (sortedAttestations.length > 0) {
        ctx.writeByte(0x00)
        sortedAttestations[sortedAttestations.length - 1].serialize(ctx)
      }
    } else if (this.ops.size > 0) {
      if (sortedAttestations.length > 0) {
        ctx.writeBytes([0xff, 0x00])
        sortedAttestations[sortedAttestations.length - 1].serialize(ctx)
      }

      // all op/stamp
      let index = 0
      this.ops.forEach((stamp, op) => {
        if (index < this.ops.size - 1) {
          ctx.writeBytes([0xff])
          index++
        }
        op.serialize(ctx)
        stamp.serialize(ctx)
      })

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
  merge (other) {
    if (!(other instanceof Timestamp)) {
      throw new Context.ValueError('Can only merge Timestamps together')
    }
    if (!Utils.arrEq(this.msg, other.msg)) {
      throw new Context.ValueError('Can\'t merge timestamps for different messages together')
    }

    other.attestations.forEach(attestation => {
      this.attestations.push(attestation)
    })

    other.ops.forEach((otherOpStamp, otherOp) => {
      // ourOpStamp = self.ops.add(otherOp)
      let ourOpStamp = this.ops.get(otherOp)
      if (ourOpStamp === undefined) {
        ourOpStamp = new Timestamp(otherOp.call(this.msg))
        this.ops.set(otherOp, ourOpStamp)
      }
      ourOpStamp.merge(otherOpStamp)
    })
  }

  /**
   * Iterate over all attestations recursively
   * @return {HashMap} Returns iterable of (msg, attestation)
   */
  allAttestations () {
    const map = new Map()
    this.attestations.forEach(attestation => {
      map.set(this.msg, attestation)
    })
    this.ops.forEach(opStamp => {
      const subMap = opStamp.allAttestations()
      subMap.forEach((b, a) => {
        map.set(a, b)
      })
    })
    return map
  }

  /**
   * Print as memory hierarchical object.
   * @param {int} indent - Initial hierarchical indention.
   * @return {string} The output string.
   */
  toString (indent = 0) {
    let output = ''
    output += Timestamp.indention(indent) + 'msg: ' + Utils.bytesToHex(this.msg) + '\n'
    output += Timestamp.indention(indent) + this.attestations.length + ' attestations: \n'
    let i = 0
    this.attestations.forEach(attestation => {
      output += Timestamp.indention(indent) + '[' + i + '] ' + attestation.toString() + '\n'
      i++
    })

    i = 0
    output += Timestamp.indention(indent) + this.ops.size + ' ops: \n'
    this.ops.forEach((stamp, op) => {
      output += Timestamp.indention(indent) + '[' + i + '] op: ' + op.toString() + '\n'
      output += Timestamp.indention(indent) + '[' + i + '] timestamp: \n'
      output += stamp.toString(indent + 1)
      i++
    })
    output += '\n'
    return output
  }

  /**
   * Print as json hierarchical object.
   * @return {string} The output json object.
   */
  toJson (fork) {
    const json = {}
    if (!fork) {
      fork = 0
    }
    if (this.attestations.length > 0) {
      json.attestations = []
      this.attestations.forEach(attestation => {
        const item = {}
        item.fork = fork
        if (attestation instanceof Notary.PendingAttestation) {
          item.type = 'PendingAttestation'
          item.param = attestation.uri
        } else if (attestation instanceof Notary.UnknownAttestation) {
          item.type = 'UnknownAttestation'
          item.param = attestation.payload
        } else if (attestation instanceof Notary.BitcoinBlockHeaderAttestation) {
          item.type = 'BitcoinBlockHeaderAttestation'
          item.param = attestation.height
          item.merkle = Utils.bytesToHex(this.msg.reverse())
        } else if (attestation instanceof Notary.LitecoinBlockHeaderAttestation) {
          item.type = 'LitecoinBlockHeaderAttestation'
          item.param = attestation.height
          item.merkle = Utils.bytesToHex(this.msg.reverse())
        }
        json.attestations.push(item)
      })
    }

    json.result = Utils.bytesToHex(this.msg)
    try {
      bitcore.Transaction(Utils.bytesToHex(this.msg))
      json.tx = new Ops.OpSHA256().call(new Ops.OpSHA256().call(this.msg))
      json.tx = Utils.bytesToHex(json.tx.reverse())
    } catch (err) {
    }

    if (this.ops.size > 1) {
      fork++
    }
    if (this.ops.size > 0) {
      json.ops = []
      let count = 0
      this.ops.forEach((timestamp, op) => {
        const item = {}
        item.fork = fork + count
        item.op = op._TAG_NAME()
        item.arg = (op.arg === undefined) ? '' : Utils.bytesToHex(op.arg)
        item.result = Utils.bytesToHex(timestamp.msg)
        item.timestamp = timestamp.toJson(fork + count)
        try {
          bitcore.Transaction(Utils.bytesToHex(timestamp.msg))
          item.tx = new Ops.OpSHA256().call(new Ops.OpSHA256().call(timestamp.msg))
          item.tx = Utils.bytesToHex(item.tx.reverse())
        } catch (err) {
        }
        json.ops.push(item)
        count++
      })
    }
    return json
  }

  /**
   * Indention function for printing tree.
   * @param {int} pos - Initial hierarchical indention.
   * @return {string} The output space string.
   */
  static indention (pos) {
    let r = ''
    for (let i = 0; i < pos; i++) {
      r += '    '
    }
    return r
  }

  /**
   * Print as tree extended hierarchical object.
   * @param {int} indent - Initial hierarchical indention.
   * @param {int} verbosity - Verbose option.
   * @return {string} The output string.
   */
  strTree (indent, verbosity) {
    const bcolors = {}
    bcolors.HEADER = '\x1b[95m'
    bcolors.OKBLUE = '\x1b[94m'
    bcolors.OKGREEN = '\x1b[92m'
    bcolors.WARNING = '\x1b[93m'
    bcolors.FAIL = '\x1b[91m'
    bcolors.ENDC = '\x1b[0m'
    bcolors.BOLD = '\x1b[1m'
    bcolors.UNDERLINE = '\x1b[4m'

    function strResult (verb, parameter, result) {
      let rr = ''
      if (verb > 0 && result !== undefined) {
        rr += ' == '
        const resultHex = Utils.bytesToHex(result)
        if (parameter === undefined) {
          rr += resultHex
        } else {
          const parameterHex = Utils.bytesToHex(parameter)
          try {
            const index = resultHex.indexOf(parameterHex)
            const parameterHexHighlight = bcolors.BOLD + parameterHex + bcolors.ENDC
            if (index === 0) {
              rr += parameterHexHighlight + resultHex.substring(index + parameterHex.length, resultHex.length)
            } else {
              rr += resultHex.substring(0, index) + parameterHexHighlight
            }
          } catch (err) {
            rr += resultHex
          }
        }
      }
      return rr
    }

    if (indent === undefined) {
      indent = 0
    }
    if (verbosity === undefined) {
      verbosity = 0
    }
    let r = ''
    if (this.attestations.length > 0) {
      this.attestations.forEach(attestation => {
        r += Timestamp.indention(indent) + 'verify ' + attestation.toString() + strResult(verbosity, this.msg) + '\n'
        if (attestation instanceof Notary.BitcoinBlockHeaderAttestation) {
          const tx = Utils.bytesToHex(new Ops.OpReverse().call(this.msg))
          r += Timestamp.indention(indent) + '# Bitcoin block merkle root ' + tx + '\n'
        }
        if (attestation instanceof Notary.LitecoinBlockHeaderAttestation) {
          const tx = Utils.bytesToHex(new Ops.OpReverse().call(this.msg))
          r += Timestamp.indention(indent) + '# Litecoin block merkle root ' + tx + '\n'
        }
      })
    }
    if (this.ops.size > 1) {
      this.ops.forEach((timestamp, op) => {
        try {
          bitcore.Transaction(Utils.bytesToHex(this.msg))
          let tx = new Ops.OpReverse().call(new Ops.OpSHA256().call(new Ops.OpSHA256().call(this.msg)))
          tx = Utils.bytesToHex(tx)
          r += Timestamp.indention(indent) + '# Bitcoin transaction id ' + tx + '\n'
        } catch (err) {
        }
        const curRes = op.call(this.msg)
        const curPar = op.arg
        r += Timestamp.indention(indent) + ' -> ' + op.toString() + strResult(verbosity, curPar, curRes) + '\n'
        r += timestamp.strTree(indent + 1, verbosity)
      })
    } else if (this.ops.size > 0) {
      try {
        bitcore.Transaction(Utils.bytesToHex(this.msg))
        let tx = new Ops.OpReverse().call(new Ops.OpSHA256().call(new Ops.OpSHA256().call(this.msg)))
        tx = Utils.bytesToHex(tx)
        r += Timestamp.indention(indent) + '# transaction id ' + tx + '\n'
      } catch (err) {
      }
      const op = this.ops.keys().next().value
      const stamp = this.ops.values().next().value
      const curRes = op.call(this.msg)
      const curPar = op.arg
      r += Timestamp.indention(indent) + op.toString() + strResult(verbosity, curPar, curRes) + '\n'
      r += stamp.strTree(indent, verbosity)
    }
    return r
  }

  /** Set of al Attestations.
   * @return {Array} Array of all sub timestamps with attestations.
   */
  directlyVerified () {
    if (this.attestations.length > 0) {
      return new Array(this)
    }
    let array = []
    this.ops.forEach(value => {
      const result = value.directlyVerified()
      array = array.concat(result)
    })
    return array
  }

  /** Set of al Attestations.
   * @return {Set} Set of all timestamp attestations.
   */
  getAttestations () {
    const set = new Set()
    this.allAttestations().forEach(attestation => {
      set.add(attestation)
    })
    return set
  }

  /** Determine if timestamp is complete and can be verified.
   * @return {boolean} True if the timestamp is complete, False otherwise.
   */
  isTimestampComplete () {
    let found = false
    this.allAttestations().forEach(attestation => {
      if (attestation instanceof Notary.BitcoinBlockHeaderAttestation) {
        found = true
      } else if (attestation instanceof Notary.LitecoinBlockHeaderAttestation) {
        found = true
      } else if (attestation instanceof Notary.UnknownAttestation) {
        found = true
      }
    })
    return found
  }

  /**  Compare timestamps
   * @param timestamp the timestamp to compare with
   * @return Returns true if timestamps are equals
   */
  equals (another) {
    if (!(another instanceof Timestamp)) {
      return false
    }
    if (Utils.arrEq(this.getDigest(), another.getDigest()) === false) {
      return false
    }

    // Check attestations
    if (this.getAttestations().size !== another.getAttestations().size) {
      return false
    }
    if (this.attestations.length !== another.attestations.length) {
      return false
    }

    for (let i = 0; i < this.attestations.length; i++) {
      const a1 = this.attestations[i]
      const a2 = another.attestations[i]
      if (!(a1.equals(a2))) {
        return false
      }
    }

    // Check operations
    if (this.ops.size !== another.ops.size) {
      return false
    }

    let it1 = this.ops.keys()
    let it2 = this.ops.keys()
    for (let i = 0; i < this.ops.size; i++) {
      const op1 = it1.next().value
      const op2 = it2.next().value
      if (!(op1.equals(op2))) {
        return false
      }
    }

    it1 = this.ops.values()
    it2 = this.ops.values()
    for (let i = 0; i < this.ops.size; i++) {
      const t1 = it1.next().value
      const t2 = it2.next().value
      if (!(t1.equals(t2))) {
        return false
      }
    }

    return true
  }

  /**
     * Add Op to current timestamp and return the sub stamp
     * @param op - The operation to insert
     * @return Returns the sub timestamp
     */
  add (op) {
    // nonce_appended_stamp = timestamp.ops.add(com.eternitywall.ots.op.OpAppend(os.urandom(16)))
    // Op opAppend = new OpAppend(bytes);

    if (this.ops.has(op)) {
      return this.ops.get(op)
    }

    const stamp = new Timestamp(op.call(this.msg))
    this.ops.set(op, stamp)
    return stamp
  }

  /**
     * Iterate over all tips recursively
     * @return Returns iterable of (msg, attestation)
     */
  allTips () {
    const set = new Set()
    if (this.ops.size === 0) {
      set.add(this.msg)
    }
    this.ops.forEach(stamp => {
      const subSet = stamp.allTips()
      subSet.forEach(msg => {
        set.add(msg)
      })
    })
    return set
  }
}

module.exports = Timestamp
