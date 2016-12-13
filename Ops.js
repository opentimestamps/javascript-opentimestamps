'use strict';

var StreamDeserializationContext=require("./StreamDeserializationContext.js");
var StreamSerializationContext=require("./StreamSerializationContext.js");
var Utils= require("./Utils.js");
var crypto= require('crypto');

class Op{

    constructor(){
    }

    static MAX_RESULT_LENGTH(){
        return 4096;
    }
    static MAX_MSG_LENGTH(){
        return 4096;
    }

    static deserialize(){
        this.tag = StreamDeserializationContext.read_bytes(1);
        return this.deserialize_from_tag(tag);
    };

    static deserialize_from_tag(tag) {
        if (Object.keys(SUBCLS_BY_TAG).indexOf(tag) != -1) {
            return SUBCLS_BY_TAG[tag].deserialize_from_tag(tag)
        }  else {
            console.log("Unknown operation tag: ", Utils.bytesToHex([tag.charCodeAt()]));
        }
    };
    serialize(tag){
        StreamSerializationContext.write_bytes(tag);
    };
}

// BINARY SECTION
class OpBinary extends Op {

    constructor(arg) {
        super();
        this.arg = arg;
    }

    static deserialize_from_tag(cls, tag) {
        if (Object.keys(SUBCLS_BY_TAG).indexOf(tag) != -1) {
            var arg = StreamDeserializationContext.read_varbytes(cls.MAX_RESULT_LENGTH(), 1)
            console.log("read: "+Utils.bytesToHex(arg));
            return new SUBCLS_BY_TAG[tag](arg);
        } else {
            console.log("Unknown operation tag: ", Utils.bytesToHex([tag.charCodeAt()]));
        }
    }
    serialize(tag){
        super.serialize(tag);
        StreamSerializationContext.write_varbytes(this.arg[0]);
    }
    toString() {
        return "OpBinary";
    }
}


class OpAppend extends OpBinary {
    constructor(arg_) {
        super(arg_);
        this.arg = arg_;
    }
    static TAG(){
        return '\xf0';
    }
    static TAG_NAME(){
        return 'append';
    }
    call(msg) {
        return msg.concat(this.arg)
    }
    static deserialize_from_tag(tag) {
        return super.deserialize_from_tag(this, tag);
    }
    serialize() {
        return super.serialize(OpAppend.TAG());
    }
    toString() {
        return OpAppend.TAG_NAME();
    }
}

class OpPrepend extends OpBinary {
    constructor(arg_) {
        super(arg_);
        this.arg = arg_;
    }
    static TAG(){
        return '\xf1';
    }
    static TAG_NAME(){
        return 'prepend';
    }
    call(msg) {
        return this.arg.concat(msg)
    }
    static deserialize_from_tag(tag) {
        return super.deserialize_from_tag(this, tag);
    }
    toString() {
        console.log(OpAppend.TAG_NAME());
    }
    toString() {
        return OpAppend.TAG_NAME();
    }
}

// UNARY SECTION
class OpUnary extends Op {
    constructor(arg) {
        super();
        this.arg = arg;
    }
    static deserialize_from_tag(cls, tag) {
        if (Object.keys(SUBCLS_BY_TAG).indexOf(tag) != -1) {
            return new SUBCLS_BY_TAG[tag]();
        } else {
            console.log("Unknown operation tag: ", Utils.bytesToHex([tag.charCodeAt()]));
        }
    }
    toString() {
        return "OpUnary";
    }
}

class OpReverse extends OpUnary {
    constructor(arg_) {
        super(arg_);
        this.arg = arg_;
    }
    static TAG(){
        return '\xf2';
    }
    static TAG_NAME(){
        return 'reverse';
    }
    call(msg) {
        if (msg.length==0) {
            console.log("Can't reverse an empty message")
        }
        //return msg;//[::-1];
    }
    static deserialize_from_tag(tag) {
        return super.deserialize_from_tag(this, tag);
    }
    toString() {
        return OpAppend.TAG_NAME();
    }
}

