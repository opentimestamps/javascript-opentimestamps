

var fs = require("fs");
var Utils=require("./Utils.js");
/*
var fileName = "1.ots";
var fd = undefined;
*/

module.exports = {

    getOutput: function (){
        return this.resp_bytes;
    },
    getCounter: function(){
        return this.counter;
    },
    open: function (stream_bytes) {
        this.resp_bytes = stream_bytes;
        this.counter = 0;
    },
    read: function (l) {
        var output = this.resp_bytes.slice(this.counter, this.counter + l);
        this.counter += l;
        return output;
    },
    read_bool: function () {
        var b = this.read(1)[0]
        if (b == 0xff) {
            return true;
        } else if (b == 0x00) {
            return false
        }
    },
    read_varuint: function () {
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
    },
    read_bytes: function (expected_length = undefined) {
        if (expected_length == undefined) {
            expected_length = this.read_varuint();
        }
        return this.read(expected_length);
    },
    read_varbytes: function (max_len, min_len = 0) {
        var l = this.read_varuint();
        if (l > max_len) {
            console.log("varbytes max length exceeded;");
            return;
        } else if (l < min_len) {
            console.log("varbytes min length not met;");
            return;
        }
        return this.read(l);
    },
    assert_magic: function (expected_magic) {
        actual_magic = this.read(expected_magic.length)
        if (expected_magic != actual_magic) {
            return false;
        }
        return true;
    },
    assert_eof: function () {
        var excess = this.read(1);
        if (excess != undefined)
            return true
        return false;
    }
}

