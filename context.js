'use strict';

/*
var fileName = "1.ots";
var fd = undefined;
*/

class StreamDeserializationContext {

  getOutput() {
    return this.respBytes;
  }

  getCounter() {
    return this.counter;
  }

  open(streamBytes) {
    this.respBytes = streamBytes;
    this.counter = 0;
  }
  read(l) {
    if (l > this.respBytes.length) {
      l = this.respBytes.length;
    }
    const output = this.respBytes.slice(this.counter, this.counter + l);
    this.counter += l;
    return output;
  }
  readBool() {
    const b = this.read(1)[0];
    if (b === 0xff) {
      return true;
    } else if (b === 0x00) {
      return false;
    }
  }
  readVaruint() {
    let value = 0;
    let shift = 0;
    while (true) {
      const b = this.read(1)[0];
      value |= (b & 0b01111111) << shift;
      if (!(b & 0b10000000)) {
        break;
      }
      shift += 7;
    }
    return value;
  }
  readBytes(expectedLength) {
    if (expectedLength === undefined) {
      expectedLength = this.read_varuint();
    }
    return this.read(expectedLength);
  }
  readVarbytes(maxLen, minLen = 0) {
    const l = this.readVaruint();
    if (l > maxLen) {
      console.log('varbytes max length exceeded;');
      return;
    } else if (l < minLen) {
      console.log('varbytes min length not met;');
      return;
    }
    return this.read(l);
  }
  assertMagic(expectedMagic) {
    const actualMagic = this.read(expectedMagic.length);
    if (expectedMagic !== actualMagic) {
      return false;
    }
    return true;
  }
  assertEof() {
    const excess = this.read(1);
    if (excess !== undefined) {
      return true;
    }
    return false;
  }
}

class StreamSerializationContext {

  getOutput() {
    return this.output;
  }

  getCounter() {
    return this.counter;
  }

  open() {
        // respBytes = Utils.hexToBytes(resp);
    this.output = [];
    this.counter = 0;
  }
  writeBool(value) {
    if (value === true) {
      this.output.push('\xff');
    } else {
      this.output.push('\x00');
    }
  }
  writeVaruint(value) {
    if (value === 0) {
      this.output.push('\x00');
    } else {
      while (value !== 0) {
        let b = value & 0b01111111;
        if (value > 0b01111111) {
          b |= 0b10000000;
        }
        this.output.push([b]);
        if (value <= 0b01111111) {
          break;
        }
        value >>= 7;
      }
    }
  }
  writeByte(value) {
    this.output.push(value);
  }

  writeBytes(value) {
    for (const x in value) {
      if ({}.hasOwnProperty.call(value, x)) {
        this.writeByte(x);
      }
    }
  }
  writeVarbytes(value) {
    this.writeVaruint(value.length);
    this.writeBytes(value);
  }
  toString() {
    console.log('output: ' + this.output);
  }

}

module.exports = {
  StreamDeserialization: StreamDeserializationContext,
  StreamSerialization: StreamSerializationContext
};
