const test = require('tape')
const Context = require('../src/context.js')
const Ops = require('../src/ops.js')
const Utils = require('../src/utils.js')
const DetachedTimestampFile = require('../src/detached-timestamp-file.js')

function sha256 (buffer) {
  const ctx = new Context.StreamDeserialization(buffer)
  const detachedTimestampFile = DetachedTimestampFile.fromBytes(new Ops.OpSHA256(), ctx)
  return detachedTimestampFile.fileDigest()
}

test('Crypto.1M()', assert => {
  const hash = '30e14955ebf1352266dc2ff8067e68104607e750abb9d3b36582b8af909fcb58'
  const size = 1 * 1024 * 1024
  const arrayBuffer = new Uint8Array(size)

  try {
    const fileDigest = sha256(arrayBuffer)
    assert.equals(hash, Utils.bytesToHex(fileDigest), 'checking hashes')
    assert.end()
  } catch (err) {
    assert.fail('err=' + err)
  }
})

test('Crypto.10M()', assert => {
  const hash = 'e5b844cc57f57094ea4585e235f36c78c1cd222262bb89d53c94dcb4d6b3e55d'
  const size = 10 * 1024 * 1024
  const arrayBuffer = new Uint8Array(size)

  try {
    const fileDigest = sha256(arrayBuffer)
    assert.equals(hash, Utils.bytesToHex(fileDigest), 'checking hashes')
    assert.end()
  } catch (err) {
    assert.fail('err=' + err)
  }
})

test('Crypto.100M()', assert => {
  const hash = '20492a4d0d84f8beb1767f6616229f85d44c2827b64bdbfb260ee12fa1109e0e'
  const size = 100 * 1024 * 1024
  const arrayBuffer = new Uint8Array(size)

  try {
    const fileDigest = sha256(arrayBuffer)
    assert.equals(hash, Utils.bytesToHex(fileDigest), 'checking hashes')
    assert.end()
  } catch (err) {
    assert.fail('err=' + err)
  }
})
/*
test('Crypto.300M()', assert => {
  const hash = '17a88af83717f68b8bd97873ffcf022c8aed703416fe9b08e0fa9e3287692bf0';
  const size = 300 * 1024 * 1024;
  const arrayBuffer = new Uint8Array(size);

  try {
    const fileDigest = sha256(arrayBuffer);
    assert.equals(hash, Utils.bytesToHex(fileDigest), 'checking hashes');
    assert.end();
  } catch (err) {
    assert.fail('err=' + err);
  }
});

test('Crypto.600M()', assert => {
  const hash = '987523e7780392e283b404990c4e84e580bc75c451138b0c86c4f81c296eeebe';
  const size = 600 * 1024 * 1024;
  const arrayBuffer = new Uint8Array(size);

  try {
    const fileDigest = sha256(arrayBuffer);
    assert.equals(hash, Utils.bytesToHex(fileDigest), 'checking hashes');
    assert.end();
  } catch (err) {
    assert.fail('err=' + err);
  }
});
*/
