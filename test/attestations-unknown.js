const test = require('tape')
const Utils = require('../src/utils.js')
const Context = require('../src/context.js')
const Notary = require('../src/notary.js')

test('string', assert => {
  const a = new Notary.UnknownAttestation(
    Utils.hexToBytes('0102030405060708'),
    Utils.toBytes('Hello World!', 'UTF-8'))

  const string = 'UnknownAttestation ' + Utils.bytesToHex(a._TAG()) + ' ' + Utils.bytesToHex(a.payload)
  assert.equal(a.toString(), string)

  assert.end()
})

test('serialization', assert => {
  // Serialization/deserialization of unknown attestations

  const expectedSerialized = Buffer.concat([
    Buffer.from(Utils.hexToBytes('0102030405060708')),
    Buffer.from([0x0c]),
    Buffer.from(Utils.toBytes('Hello World!', 'UTF-8'))
  ])

  const ssc = new Context.StreamDeserialization(expectedSerialized)
  const unknownAttestation = Notary.TimeAttestation.deserialize(ssc)
  assert.true(Utils.arrEq(unknownAttestation._TAG(), Utils.hexToBytes('0102030405060708')))
  assert.true(Utils.arrEq(unknownAttestation.payload, Utils.toBytes('Hello World!', 'UTF-8')))

  const ctx1 = new Context.StreamSerialization()
  unknownAttestation.serialize(ctx1)
  assert.true(Utils.arrEq(expectedSerialized, ctx1.getOutput()))

  assert.end()
})
