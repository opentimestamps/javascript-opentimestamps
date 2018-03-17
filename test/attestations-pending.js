const test = require('tape')
const Utils = require('../src/utils.js')
const Context = require('../src/context.js')
const Notary = require('../src/notary.js')

test('serialization', assert => {
  // Serialization of pending attestations
  const pendingAttestation = new Notary.PendingAttestation('foobar')

  const expectedSerialized = Buffer.concat([
    Buffer.from(Utils.hexToBytes('83dfe30d2ef90c8e0706')),
    Buffer.from(Utils.toBytes('foobar', 'UTF-8'))
  ])

  const ssc = new Context.StreamSerialization()
  pendingAttestation.serialize(ssc)
  assert.true(Utils.arrEq(expectedSerialized, ssc.getOutput()))

  const ctx1 = new Context.StreamDeserialization(expectedSerialized)
  const pendingAttestation2 = Notary.TimeAttestation.deserialize(ctx1)

  assert.true(Utils.arrEq(pendingAttestation2._TAG(), new Notary.PendingAttestation()._TAG()))
  assert.equal(pendingAttestation2.uri, 'foobar')

  assert.end()
})

test('deserialization', assert => {
  // Deserialization of attestations
  const pendingAttestation = new Notary.PendingAttestation('foobar')
  const ctx = new Context.StreamSerialization()
  pendingAttestation.serialize(ctx)

  const expectedSerialized = Buffer.concat([
    Buffer.from(Utils.hexToBytes('83dfe30d2ef90c8e0706')),
    Buffer.from(Utils.toBytes('foobar', 'UTF-8'))
  ])
  assert.true(Utils.arrEq(expectedSerialized, ctx.getOutput()))

  assert.end()
})

test('invalidUriDeserialization', assert => {
  // illegal character

  const expectedSerialized = Buffer.concat([
    Buffer.from([0x00]),
    Buffer.from(Utils.hexToBytes('83dfe30d2ef90c8e0706')),
    Buffer.from(Utils.toBytes('fo%bar', 'UTF-8'))
  ])
  const ctx = new Context.StreamDeserialization(expectedSerialized)
  Notary.TimeAttestation.deserialize(ctx)
  assert.end()
})
