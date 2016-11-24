'use strict';

var StreamDeserializationContext=require("./StreamDeserializationContext.js");
var Utils=require("./Utils.js");
var crypto= require('crypto');

var msg = "";
var attestations ={};
var ops= [];

var SUBCLS_BY_TAG = [];

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
        var tag = StreamDeserializationContext.read_bytes(1);
        return this.deserialize_from_tag(tag);
    };

    static deserialize_from_tag(tag) {
        if (Object.keys(SUBCLS_BY_TAG).indexOf(tag) != -1) {
            return SUBCLS_BY_TAG[tag].deserialize_from_tag(tag)
        }  else {
            console.log("Unknown operation tag: ", Utils.bytesToHex([tag.charCodeAt()]));
        }
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
}



class Timestamp {

    constructor(msg) {
        this.msg=msg;
        this.attestations=[];
        this.ops=[];
    }


    static deserialize  (initial_msg){

        console.log("deserialize: ",Utils.bytesToHex(initial_msg))
        var self= new Timestamp(initial_msg);


        function do_tag_or_attestation (tag) {
            console.log("do_tag_or_attestation: ", Utils.bytesToHex([tag.charCodeAt()]));
            if (tag == '\x00') {
                var attestation = TimeAttestation.deserialize();
                self.attestations.push(attestation);
                console.log("attestation ",attestation);
            } else {
                /*op = Op.deserialize_from_tag(ctx, tag)

                 try:
                 result = op(initial_msg)
                 except MsgValueError as exp:
                 raise opentimestamps.core.serialize.DeserializationError("Invalid timestamp; message invalid for op %r: %r" % (op, exp))

                 stamp = Timestamp.deserialize(ctx, result, _recursion_limit=_recursion_limit-1)
                 self.ops[op] = stamp*/

                var op = Op.deserialize_from_tag(tag);

                var result = op.call(initial_msg);
                console.log("result: ",Utils.bytesToHex(result));

                var stamp= Timestamp.deserialize(result)
                self.ops[op] = stamp

                console.log("OK");

            }
        };

        var tag = StreamDeserializationContext.read_bytes(1);
        var tag = String.fromCharCode(tag[0])[0];

        while(tag=='\xff'){
            var current= StreamDeserializationContext.read_bytes(1);
            do_tag_or_attestation(current,initial_msg);
            tag = StreamDeserializationContext.read_bytes(1);
        }
        do_tag_or_attestation(tag,initial_msg);
        return self;
    };

}


/*
// It's a good idea to have a utility class to wire up inheritance.
function inherit(cls, superCls) {
    // We use an intermediary empty constructor to create an
    // inheritance chain, because using the super class' constructor
    // might have side effects.
    var construct = function () {};
    construct.prototype = superCls.prototype;
    cls.prototype = new construct;
    cls.prototype.constructor = cls;
    cls.super = superCls;
}
*/

class TimeAttestation{


    constructor() {
    }

    static TAG_SIZE(){return 8;}
    static MAX_PAYLOAD_SIZE(){return 8192;}


    static deserialize  (){
        console.log("attestation deserialize");

        var tag = StreamDeserializationContext.read_bytes(this.TAG_SIZE());
        console.log("tag: ",Utils.bytesToHex(tag));

        console.log("tag(PendingAttestation): ",Utils.bytesToHex(PendingAttestation.TAG()));
        console.log("tag(BitcoinBlockHeaderAttestation): ",Utils.bytesToHex(BitcoinBlockHeaderAttestation.TAG()));
/*
        var serialized_attestation = StreamDeserializationContext.read_varbytes(this.MAX_PAYLOAD_SIZE())
        console.log("serialized_attestation: ",Utils.bytesToHex(serialized_attestation));

        // Fake object
        var payload_ctx = serialized_attestation;//opentimestamps.core.serialize.BytesDeserializationContext(serialized_attestation)
        console.log("payload_ctx: ",Utils.bytesToHex(payload_ctx));
*/

        if (Utils.arrEq(tag, PendingAttestation.TAG()) == true){
            console.log("PendingAttestation: ");
            return PendingAttestation.deserialize()
        }else if (Utils.arrEq(tag, BitcoinBlockHeaderAttestation.TAG()) == true){
            console.log("BitcoinBlockHeaderAttestation: ");
            return BitcoinBlockHeaderAttestation.deserialize()
        }else {
            console.log("UnknownAttestation: ");
            var serialized_attestation = StreamDeserializationContext.read_varbytes(this.MAX_PAYLOAD_SIZE())
            return UnknownAttestation(tag,serialized_attestation);
        }
        console.log();
        return;
    }
}


class UnknownAttestation extends TimeAttestation {
    constructor(tag,payload) {
        this.TAG=tag;
        this.payload=payload;
    }
}

class PendingAttestation extends TimeAttestation{
    static TAG(){ return [0x83,0xdf,0xe3,0x0d,0x2e,0xf9,0x0c,0x8e];}
    static MAX_URI_LENGTH(){return 1000;}
    static ALLOWED_URI_CHARS(){return "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._/:";}


    constructor(uri_) {
        super();
        //this.check_uri(uri_);
        this.uri=uri_;
    }

    static check_uri(uri){
        if (uri.length > this.MAX_URI_LENGTH()){
            console.log("URI exceeds maximum length");
            return false;
        }
        for (var i=0;i<uri.length;i++){
            var char=uri[i];
            /*if (!this.ALLOWED_URI_CHARS().contains(char)){
                console.log("URI contains invalid character ");
                return false;
            }*/
        }
        return true;
    }

    static deserialize(){
        var utf8_uri = StreamDeserializationContext.read_varbytes(this.MAX_URI_LENGTH())
        if( this.check_uri(utf8_uri) == false ){
            console.log("Invalid URI: ");
            return;
        }
        var decode=new Buffer(utf8_uri).toString('ascii');
        return new PendingAttestation(decode)

    }
}



class BitcoinBlockHeaderAttestation extends TimeAttestation {

    static TAG() {
        return [0x05, 0x88, 0x96, 0x0d, 0x73, 0xd7, 0x19, 0x01];
    }

    constructor(height_) {
        super();
        this.height = height_;
    }

    static deserialize() {
        var height = StreamDeserializationContext.read_varuint()
        return new BitcoinBlockHeaderAttestation(height)
    }
}




SUBCLS_BY_TAG[OpAppend.TAG()]=OpAppend;
SUBCLS_BY_TAG[OpPrepend.TAG()]=OpPrepend;
SUBCLS_BY_TAG[OpReverse.TAG()]=OpReverse;
SUBCLS_BY_TAG[OpHexlify.TAG()]=OpHexlify;
SUBCLS_BY_TAG[OpSHA1.TAG()]=new OpSHA1;
SUBCLS_BY_TAG[OpRIPEMD160.TAG()]=OpRIPEMD160;
SUBCLS_BY_TAG[OpSHA256.TAG()]=OpSHA256;


var digest="1c15d1c0495b248e721d6af4f9a9949935abab15affbc3b248d2fa896b1b0fc6";
var digest_bytes=Utils.hexToBytes(digest);

Timestamp.deserialize(digest_bytes);


