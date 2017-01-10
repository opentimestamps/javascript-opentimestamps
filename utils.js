'use strict';


const crypto = require('crypto');
const fs = require('fs');

// Convert a hex string to a byte array
exports.hexToBytes = function (hex) {
  const bytes = [];
  for (let c = 0; c < hex.length; c += 2) {
    bytes.push(parseInt(hex.substr(c, 2), 16));
  }
  return bytes;
};

// Convert a byte array to a hex string
exports.bytesToHex = function (bytes) {
  const hex = [];
  for (let i = 0; i < bytes.length; i++) {
    hex.push((bytes[i] >>> 4).toString(16));
    hex.push((bytes[i] & 0xF).toString(16));
  }
  return hex.join('');
};

exports.charsToHex = function (bytes) {
  const hex = [];
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i].charCodeAt();
    hex.push((b >>> 4).toString(16));
    hex.push((b & 0xF).toString(16));
  }
  return hex.join('');
};

exports.charToByte = function (char) {
  return char.charCodeAt(0);
};

exports.charsToBytes = function (chars) {
  const bytes = [];
  for (let i = 0; i < chars.length; i++) {
    const b = chars.charCodeAt(i);
    bytes.push(b);
  }
  return bytes;
};

exports.arrayToBytes = function (buffer) {
  const bytes = [];
  for (let c = 0; c < buffer.length; c++) {
    bytes.push(parseInt(buffer[c], 10));
  }
  return bytes;
};

exports.arrEq = function (arr1, arr2) {
  let i;
  for (i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }
  return i === arr2.length;
};

exports.randBytes = function (n) {
  return crypto.randomBytes(n);
};

exports.randString = function (n) {
  if (n <= 0) {
    return '';
  }
  let rs = '';
  try {
    rs = crypto.randomBytes(Math.ceil(n / 2)).toString('hex').slice(0, n);
        /* note: could do this non-blocking, but still might fail */
  } catch (err) {
        /* known exception cause: depletion of entropy info for randomBytes */
    console.error('Exception generating random string: ' + err);
        /* weaker random fallback */
    rs = '';
    const r = n % 8;
    const q = (n - r) / 8;
    let i;

    for (i = 0; i < q; i++) {
      rs += Math.random().toString(16).slice(2);
    }
    if (r > 0) {
      rs += Math.random().toString(16).slice(2, i);
    }
  }
  return rs;
};

exports.readFilePromise = function (filename, mode) {
  return new Promise((resolve, reject) => {
    fs.readFile(filename, mode, (err, buffer) => {
      if (err) {
        reject(err);
      } else {
        resolve(buffer);
      }
    });
  });
};

