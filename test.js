

var StreamDeserializationContext=require("./StreamDeserializationContext.js");
StreamDeserializationContext.open();
var Utils=require("./Utils.js");

var digest="1c15d1c0495b248e721d6af4f9a9949935abab15affbc3b248d2fa896b1b0fc6";
var resp="f010f393dbe2ddb8353c1c20026d9afd551708f104583574c8f008260721746284f7c60083dfe30d2ef90c8e2e2d68747470733a2f2f616c6963652e6274632e63616c656e6461722e6f70656e74696d657374616d70732e6f7267";

var resp_bytes=Utils.hexToBytes(resp);
var digest_bytes=Utils.hexToBytes(digest);

console.log("resp_bytes: ",resp);
console.log("digest_bytes: ",digest);

var Timestamp=require("./Timestamp.js");



//StreamDeserializationContext.digest(digest_bytes);
//StreamDeserializationContext.resp(resp_bytes);


/*
var DetachedTimestampFile = {
    HEADER_MAGIC : '\x00OpenTimestamps\x00\x00Proof\x00\xbf\x89\xe2\xe8\x84\xe8\x92\x94',
    MIN_FILE_DIGEST_LENGTH : 20,
    MAX_FILE_DIGEST_LENGTH : 32,
    MAJOR_VERSION : 1,

    serialize : function (){

    }
}*/

/*
class DetachedTimestampFile{

    var HEADER_MAGIC = '\x00OpenTimestamps\x00\x00Proof\x00\xbf\x89\xe2\xe8\x84\xe8\x92\x94';

    var MIN_FILE_DIGEST_LENGTH = 20; // 160-bit hash
    var MAX_FILE_DIGEST_LENGTH = 32; // 256-bit hash
    var MAJOR_VERSION = 1


    function serialize(msg){
        var output=[];


        output=StreamSerializationContext.write_bytes(this.HEADER_MAGIC);
        console.log("HEADER_MAGIC");
        console.log(output);

        output=StreamSerializationContext.write_varuint(this.MAJOR_VERSION);
        console.log("MAJOR_VERSION");
        console.log(output);

        output=Op.serialize();
        console.log("Op serialize");
        console.log(output);

        if(Op.DIGEST_LENGTH!=msg.length) {
            console.log("Error msg length");
        }

        output=StreamSerializationContext.write_bytes(timestamp.msg);
        console.log("timestamp.msg");
        console.log(output);


    }
}

class Timestamp {
    public var msg="";
    public var attestations={};
    public var ops=[];


    function init(msg){
        this.msg=msg;
        this.attestations={}
        this.ops={};
    }

    public function serialize(){
         StreamSerializationContext.write_bytes(TAG);

        if(ops.length==0){
            StreamSerializationContext.write_bytes('\x00');
        }else {

            //last_op.serialize(ctx)
            //last_stamp.serialize(ctx)
        }
    }

    public function deserialize(resp_bytes,digest){
        this.msg=digest;
        this.attestations={};
        this.ops={};

        var i=0;
        var tag = resp_bytes[i];
        i++;
        while(tag=='\xff'){
            var current=resp_bytes[i]; i++;
            do_tag_or_attestation(current);
            tag = resp_bytes[i];
        }
        var current=resp_bytes[i]; i++;
        do_tag_or_attestation(current);
    }


    function do_tag_or_attestation(tag){
        if (tag == '\x00'){
            //attestation = TimeAttestation.deserialize(ctx)
            //self.attestations.add(attestation)
        }else {
            /*op = Op.deserialize_from_tag(ctx, tag)

            try:
            result = op(initial_msg)
            except MsgValueError as exp:
            raise opentimestamps.core.serialize.DeserializationError("Invalid timestamp; message invalid for op %r: %r" % (op, exp))

            stamp = Timestamp.deserialize(ctx, result, _recursion_limit=_recursion_limit-1)
            self.ops[op] = stamp*/

            /*var op=Op.deserialize_from_tag(tag);



        }
    }

}

*/

