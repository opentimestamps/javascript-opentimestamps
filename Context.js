'use strict'

var fs = require("fs");
var Utils=require("./Utils.js");
/*
var fileName = "1.ots";
var fd = undefined;
*/


class StreamDeserializationContext {

     getOutput(){
        return this.resp_bytes;
    }

     getCounter(){
        return this.counter;
    }

     open(stream_bytes) {
        this.resp_bytes = stream_bytes;
        this.counter = 0;
    }
     read(l) {
         if(l>this.resp_bytes.length){
             l=this.resp_bytes.length;
         }
        var output = this.resp_bytes.slice(this.counter, this.counter + l);
        this.counter += l;
        return output;
    }
     read_bool() {
        var b = this.read(1)[0]
        if (b == 0xff) {
            return true;
        } else if (b == 0x00) {
            return false
        }
    }
     read_varuint() {
        var value = 0;
        var shift = 0;
        while (true) {
            var b = this.read(1)[0];
            value |= (b & 0b01111111) << shift;
            if (!(b & 0b10000000)) {
                break;
            }
            shift += 7
        }
        return value
    }
     read_bytes() {
        return this.read_bytes(undefined);
    }
    read_bytes(expected_length) {
        if (expected_length == undefined) {
            expected_length = this.read_varuint();
        }
        return this.read(expected_length);
    }
    read_varbytes(max_len) {
        return this.read_varbytes(max_len, 0);
    }
     read_varbytes(max_len, min_len = 0) {
        var l = this.read_varuint();
        if (l > max_len) {
            console.log("varbytes max length exceeded;");
            return;
        } else if (l < min_len) {
            console.log("varbytes min length not met;");
            return;
        }
        return this.read(l);
    }
     assert_magic(expected_magic) {
        var actual_magic = this.read(expected_magic.length)
        if (expected_magic != actual_magic) {
            return false;
        }
        return true;
    }
     assert_eof() {
        var excess = this.read(1);
        if (excess != undefined)
            return true
        return false;
    }
}



class StreamSerializationContext {

    getOutput(){
        return this.output;
    }

    getCounter(){
        return this.counter;
    }

    open () {
        //resp_bytes = Utils.hexToBytes(resp);
        this.output=[];
        this.counter = 0;
    }
    write_bool (value) {
        if (value == true) {
            this.output.push('\xff');
        } else {
            this.output.push('\x00');
        }
    }
    write_varuint (value) {
        if (value == 0)
            this.output.push('\x00')
        else {
            while (value != 0) {
                var b = value & 0b01111111;
                if (value > 0b01111111)
                    b |= 0b10000000
                this.output.push([b]);
                if (value <= 0b01111111)
                    break
                value >>= 7
            }
        }
    }
    write_byte (value) {
        this.output.push(value)
    }

    write_bytes (value) {
        for (var x in value){
            this.write_byte(x);
        }
    }
    write_varbytes (value) {
        this.write_varuint(value.length)
        this.write_bytes(value)
    }
    toString(){
        console.log("output: "+this.output);
    }

}

module.exports = {
    StreamDeserialization : StreamDeserializationContext,
    StreamSerialization : StreamSerializationContext
}
