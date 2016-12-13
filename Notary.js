'use strict'

var StreamDeserializationContext=require("./StreamDeserializationContext.js");
var StreamSerializationContext=require("./StreamSerializationContext.js");
var Utils= require("./Utils.js");

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

    serialize(){
        ;
    }
}


class UnknownAttestation extends TimeAttestation {
    constructor(tag,payload) {
        this.TAG=tag;
        this.payload=payload;
    }

    serialize() {
        StreamSerializationContext.write_varbytes(UnknownAttestation.TAG());
        this.serialize_payload();
    }

    serialize_payload() {
        StreamSerializationContext.write_bytes(this.payload)
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

    serialize() {
        StreamSerializationContext.write_varbytes(PendingAttestation.TAG());
        this.serialize_payload();
    }

    serialize_payload() {
        StreamSerializationContext.write_varbytes(this.uri)
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


    serialize() {
        StreamSerializationContext.write_varbytes(BitcoinBlockHeaderAttestation.TAG());
        this.serialize_payload();
    }

    serialize_payload() {
        StreamSerializationContext.write_varuint(this.height)
    }
}


module.exports = {
    TimeAttestation: TimeAttestation,
    UnknownAttestation: UnknownAttestation,
    PendingAttestation: PendingAttestation,
    BitcoinBlockHeaderAttestation: BitcoinBlockHeaderAttestation
}
