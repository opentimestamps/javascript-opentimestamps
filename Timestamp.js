'use strict';

var StreamDeserializationContext=require("./StreamDeserializationContext.js");
var StreamSerializationContext=require("./StreamSerializationContext.js");
var Utils=require("./Utils.js");
var Notary=require("./Notary.js");
var Ops=require("./Ops.js");;
var Utils=require("./Utils.js");

var msg = "";
var attestations ={};
var ops= [];



class Timestamp {

    constructor(msg) {
        this.msg=msg;
        this.attestations=[];
        this.ops= new Map();
    }


    static deserialize  (initial_msg){

        console.log("deserialize: ",Utils.bytesToHex(initial_msg))
        var self= new Timestamp(initial_msg);


        function do_tag_or_attestation (tag,initial_msg) {
            console.log("do_tag_or_attestation: ", Utils.bytesToHex([tag.charCodeAt()]));
            if (tag == '\x00') {
                var attestation = Notary.TimeAttestation.deserialize();
                self.attestations.push(attestation);
                console.log("attestation ",attestation);
            } else {

                var op = Ops.Op.deserialize_from_tag(tag);

                var result = op.call(initial_msg);
                console.log("result: ",Utils.bytesToHex(result));

                var stamp= Timestamp.deserialize(result)
                self.ops.set(op, stamp);

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

    serialize(){
        console.log("serialize");

        //sort
        var sorted_attestations=this.attestations;
        if(sorted_attestations.length>1) {
            for (var i = 0; i < sorted_attestations.length; i++) {
                StreamSerializationContext.write_bytes(['\xff', '\x00']);
                sorted_attestations[i].serialize();
            }
        }
        if (this.ops.size == 0) {
            StreamSerializationContext.write_bytes('\x00')
            sorted_attestations[ sorted_attestations.length-1 ].serialize()
        }else if (this.ops.size > 0) {
            if (sorted_attestations.length > 0) {
                StreamSerializationContext.write_bytes(['\xff', '\x00']);
                sorted_attestations[ sorted_attestations.length-1 ].serialize()
            }
            //var sorted_ops = [];//sorted(self.ops.items(), key=lambda item: item[0])


            var last_op;
            var last_stamp;

            for (var [key, value] of this.ops) {
                last_op=key;
                last_stamp=value;
            }

            console.log("last_op: ")
            console.log(last_op.toString());
            console.log(last_stamp.toString());

            last_op.serialize();
            last_stamp.serialize();

        }

        StreamSerializationContext.toString();

    }

    toString(){
        var output="";
        output+="*** Timestamp ***\n";
        output+="msg: "+Utils.bytesToHex(this.msg)+"\n";
        output+=this.attestations.length+" attestations: \n";
        var i=0;
        for (var at of this.attestations) {
            output+="["+i+"] "+Utils.bytesToHex(at.toString());
            i++;
        }

        var i=0;
        output+=this.ops.size+" ops: \n";
        for (var [op, stamp] of this.ops) {
            output+="["+i+"] op: "+op.toString()+"\n";
            output+="["+i+"] stamp: "+stamp.toString()+"\n";
            i++;
        }
        output+="\n";
        return output;
    }
}

module.exports = Timestamp;

