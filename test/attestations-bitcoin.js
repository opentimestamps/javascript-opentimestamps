const test = require('tape')
const Utils = require('../src/utils.js')
const Context = require('../src/context.js')
const Notary = require('../src/notary.js')
const Timestamp = require('../src/timestamp.js')

test('sorting', assert => {
  const bitcoinAttestations = [
    new Notary.BitcoinBlockHeaderAttestation(0),
    new Notary.BitcoinBlockHeaderAttestation(1),
    new Notary.BitcoinBlockHeaderAttestation(2)
  ]

  const t = new Timestamp(Utils.toBytes('abcd', 'UTF-8'))
  t.attestations.push(bitcoinAttestations[2])
  t.attestations.push(bitcoinAttestations[1])
  t.attestations.push(bitcoinAttestations[0])

  assert.equals(t.attestations[0].height, 2)
  assert.equals(t.attestations[1].height, 1)
  assert.equals(t.attestations[2].height, 0)

  const ssc = new Context.StreamSerialization()
  t.serialize(ssc)
  const sdc = new Context.StreamDeserialization(ssc.buffer)
  const t1 = Timestamp.deserialize(sdc, Utils.toBytes('abcd', 'UTF-8'))

  assert.equals(t.attestations.length, t1.attestations.length)
  assert.equals(t1.attestations[0].height, 0)
  assert.equals(t1.attestations[1].height, 1)
  assert.equals(t1.attestations[2].height, 2)
  assert.end()
})
