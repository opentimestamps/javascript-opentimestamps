'use strict';

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


    static deserialize  (ctx,initial_msg){

        console.log("deserialize: ",Utils.bytesToHex(initial_msg))
        var self= new Timestamp(initial_msg);


        function do_tag_or_attestation (tag,initial_msg) {
            console.log("do_tag_or_attestation: ", tag);
            if (tag == '\x00') {
                var attestation = Notary.TimeAttestation.deserialize(ctx);
                self.attestations.push(attestation);
                console.log("attestation ",attestation);
            } else {

                var op = Ops.Op.deserialize_from_tag(ctx,tag);

                var result = op.call(initial_msg);
                console.log("result: ",Utils.bytesToHex(result));

                var stamp= Timestamp.deserialize(ctx,result)
                self.ops.set(op, stamp);

                console.log("OK");

            }
        };

        var tag = ctx.read_bytes(1);
        var tag = String.fromCharCode(tag[0])[0];

        while(tag=='\xff'){
            var current= ctx.read_bytes(1);
            current = String.fromCharCode(current[0])[0];
            do_tag_or_attestation(current,initial_msg);
            tag = ctx.read_bytes(1);
            tag = String.fromCharCode(tag[0])[0];
        }
        do_tag_or_attestation(tag,initial_msg);


        return self;
    };

    serialize(ctx){
        console.log("serialize");

        //sort
        var sorted_attestations=this.attestations;
        if(sorted_attestations.length>1) {
            for (var i = 0; i < sorted_attestations.length; i++) {
                ctx.write_bytes(['\xff', '\x00']);
                sorted_attestations[i].serialize(ctx);
            }
        }
        if (this.ops.size == 0) {
            ctx.write_bytes('\x00')
            sorted_attestations[ sorted_attestations.length-1 ].serialize(ctx)
        }else if (this.ops.size > 0) {
            if (sorted_attestations.length > 0) {
                ctx.write_bytes(['\xff', '\x00']);
                sorted_attestations[ sorted_attestations.length-1 ].serialize(ctx)
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

            last_op.serialize(ctx);
            last_stamp.serialize(ctx);

        }


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

    str_tree(indent=0){
        var output="";
        if(this.attestations.length>0){
            for (var attestation of this.attestations) {
                for (i=0;i<indent;i++){
                    output+="\t";
                }
                output += "verify " + attestation.toString() + "\n";
            }
        }

        if (this.ops.size>1){
            for (var [op, timestamp] of this.ops) {
                for (i = 0; i < indent; i++) {
                    output += "\t";
                }
                output += " -> ";
                output += op.toString() + "\n";
                output += timestamp.str_tree(indent + 1) + "\n";
            }
        } else if (this.ops.size>0){
            for (var i = 0; i < indent; i++) {
                output += "\t";
            }
            for (var [op, timestamp] of this.ops) {
                for (i = 0; i < indent; i++) {
                    output += "\t";
                }
                output += op.toString() + "\n";

                output += " ( "+Utils.bytesToHex(this.msg)+" ) ";
                output += "\n";
                output += timestamp.str_tree(indent) + "\n";
            }
        }
        return output;


    }

    static indention(pos){
        var output="";
        for (var i=0;i<pos;i++){
            output+="\t";
        }
        return output;
    }

    static str_tree_extended(timestamp,indent=0){
        var output="";
        var x="";
        if(timestamp.attestations.length>0){
            for (var attestation of timestamp.attestations) {
                if(attestation instanceof Notary.BitcoinBlockHeaderAttestation)
                    x=" BLOCK MERKLE ROOT";

                output += Timestamp.indention(indent);
                output += "verify " + attestation.toString();
                output += " ("+Utils.bytesToHex(timestamp.msg)+") ";
                //output += " ["+Utils.bytesToHex(timestamp.msg)+"] ";
                output += "\n";
            }
        }

        if (timestamp.ops.size>1){
            for (var [op, t] of timestamp.ops) {
                output += Timestamp.indention(indent);
                output += " -> ";
                output += op.toString();
                output += " ("+Utils.bytesToHex(timestamp.msg)+") ";
                output += "\n";
                output += Timestamp.str_tree_extended(ts,indent+1);
            }
        } else if (timestamp.ops.size>0){

            output += Timestamp.indention(indent);
            for (var [op, ts] of timestamp.ops) {
                output += Timestamp.indention(indent);
                output += op.toString() ;

                output += " ( "+Utils.bytesToHex(timestamp.msg)+" ) ";
                output += "\n";
                output += Timestamp.str_tree_extended(ts,indent);
            }
        }
        return output;


    }
}

module.exports = Timestamp;

