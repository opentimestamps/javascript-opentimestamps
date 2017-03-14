'use strict';

/**
 * Context input/output buffer module.
 * @module Context
 * @author EternityWall
 * @license LPGL3
 */

/** Class representing Stream Deserialization Context for input buffer. */
class StreamDeserializationContext {

  constructor(stream) {
    this.buffer = [];
    if (stream instanceof Buffer) {
      this.buffer = stream;
    } else if (stream instanceof ArrayBuffer) {
      this.buffer = stream;
    } else if (stream instanceof Uint8Array) {
      this.buffer = stream;
    } else if (typeof (stream) === 'string') {
      this.buffer = Buffer.from(stream, 'binary');
    } else if (stream instanceof String) {
      this.buffer = Buffer.from(stream, 'binary');
    } else if (stream instanceof Array) {
      // Avoid using extended native objects
      // const uint8Array = Uint8Array.from(stream);
      this.buffer = new Buffer(stream);
    }
    this.counter = 0;
  }

  getOutput() {
    return this.buffer;
  }

  getCounter() {
    return this.counter;
  }

  readBuffer(l) {
    if (this.counter === this.buffer.length) {
      return undefined;
    }
    if (l > this.buffer.length) {
      l = this.buffer.length;
    }
    // const uint8Array = new Uint8Array(this.buffer,this.counter,l);
    const uint8Array = this.buffer.slice(this.counter, this.counter + l);
    this.counter += l;
    return uint8Array;
  }

  read(l) {
    if (this.counter === this.buffer.length) {
      return undefined;
    }
    if (l > this.buffer.length) {
      l = this.buffer.length;
    }
    // const uint8Array = new Uint8Array(this.buffer,this.counter,l);
    const uint8Array = this.buffer.slice(this.counter, this.counter + l);
    this.counter += l;
    return Array.from(uint8Array);
    /* this.buffer.copyTo(output, 0, this.counter, l + this.counter);
    this.counter += l;
    return Utils.arrayToBytes(Object.prototype.hasOwnProperty.call(output, 'view') ? output.view : output.buffer);  // different behaviours of buffer object between node and browsers
    */
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
      expectedLength = this.readVarbytes();
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
    this.buffer = new Uint8Array(1024 * 4);
    this.length = 0;
  }
  getOutput() {
    const output = this.buffer.slice(0, this.length);
    return output;
  }
  getLenght() {
    return this.length;
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
    if (this.counter >= this.length) {
      const newLenght = this.length * 2;
      const swapBuffer = new Uint8Array(newLenght);
      swapBuffer.set(this.buffer, 0);
      this.buffer = swapBuffer;
      this.length = newLenght;
    }

    if (isNaN(value)) {
      this.buffer[this.length] = value.codePointAt();
    } else {
      this.buffer[this.length] = value;
    }
    this.length++;
  }

  writeBytes(value) {
    value.forEach(x => {
      this.writeByte(x);
    });
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
