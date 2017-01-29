'use strict';

/**
 * Context input/output buffer module.
 * @module Context
 * @author EternityWall
 * @license LPGL3
 */

const ByteBuffer = require('bytebuffer');
const Utils = require('./utils.js');

/** Class representing Stream Deserialization Context for input buffer. */
class StreamDeserializationContext {

  constructor(streamBytes) {
    this.buffer = ByteBuffer.wrap(streamBytes);
    this.counter = 0;
  }

  getOutput() {
    return this.buffer.buffer;
  }

  getCounter() {
    return this.buffer.capacity();
  }

  read(l) {
    if (this.counter === this.buffer.capacity()) {
      return undefined;
    }
    if (l > this.buffer.capacity()) {
      l = this.buffer.capacity();
    }
    const output = new ByteBuffer(l);
    this.buffer.copyTo(output, 0, this.counter, l + this.counter);
    this.counter += l;
    return Utils.arrayToBytes(output.buffer);
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
    let b;
    do {
      b = this.read(1)[0];
      value |= (b & 0b01111111) << shift;
      shift += 7;
    } while (b & 0b10000000);
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
      console.error('varbytes max length exceeded;');
      return;
    } else if (l < minLen) {
      console.error('varbytes min length not met;');
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
  toString() {
    return this.buffer.toHex(0);
  }
}

/** Class representing Stream Serialization Context for output buffer. */
class StreamSerializationContext {

  constructor() {
    this.buffer = new ByteBuffer(1024*4);
    this.buffer.clear();
  }
  getOutput() {
    const output = this.buffer.buffer.subarray(0, this.buffer.offset);
    return output;
  }

  getCounter() {
    return this.buffer.capacity();
  }

  writeBool(value) {
    if (value === true) {
      this.writeByte(0xff);
    } else {
      this.writeByte(0x00);
    }
  }

  writeVaruint(value) {
    if (value === 0) {
      this.writeByte(0);
    } else {
      while (value !== 0) {
        let b = value & 0b01111111;
        if (value > 0b01111111) {
          b |= 0b10000000;
        }
        this.writeByte(b);
        if (value <= 0b01111111) {
          break;
        }
        value >>= 7;
      }
    }
  }
  writeByte(value) {
    if (this.buffer.offset >= this.buffer.limit - 1) {
      const newLenght = this.buffer.capacity() * 2;
      const swapBuffer = new ByteBuffer(newLenght);
      this.buffer.copyTo(swapBuffer, 0);
      this.buffer = swapBuffer;
    }

    if (isNaN(value)) {
      this.buffer.writeByte(value.codePointAt());
    } else {
      this.buffer.writeByte(value);
    }
  }

  writeBytes(value) {
    for (const x of value) {
      this.writeByte(x);
    }
  }

  writeVarbytes(value) {
    this.writeVaruint(value.length);
    this.writeBytes(value);
  }
  toString() {
    return this.buffer.toHex(0);
  }

}

module.exports = {
  StreamDeserialization: StreamDeserializationContext,
  StreamSerialization: StreamSerializationContext
};
