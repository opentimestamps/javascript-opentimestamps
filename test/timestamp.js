const test = require('tape');
const Utils = require('../src/utils.js');
const Timestamp = require('../src/timestamp.js');
const Ops = require('../src/ops.js');
const Context = require('../src/context.js');
const Notary = require('../src/notary.js');

test('addOp', assert => {
    // Adding operations to timestamps
  const t = new Timestamp(Utils.toBytes('abcd', 'UTF-8'));

  const opAppend = new Ops.OpAppend(Utils.toBytes('efgh', 'UTF-8'));
  t.add(opAppend);

    // The second add should succeed with the timestamp unchanged
  t.add(opAppend);
  const tComplete = new Timestamp(Utils.toBytes('abcdefgh', 'UTF-8'));

  console.log(t.ops.get(opAppend));
  console.log(tComplete);
  assert.true(t.ops.get(opAppend).equals(tComplete));

  assert.end();
});

test('setResultTimestamp', assert => {
    // Setting an op result timestamp
  const t1 = new Timestamp(Utils.toBytes('foo', 'UTF-8'));
  const opAppend1 = new Ops.OpAppend(Utils.toBytes('bar', 'UTF-8'));
  const opAppend2 = new Ops.OpAppend(Utils.toBytes('baz', 'UTF-8'));
  const t2 = t1.add(opAppend1);
  t2.add(opAppend2);
  assert.true(Utils.arrEq(t1.ops.get(opAppend1).ops.get(opAppend2).msg, Utils.toBytes('foobarbaz', 'UTF-8')));

  t1.ops.set(opAppend1, new Timestamp(Utils.toBytes('foobar', 'UTF-8')));

  t1.ops.get(opAppend1).ops.forEach((timestamp, op) => {
    assert.false(op.equals(opAppend2));
  });
  assert.end();
});

function Tserialize(assert, expectedInstance, expectedSerialized) {
  const ssc = new Context.StreamSerialization();
  expectedInstance.serialize(ssc);
  const actualSerialized = ssc.getOutput();
  assert.true(Utils.arrEq(expectedSerialized, actualSerialized));
  const sdc = new Context.StreamDeserialization(expectedSerialized);
  const actualInstance = Timestamp.deserialize(sdc, expectedInstance.msg);
  assert.true(expectedInstance.equals(actualInstance));
}

test('serialization', assert => {
    // Timestamp serialization/deserialization

    // timestamp with 1 attestation
  const stamp = new Timestamp(Utils.toBytes('foo', 'UTF-8'));
  stamp.attestations.push(new Notary.PendingAttestation('foobar'));
  let buffer = Buffer.concat([
    Buffer.from([0x00]),
    Buffer.from(Utils.hexToBytes('83dfe30d2ef90c8e0706')),
    Buffer.from(Utils.toBytes('foobar', 'UTF-8'))
  ]);
  Tserialize(assert, stamp, buffer);

    // timestamp with 2 attestations
  stamp.attestations.push(new Notary.PendingAttestation('barfoo'));
  buffer = Buffer.concat([
    Buffer.from([0xff, 0x00]),
    Buffer.from(Utils.hexToBytes('83dfe30d2ef90c8e0706')),
    Buffer.from(Utils.toBytes('barfoo', 'UTF-8')),
    Buffer.from([0x00]),
    Buffer.from(Utils.hexToBytes('83dfe30d2ef90c8e0706')),
    Buffer.from(Utils.toBytes('foobar', 'UTF-8'))
  ]);
  Tserialize(assert, stamp, buffer);

    // timestamp with 3 attestations
  stamp.attestations.push(new Notary.PendingAttestation('foobaz'));
  buffer = Buffer.concat([
    Buffer.from([0xff, 0x00]),
    Buffer.from(Utils.hexToBytes('83dfe30d2ef90c8e0706')),
    Buffer.from(Utils.toBytes('barfoo', 'UTF-8')),
    Buffer.from([0xff, 0x00]),
    Buffer.from(Utils.hexToBytes('83dfe30d2ef90c8e0706')),
    Buffer.from(Utils.toBytes('foobar', 'UTF-8')),
    Buffer.from([0x00]),
    Buffer.from(Utils.hexToBytes('83dfe30d2ef90c8e0706')),
    Buffer.from(Utils.toBytes('foobaz', 'UTF-8'))
  ]);
  Tserialize(assert, stamp, buffer);

    // Timestamp sha256Stamp = stamp.ops.put(new OpSHA256(), null);
    // Should fail - empty timestamps can't be serialized
    // StreamSerializationContext ssc = new StreamSerializationContext();
    // stamp.serialize(ssc);
  const opSHA256 = new Ops.OpSHA256();
  const sha256Stamp = stamp.add(opSHA256);

  const pendingAttestation = new Notary.PendingAttestation('deeper');
  sha256Stamp.attestations.push(pendingAttestation);

  buffer = Buffer.concat([
    Buffer.from([0xff, 0x00]),
    Buffer.from(Utils.hexToBytes('83dfe30d2ef90c8e0706')),
    Buffer.from(Utils.toBytes('barfoo', 'UTF-8')),
    Buffer.from([0xff, 0x00]),
    Buffer.from(Utils.hexToBytes('83dfe30d2ef90c8e0706')),
    Buffer.from(Utils.toBytes('foobar', 'UTF-8')),
    Buffer.from([0xff, 0x00]),
    Buffer.from(Utils.hexToBytes('83dfe30d2ef90c8e0706')),
    Buffer.from(Utils.toBytes('foobaz', 'UTF-8')),
    Buffer.from([0x08, 0x00]),
    Buffer.from(Utils.hexToBytes('83dfe30d2ef90c8e0706')),
    Buffer.from(Utils.toBytes('deeper', 'UTF-8'))
  ]);
  Tserialize(assert, stamp, buffer);

  assert.end();
});
