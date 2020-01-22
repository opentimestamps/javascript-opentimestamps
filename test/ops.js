const test = require('tape')
const Ops = require('../src/ops.js')
const Utils = require('../src/utils.js')

test('Ops.Sha1()', assert => {
  const result = new Ops.OpSHA1().call(Utils.hexToBytes('0a'))
  assert.equals('adc83b19e793491b1c6ea0fd8b46cd9f32e592fc', Utils.bytesToHex(result))
  assert.end()
})

test('Ops.Sha256()', assert => {
  const result = new Ops.OpSHA256().call(Utils.hexToBytes(''))
  assert.equals('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', Utils.bytesToHex(result))
  assert.end()
})

test('Ops.Ripemd()', assert => {
  const result = new Ops.OpRIPEMD160().call(Utils.hexToBytes(''))
  assert.equals('9c1185a5c5e9fc54612808977ee8f548b2258d31', Utils.bytesToHex(result))
  assert.end()
})

test('Ops.Append()', assert => {
  const foos = Utils.hexToBytes('00')
  const bars = Utils.hexToBytes('11')
  const call = new Ops.OpAppend(foos).call(bars)
  assert.equals('1100', Utils.bytesToHex(call))
  assert.end()
})

test('Ops.Prepend()', assert => {
  const foos = Utils.hexToBytes('00')
  const bars = Utils.hexToBytes('11')
  const call = new Ops.OpPrepend(foos).call(bars)
  assert.equals('0011', Utils.bytesToHex(call))
  assert.end()
})