/*
class Op {

    public var TAG = 0;
    public var TAG_NAME = '';
    public var HASHLIB_NAME = "";
    public var DIGEST_LENGTH = 0;

    public var MAX_RESULT_LENGTH = 4096;

    public var MAX_MSG_LENGTH = 4096;
    public var SUBCLS_BY_TAG = {}
    public var list = [];

    public function init(){
        SUBCLS_BY_TAG [ OpSHA1.TAG ] = OpSHA1;
        SUBCLS_BY_TAG [ OpRIPEMD160.TAG ] = OpRIPEMD160;
        SUBCLS_BY_TAG [ OpSHA256.TAG ] = OpSHA256;
        SUBCLS_BY_TAG [ OpAppend.TAG ] = OpAppend;
        SUBCLS_BY_TAG [ OpPrepend.TAG ] = OpPrepend;
        SUBCLS_BY_TAG [ OpReverse.TAG ] = OpReverse;
        SUBCLS_BY_TAG [ OpHexlify.TAG ] = OpHexlify;
    }

    public function deserialize_from_tag(tag){
        var found=false;
        for (var i=0;i<Object.keys(SUBCLS_BY_TAG).length;i++){
            if( tag == Object.keys(SUBCLS_BY_TAG)[i].TAG ){
                found=true;
                return Object.keys(SUBCLS_BY_TAG)[i].deserialize_from_tag();
            }
        }
        if (found==false){
            console.log("Unknown operation tag");
        }

    }
/*
    public var cls = null;
    public _register_op(cls,subcls){
        cls.SUBCLS_BY_TAG[subcls.TAG] = subcls
         if cls != Op:
         cls.__base__._register_op(subcls)
         return subcls
        cls.SUBCLS_BY_TAG[subcls.TAG] = subcls
        if(cls!=Op){

        }
    }

}
class OpSHA1 extends CryptOp{
    public static var TAG = '\x02';
    public static  var TAG_NAME = 'sha1';
    public static  var HASHLIB_NAME = "sha1";
    public static  var DIGEST_LENGTH = 20;

}
class OpRIPEMD160 extends  CryptOp{
    public var TAG = '\x03';
    public var TAG_NAME = 'ripemd160';
    public var HASHLIB_NAME = "ripemd160";
    public var DIGEST_LENGTH = 20;
}
class OpSHA256 extends  CryptOp{
    public var TAG = '\x08';
    public var TAG_NAME = 'sha256';
    public var HASHLIB_NAME = "sha256";
    public var DIGEST_LENGTH = 32;
}
class OpReverse extends  UnaryOp{
    TAG = '\xf2'
    TAG_NAME = 'reverse';
    msg=[];
}
class OpHexlify extends  UnaryOp{
    TAG = '\xf3'
    TAG_NAME = 'hexlify'
}
class UnaryOp extends  Op{
    function deserialize_from_tag(tag){
        for (var i=0;i<Object.keys(SUBCLS_BY_TAG).length;i++){
            if( tag == Object.keys(SUBCLS_BY_TAG)[i].TAG ){
                return Object.keys(SUBCLS_BY_TAG)[i]();
            }
        }
    }
}

// BINARY OP
class BinaryOp extends  Op{

    function deserialize_from_tag(tag){
        for (var i=0;i<Object.keys(SUBCLS_BY_TAG).length;i++){
            if( tag == Object.keys(SUBCLS_BY_TAG)[i].TAG ){
                var arg=StreamDeserializationContext.read_varbytes(MAX_RESULT_LENGTH,1)
                Object.keys(SUBCLS_BY_TAG)[i].list.push(arg);
                return Object.keys(SUBCLS_BY_TAG)[i];
            }
        }
    }
}

class OpAppend extends  BinaryOp{
    TAG = '\xf0'
    TAG_NAME = 'append';

    function call(msg) {
        return msg + list[0];
    }
}
class OpPrepend extends  BinaryOp{
    TAG = '\xf1'
    TAG_NAME = 'prepend';
    msg=[];
}

class CryptOp extends UnaryOp {
    //_do_op_call
    //hash_fd
}
*/
/*
var StreamDeserializationContext = {

    fileName : "1.ots",
    fd : undefined,

    resp:"f010942eaef774f5cbe86d77615942cf330408f10458359f7af00862352f64a1890dd20083dfe30d2ef90c8e2c2b68747470733a2f2f626f622e6274632e63616c656e6461722e6f70656e74696d657374616d70732e6f7267",
    resp_bytes:[],
    counter:0,

    open: function(){
        StreamDeserializationContext.resp_bytes=hexToBytes(resp);
        StreamDeserializationContext.counter=0;
    },
    read: function(l){
        return resp_bytes.subarray(counter,l);
        counter+=l;
    },
    read_bool: function(){
        var b = this.read(1)[0]
        if (b == 0xff){
            return true;
        }else if (b == 0x00){
            return false
        }
    },
    read_varuint: function() {
        var value = 0;
        var shift = 0;
        while(true){
            var b=this.read(1)[0];
            value |= (b & 0b01111111) << shift;
            if (!(b & 0b10000000)){
                break;
            }
            shift += 7
        }
        return value
    },
    read_bytes : function(expected_length=undefined){
        if(expected_length==undefined){
            expected_length = this.read_varuint();
        }
        return this.read(expected_length);
    },
    read_varbytes : function(max_len, min_len=0){
        var l = this.read_varuint();
        if(l>max_len) {
            console.log("varbytes max length exceeded;");
            return;
        }else if(l<min_len){
            console.log("varbytes min length not met;");
            return;
        }
        return this.read(l);
    },
    assert_magic : function (expected_magic){
        actual_magic = this.read(expected_magic.length)
        if (expected_magic != actual_magic){
            return false;
        }
        return true;
    },
    assert_eof: function(){
        var excess=this.read(l);
        if(excess!=undefined)
            return true
        return false;

    }
}*/
/*
class StreamSerializationContext {


    public static function write_bool(value) {
        if (value == false)
            return 0x00;
        else
            return 0xff;
    }

    public static function write_varuint(value) {
        if (value == 0) {
            return [0x00];
        } else {
            var value_bytes = array();
            while (value != 0) {
                b = value & 0b01111111;
                if (value > 0b01111111)
                    b |= 0b10000000
                value_bytes.append(b);
                value >>= 7;
            }

            var output = new Uint8Array[value_bytes.count];
            for (i = 0; i < output.count; i++)
                output[i] = value_bytes[i];
            return output;
        }
    }

    public static function write_bytes(value) {
        return value;
    }

    public static function write_varbytes(value) {
        var output = [];
        output.concat(write_varuint(value.length));
        output.concat(write(value));
        return output;
    }

}*/