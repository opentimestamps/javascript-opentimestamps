
var fs = require("fs");
var Utils=require("./Utils.js");

var fileName = "1.ots";
var fd = undefined;

//var output=[];
//var counter=0;


module.exports = {


    open: function () {
        //resp_bytes = Utils.hexToBytes(resp);
        this.output=[];
        this.counter = 0;
    },
    write_bool: function (value) {
        if (value == true) {
            this.output.push('\xff');
        } else {
            this.output.push('\x00');
        }
    },
    write_varuint: function (value) {
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
    },
    write_byte: function (value) {
        this.output.push(value)
    },

    write_bytes: function (value) {
        for (var x in value){
            this.write_byte(x);
        }
    },
    write_varbytes: function (value) {
        this.write_varuint(value.length)
        this.write_bytes(value)
    },
    toString: function(){
        console.log("output: "+this.output);
    }

}