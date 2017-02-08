'use strict';

/**
 * Timestamp module.
 * @module Timestamp
 * @author EternityWall
 * @license LPGL3
 */

const Utils = require('./utils.js');
const Timestamp = require('./timestamp.js');
const Ops = require('./ops.js');

class Merkle{
    /** Concatenate left and right, then perform a unary operation on them left and right can be either timestamps or bytes.
     * Appropriate intermediary append/prepend operations will be created as needed for left and right.
     * */

    static cat_then_unary_op(unary_op_cls, left, right){
        if(!(left instanceof Timestamp)){
            left = new Timestamp(left);
        }
        if(!(right instanceof Timestamp)){
            right = new Timestamp(right);
        }
        // left_append_stamp = left.ops.add(OpAppend(right.msg))
        const opAppend = new Ops.OpAppend();
        let left_append_stamp = left.ops.get(opAppend);
        if (left_append_stamp === undefined) {
            left_append_stamp = new Timestamp(opAppend.call(left.msg));
            left.ops.set(opAppend, left_append_stamp);
        }
        // right_prepend_stamp = right.ops.add(OpPrepend(left.msg))
        const opPrepend = new Ops.OpPrepend();
        let right_prepend_stamp = right.ops.get(opPrepend);
        if (right_prepend_stamp === undefined) {
            right_prepend_stamp = new Timestamp(opPrepend.call(right.msg));
            right.ops.set(opPrepend, right_prepend_stamp);
        }
        // Left and right should produce the same thing, so we can set the timestamp
        // of the left to the right.
        left.ops[new Ops.OpPrepend(right.msg)] = right_prepend_stamp;


        //return right_prepend_stamp.ops.add(unary_op_cls())
        const opUnary = unary_op_cls();
        let res = right.ops.get(opUnary);
        if (res === undefined) {
            res = new Timestamp(opUnary.call(right_prepend_stamp.msg));
            right_prepend_stamp.ops.set(opUnary, res);
        }
        return res;
    }



    static cat_sha256(left, right) {
        return Merkle.cat_then_unary_op(new Ops.OpSHA256(), left, right);
    }

    static cat_sha256d(left, right) {
        const sha256_timestamp = cat_sha256(left, right);
        // res = sha256_timestamp.ops.add(OpSHA256());
        const opSHA256 = new Ops.OpSHA256();
        let res = sha256_timestamp.ops.get(opSHA256);
        if (res === undefined) {
            res = new Timestamp(opSHA256.call(sha256_timestamp.msg));
            sha256_timestamp.ops.set(opSHA256, res);
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
    static make_merkle_tree(timestamps){

        let stamps = timestamps;

        while (true){

            stamps = stamps[Symbol.iterator]();
            let prev_stamp;
            try{
                prev_stamp=stamps.next();
            }catch(err){
                return "Need at least one timestamp";
            }

            let next_stamps=[];
            for (const stamp of stamps){
                if(prev_stamp != undefined ){
                    next_stamps.push( Merkle.cat_sha256(prev_stamp,stamp) );
                    prev_stamp = undefined;
                }else {
                    prev_stamp = stamp;
                }
            }
            if (next_stamps.length==0){
                return prev_stamp;
            }
            if(prev_stamp != undefined){
                next_stamps.push(prev_stamp);
            }
            stamps = next_stamps;
        }
    }

}

module.exports = Merkle;