class OpHexlify extends OpUnary {
    constructor(arg_) {
        super(arg_);
        this.arg = arg_;
    }
    static TAG(){
        return '\xf3';
    }
    static TAG_NAME(){
        return 'hexlify';
    }
    static MAX_MSG_LENGTH() {
        return UnaryOp.MAX_RESULT_LENGTH() // 2
    }
    call(msg) {
        if (msg.length==0) {
            console.log("Can't hexlify an empty message")
        }
        //return msg;//[::-1];
    }
    static deserialize_from_tag(tag) {
        return super.deserialize_from_tag(this, tag);
    }
    toString() {
        return OpAppend.TAG_NAME();
    }
}

class CryptOp extends OpUnary {

    static HASHLIB_NAME(){
        return '';
    }
    call(cls,msg){
        var shasum = crypto.createHash( cls.HASHLIB_NAME() ).update(new Buffer(msg));
        var hashDigest = shasum.digest();
        var output=[hashDigest.length];
        for (var i=0;i<hashDigest.length;i++){
            output[i]=hashDigest[i];
        }
        return output;
    }
    static deserialize_from_tag(cls,tag) {
        return super.deserialize_from_tag(cls, tag);
    }
    toString() {
        return OpAppend.TAG_NAME();
    }
}

class OpSHA1 extends CryptOp{
    static TAG(){
        return '\x02';
    }
    static TAG_NAME(){
        return 'sha1';
    }
    static HASHLIB_NAME(){
        return 'sha1';
    }
    static DIGEST_LENGTH(){
        return  20;
    }
    static deserialize_from_tag(tag) {
        return super.deserialize_from_tag(this, tag);
    }
    call(msg){
        return super.call(OpSHA1,msg);
    }
    toString() {
        return OpAppend.TAG_NAME();
    }
}

class OpRIPEMD160 extends CryptOp{
    static TAG(){
        return '\x02';
    }
    static TAG_NAME(){
        return 'ripemd160';
    }
    static HASHLIB_NAME(){
        return 'ripemd160';
    }
    static DIGEST_LENGTH(){
        return 20;
    }
    static deserialize_from_tag(tag) {
        return super.deserialize_from_tag(this, tag);
    }
    call(msg){
        return super.call(OpRIPEMD160,msg);
    }
    toString() {
        return OpAppend.TAG_NAME();
    }
}


class OpSHA256 extends CryptOp{
    static TAG(){
        return '\x08';
    }
    static TAG_NAME(){
        return 'sha256';
    }
    static HASHLIB_NAME(){
        return 'sha256';
    }
    static DIGEST_LENGTH(){
        return 32;
    }
    static deserialize_from_tag(tag) {
        return super.deserialize_from_tag(this, tag);
    }
    call(msg){
        return super.call(OpSHA256,msg);
    }
    toString() {
        return OpAppend.TAG_NAME();
    }
}

var SUBCLS_BY_TAG=[];
SUBCLS_BY_TAG[OpAppend.TAG()]=OpAppend;
SUBCLS_BY_TAG[OpPrepend.TAG()]=OpPrepend;
SUBCLS_BY_TAG[OpReverse.TAG()]=OpReverse;
SUBCLS_BY_TAG[OpHexlify.TAG()]=OpHexlify;
SUBCLS_BY_TAG[OpSHA1.TAG()]=new OpSHA1;
SUBCLS_BY_TAG[OpRIPEMD160.TAG()]=OpRIPEMD160;
SUBCLS_BY_TAG[OpSHA256.TAG()]=OpSHA256;

module.exports = {
    Op: Op,
    OpAppend: OpAppend,
    OpPrepend: OpPrepend,
    OpReverse: OpReverse,
    OpHexlify: OpHexlify,
    OpSHA1: OpSHA1,
    OpRIPEMD160: OpRIPEMD160,
    OpSHA256: OpSHA256,
    CryptOp: CryptOp
}

