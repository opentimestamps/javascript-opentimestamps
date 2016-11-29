'use strict';

var StreamDeserializationContext=require("./StreamDeserializationContext.js");
var StreamSerializationContext=require("./StreamSerializationContext.js");
var Utils=require("./Utils.js");
var Notary=require("./Notary.js");
var Ops=require("./Ops.js");

var msg = "";
var attestations ={};
var ops= [];

var HEADER_MAGIC = '\x00OpenTimestamps\x00\x00Proof\x00\xbf\x89\xe2\xe8\x84\xe8\x92\x94';
var MIN_FILE_DIGEST_LENGTH = 20 ;
var MAX_FILE_DIGEST_LENGTH = 32;
var MAJOR_VERSION = 1;

class DetachedTimestampFile {

    constructor(file_hash_op, timestamp) {
        this.file_hash_op = file_hash_op;
        this.timestamp = timestamp
    }

    file_digest(){
        return this.timestamp.msg;
    }

    static serialize(){
        StreamSerializationContext.write_bytes(HEADER_MAGIC);
        StreamSerializationContext.write_varuint(MAJOR_VERSION);
        this.file_hash_op.serialize();
        StreamSerializationContext.write_bytes(this.timestamp.msg);
        this.timestamp.serialize();
    }

    static deserialize(){
        StreamDeserializationContext.assert_magic(HEADER_MAGIC);
        StreamDeserializationContext.read_varuint();

        var file_hash_op = Ops.CryptOp.deserialize(ctx);
        var file_hash = StreamDeserializationContext.read_bytes(this.file_hash_op.DIGEST_LENGTH)
        var timestamp = Timestamp.deserialize( file_hash);

        StreamDeserializationContext.assert_eof();
        return DetachedTimestampFile(file_hash_op,timestamp);
    }
}