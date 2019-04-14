'use strict'

/**
 * Utils module.
 * @module Utils
 * @author EternityWall
 * @license LPGL3
 */

const crypto = require('crypto')
const fs = require('fs')
const properties = require('properties')

/**
 * Convert a hex string to a byte array
 * @param hex
 * @returns {Array}
 */
exports.hexToBytes = function (hex) {
  const bytes = []
  for (let c = 0; c < hex.length; c += 2) {
    bytes.push(parseInt(hex.substr(c, 2), 16))
  }
  return bytes
}

/**
 * Convert a byte array to a hex string
 * @param bytes
 * @returns {string}
 */
exports.bytesToHex = function (bytes) {
  const hex = []
  for (let i = 0; i < bytes.length; i++) {
    hex.push((bytes[i] >>> 4).toString(16))
    hex.push((bytes[i] & 0xF).toString(16))
  }
  return hex.join('')
}

/**
 * Convert chars to hexadecimal representation
 * @param bytes
 * @returns {string}
 */
exports.charsToHex = function (bytes) {
  const hex = []
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i].charCodeAt()
    hex.push((b >>> 4).toString(16))
    hex.push((b & 0xF).toString(16))
  }
  return hex.join('')
}

/**
 * Convert char to byte representation
 * @param byte
 * @returns {string}
 */
exports.charToByte = function (char) {
  return char.charCodeAt(0)
}

/**
 * Convert chars to bytes representation
 * @param bytes
 * @returns {Array}
 */
exports.charsToBytes = function (chars) {
  const bytes = []
  for (let i = 0; i < chars.length; i++) {
    const b = chars.charCodeAt(i)
    bytes.push(b)
  }
  return bytes
}

exports.bytesToChars = function (buffer) {
  let charts = ''
  for (let b = 0; b < buffer.length; b++) {
    charts += String.fromCharCode(b)[0]
  }
  return charts
}

exports.toBytes = function (str) {
  const arr = []
  for (let i = 0; i < str.length; i++) {
    arr.push(str.charCodeAt(i))
  }
  return arr
}

exports.arrayToBytes = function (buffer) {
  const bytes = []
  for (let c = 0; c < buffer.length; c++) {
    bytes.push(parseInt(buffer[c], 10))
  }
  return bytes
}

exports.arrCompare = function (left, right) {
  for (let i = 0, j = 0; i < left.length && j < right.length; i++, j++) {
    const a = (left[i] & 0xff)
    const b = (right[j] & 0xff)
    if (a !== b) {
      return a - b
    }
  }
  return left.length - right.length
}

exports.arrEq = function (arr1, arr2) {
  let i
  for (i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false
    }
  }
  return i === arr2.length
}

exports.randBytes = function (n) {
  return crypto.randomBytes(n)
}

exports.randString = function (n) {
  if (n <= 0) {
    return ''
  }
  let rs = ''
  try {
    rs = crypto.randomBytes(Math.ceil(n / 2)).toString('hex').slice(0, n)
    /* note: could do this non-blocking, but still might fail */
  } catch (err) {
    /* known exception cause: depletion of entropy info for randomBytes */
    console.error('Exception generating random string: ' + err)
    /* weaker random fallback */
    rs = ''
    const r = n % 8
    const q = (n - r) / 8
    let i

    for (i = 0; i < q; i++) {
      rs += Math.random().toString(16).slice(2)
    }
    if (r > 0) {
      rs += Math.random().toString(16).slice(2, i)
    }
  }
  return rs
}

exports.softFail = function (promise) {
  return new Promise(resolve => {
    promise
      .then(resolve)
      .catch(resolve)
  })
}

/**
 * fs.readfile promisified
 * @param filename
 * @param mode
 */
exports.readFilePromise = function (filename, mode) {
  return new Promise((resolve, reject) => {
    fs.readFile(filename, mode, (err, buffer) => {
      if (err) {
        reject(err)
      } else {
        resolve(buffer)
      }
    })
  })
}

exports.readSignatureFile = function (file) {
  return new Promise((resolve, reject) => {
    properties.parse(file, { path: true, variables: false }, (error, obj) => {
      if (error) {
        return reject(error)
      }
      if (obj === undefined || obj.length === 0) {
        return reject(new Error('File empty'))
      }
      const map = new Map()
      Object.entries(obj).forEach(item => {
        const calendar = 'https://' + item[0]
        const wif = item[1]
        map.set(calendar, wif)
      })
      return resolve(map)
    })
  })
}
