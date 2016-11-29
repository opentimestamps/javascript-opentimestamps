
var fs = require("fs");
var Utils=require("./Utils.js");

var fileName = "1.ots";
var fd = undefined;

var output=[];
var counter=0;


module.exports = {

    open: function () {
        //resp_bytes = Utils.hexToBytes(resp);
        counter = 0;
    },
    write_bool: function (value) {
        if (value == true) {
            output.add('\xff');
        } else {
            output.add('\x00');
        }
    },
    write_varuint: function (value) {
        if (value == 0)
            output.add('\x00')
        else {
            while (value != 0) {
                b = value & 0b01111111;
                if (value > 0b01111111)
                    b |= 0b10000000
                output.add(bytes([b]))
                if (value <= 0b01111111)
                    break
                value >>= 7
            }
        }
    },
    write_bytes: function (value) {
        output.add(value)
    },
    write_varbytes: function (value) {
        this.write_varuint(value.length)
        this.write(value)
    }

}