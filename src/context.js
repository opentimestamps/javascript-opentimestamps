'use strict'

/**
 * Context input/output buffer module.
 * @module Context
 * @author EternityWall
 * @license LPGL3
 */
require('./extend-error.js')
const Utils = require('./utils.js')

/* Errors */
const ValueError = Error.extend('ValueError')
const TypeError = Error.extend('TypeError')
// Base class for all errors encountered during deserialization
const DeserializationError = Error.extend('DeserializationError')
// Raise this when the file format magic number is incorrect.
const BadMagicError = DeserializationError.extend('BadMagicError')
//  Raise this a major version is unsupported
const UnsupportedMajorVersion = Error.extend('UnsupportedMajorVersion')
// Truncated data encountered while deserializing
const TruncationError = DeserializationError.extend('TruncationError')
// Trailing garbage found after deserialization finished
// Raised when deserialization otherwise succeeds without errors, but excess
// data is present after the data we expected to get.
const TrailingGarbageError = DeserializationError.extend('TrailingGarbageError')
// Data is too deeply nested to be deserialized
// Raised when deserializing recursively defined data structures that exceed
// the recursion limit for that particular data structure.
const RecursionLimitError = DeserializationError.extend('RecursionLimitError')
// Wrong type for specified serializer
const SerializerTypeError = TypeError.extend('SerializerTypeError')
// Inappropriate value to be serialized (of correct type)
const SerializerValueError = ValueError.extend('SerializerValueError')

/** Class representing Stream Deserialization Context for input buffer. */
class StreamDeserializationContext {
  constructor (stream) {
    this.buffer = []
    if (stream instanceof Buffer) {
      this.buffer = stream
    } else if (stream instanceof ArrayBuffer) {
      this.buffer = stream
    } else if (stream instanceof Uint8Array) {
      this.buffer = stream
    } else if (typeof (stream) === 'string') {
      this.buffer = Buffer.from(stream, 'binary')
    } else if (stream instanceof String) {
      this.buffer = Buffer.from(stream, 'binary')
    } else if (stream instanceof Array) {
      // Avoid using extended native objects
      // const uint8Array = Uint8Array.from(stream);
      this.buffer = Buffer.from(stream)
    }
    this.counter = 0
  }

  getOutput () {
    return this.buffer
  }

  getCounter () {
    return this.counter
  }

  readBuffer (l) {
    if (this.counter >= this.buffer.length) {
      return undefined
    }
    if (l > this.buffer.length) {
      l = this.buffer.length
    }
    const uint8Array = this.buffer.slice(this.counter, this.counter + l)
    this.counter += l
    return uint8Array
  }

  read (l) {
    if (l > this.buffer.length) {
      l = this.buffer.length
    }
    const uint8Array = this.buffer.slice(this.counter, this.counter + l)
    this.counter += l
    return Array.from(uint8Array)
  }

  readBool () {
    const b = this.read(1)[0]
    if (b === 0xff) {
      return true
    } else if (b === 0x00) {
      return false
    }
    throw new DeserializationError('read_bool() expected 0xff or 0x00; got +' + b)
  }

  readVaruint () {
    let value = 0
    let shift = 0
    let b
    do {
      b = this.read(1)[0]
      value |= (b & 0b01111111) << shift
      shift += 7
    } while (b & 0b10000000)
    return value
  }

  readBytes (expectedLength) {
    if (expectedLength === undefined) {
      expectedLength = this.readVarbytes()
    }
    return this.read(expectedLength)
  }

  readVarbytes (maxLen, minLen = 0) {
    const l = this.readVaruint()
    if (l > maxLen) {
      throw new DeserializationError('varbytes max length exceeded; ' + l + ' > ' + maxLen)
    } else if (l < minLen) {
      throw new DeserializationError('varbytes min length not met; ' + l + ' < ' + maxLen)
    }
    return this.read(l)
  }

  assertMagic (expectedMagic) {
    const actualMagic = this.read(expectedMagic.length)
    if (!Utils.arrEq(expectedMagic, actualMagic)) {
      throw new BadMagicError(expectedMagic, actualMagic)
    }
  }

  assertEof () {
    const excess = this.buffer[this.counter]
    if (excess !== undefined) {
      throw new TrailingGarbageError('Trailing garbage found after end of deserialized data')
    }
  }

  toString () {
    return this.buffer.toHex(0)
  }
}

/** Class representing Stream Serialization Context for output buffer. */
class StreamSerializationContext {
  constructor () {
    this.buffer = new Uint8Array(1024 * 4)
    this.length = 0
  }

  getOutput () {
    const output = this.buffer.slice(0, this.length)
    return output
  }

  getLenght () {
    return this.length
  }

  writeBool (value) {
    if (value === true) {
      this.writeByte(0xff)
    } else if (value === false) {
      this.writeByte(0x00)
    } else {
      throw new TypeError('Expected bool; got ' + typeof (value))
    }
  }

  writeVaruint (value) {
    if (value === 0) {
      this.writeByte(0)
    } else {
      while (value !== 0) {
        let b = value & 0b01111111
        if (value > 0b01111111) {
          b |= 0b10000000
        }
        this.writeByte(b)
        if (value <= 0b01111111) {
          break
        }
        value >>= 7
      }
    }
  }

  writeByte (value) {
    if (this.length >= this.buffer.length) {
      const newLenght = this.length * 2
      const swapBuffer = new Uint8Array(newLenght)
      swapBuffer.set(this.buffer, 0)
      this.buffer = swapBuffer
    }

    if (isNaN(value)) {
      this.buffer[this.length] = value.codePointAt()
    } else {
      this.buffer[this.length] = value
    }
    this.length++
  }

  writeBytes (value) {
    value.forEach(x => {
      this.writeByte(x)
    })
  }

  writeVarbytes (value) {
    this.writeVaruint(value.length)
    this.writeBytes(value)
  }

  toString () {
    return this.buffer.toHex(0)
  }
}

module.exports = {
  StreamDeserialization: StreamDeserializationContext,
  StreamSerialization: StreamSerializationContext,
  DeserializationError,
  BadMagicError,
  UnsupportedMajorVersion,
  TruncationError,
  TrailingGarbageError,
  RecursionLimitError,
  SerializerTypeError,
  SerializerValueError,
  ValueError,
  TypeError
}
