

var fs = require("fs");
var Utils=require("./Utils.js");

var fileName = "1.ots";
var fd = undefined;

var resp="f010f393dbe2ddb8353c1c20026d9afd551708f104583574c8f008260721746284f7c60083dfe30d2ef90c8e2e2d68747470733a2f2f616c6963652e6274632e63616c656e6461722e6f70656e74696d657374616d70732e6f7267";
var resp_bytes=[];
var counter=0;


module.exports = {

    open: function () {
        resp_bytes = Utils.hexToBytes(resp);
        counter = 0;
    },
    read: function (l) {
        var output = resp_bytes.slice(counter, counter + l);
        counter += l;
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
        var excess = this.read(l);
        if (excess != undefined)
            return true
        return false;
    }
}

