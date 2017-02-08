'use strict';

/**
 * Timestamp module.
 * @module Timestamp
 * @author EternityWall
 * @license LPGL3
 */

const Timestamp = require('./timestamp.js');
const Ops = require('./ops.js');

class Merkle {
    /** Concatenate left and right, then perform a unary operation on them left and right can be either timestamps or bytes.
     * Appropriate intermediary append/prepend operations will be created as needed for left and right.
     * */

  static catThenUnaryOp(unaryOpCls, left, right) {
    if (!(left instanceof Timestamp)) {
      left = new Timestamp(left);
    }
    if (!(right instanceof Timestamp)) {
      right = new Timestamp(right);
    }
        // leftAppendStamp = left.ops.add(OpAppend(right.msg))
    const opAppend = new Ops.OpAppend();
    let leftAppendStamp = left.ops.get(opAppend);
    if (leftAppendStamp === undefined) {
      leftAppendStamp = new Timestamp(opAppend.call(left.msg));
      left.ops.set(opAppend, leftAppendStamp);
    }
        // rightPrependStamp = right.ops.add(OpPrepend(left.msg))
    const opPrepend = new Ops.OpPrepend();
    let rightPrependStamp = right.ops.get(opPrepend);
    if (rightPrependStamp === undefined) {
      rightPrependStamp = new Timestamp(opPrepend.call(right.msg));
      right.ops.set(opPrepend, rightPrependStamp);
    }
        // Left and right should produce the same thing, so we can set the timestamp
        // of the left to the right.
    left.ops[new Ops.OpPrepend(right.msg)] = rightPrependStamp;

        // return rightPrependStamp.ops.add(unaryOpCls())
    const opUnary = unaryOpCls();
    let res = right.ops.get(opUnary);
    if (res === undefined) {
      res = new Timestamp(opUnary.call(rightPrependStamp.msg));
      rightPrependStamp.ops.set(opUnary, res);
    }
    return res;
  }

  static catSha256(left, right) {
    return Merkle.catThenUnaryOp(new Ops.OpSHA256(), left, right);
  }

  static catSha256d(left, right) {
    const sha256Timestamp = Merkle.catSha256(left, right);
        // res = sha256Timestamp.ops.add(OpSHA256());
    const opSHA256 = new Ops.OpSHA256();
    let res = sha256Timestamp.ops.get(opSHA256);
    if (res === undefined) {
      res = new Timestamp(opSHA256.call(sha256Timestamp.msg));
      sha256Timestamp.ops.set(opSHA256, res);
    }
    return res;
  }

    /** Merkelize a set of timestamps
     * A merkle tree of all the timestamps is built in-place using binop() to
     timestamp each pair of timestamps. The exact algorithm used is structurally
     identical to a merkle-mountain-range, although leaf sums aren't committed.
     As this function is under the consensus-critical core, it's guaranteed that
     the algorithm will not be changed in the future.
     Returns the timestamp for the tip of the tree.
     * */
  static makeMerkleTree(timestamps) {
    let stamps = timestamps;
    let nextStamps = [];
    do {
      stamps = stamps[Symbol.iterator]();
      let prevStamp;
      try {
        prevStamp = stamps.next();
      } catch (err) {
        return 'Need at least one timestamp';
      }

      nextStamps = [];
      for (let i = 0; i < stamps.size; i++) {
        const stamp = stamps[i];
        if (prevStamp === undefined) {
          prevStamp = stamp;
        } else {
          nextStamps.push(Merkle.catSha256(prevStamp, stamp));
          prevStamp = undefined;
        }
      }

      if (prevStamp !== undefined) {
        nextStamps.push(prevStamp);
      }
      if (nextStamps.length > 0) {
        stamps = nextStamps;
      }
    } while (nextStamps.length > 0);
  }

}

module.exports = Merkle;
