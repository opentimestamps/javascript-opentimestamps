const test = require('tape');
const Utils = require('../src/utils.js');
const Timestamp = require('../src/timestamp.js');
const Ops = require('../src/ops.js');
const Context = require('../src/context.js');
const Notary = require('../src/notary.js');
const Merkle = require('../src/merkle.js');

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

test('merge', assert => {
    // Merging timestamps

  const stampA = new Timestamp(Utils.toBytes('a', 'UTF-8'));
  const stampB = new Timestamp(Utils.toBytes('b', 'UTF-8'));
  let error = null;
  try {
    stampA.merge(stampB);
  } catch (err) {
    error = err;
  }
  assert.false(error);

  const stamp1 = new Timestamp(Utils.toBytes('a', 'UTF-8'));
  const stamp2 = new Timestamp(Utils.toBytes('a', 'UTF-8'));
  stamp2.attestations.push(new Notary.PendingAttestation('foobar'));
  error = null;
  try {
    stamp1.merge(stamp2);
    assert.true(stamp1.equals(stamp2));
  } catch (err) {
    error = err;
  }
  assert.false(error);
  assert.end();
});

test('makeMerkleTree', assert => {
  defTimestamp(assert, 2, Utils.hexToBytes('b413f47d13ee2fe6c845b2ee141af81de858df4ec549a58b7970bb96645bc8d2'));
  defTimestamp(assert, 3, Utils.hexToBytes('e6aa639123d8aac95d13d365ec3779dade4b49c083a8fed97d7bfc0d89bb6a5e'));
  defTimestamp(assert, 4, Utils.hexToBytes('7699a4fdd6b8b6908a344f73b8f05c8e1400f7253f544602c442ff5c65504b24'));
  defTimestamp(assert, 5, Utils.hexToBytes('aaa9609d0c949fee22c1c941a4432f32dc1c2de939e4af25207f0dc62df0dbd8'));
  defTimestamp(assert, 6, Utils.hexToBytes('ebdb4245f648b7e77b60f4f8a99a6d0529d1d372f98f35478b3284f16da93c06'));
  defTimestamp(assert, 7, Utils.hexToBytes('ba4603a311279dea32e8958bfb660c86237157bf79e6bfee857803e811d91b8f'));
  assert.end();
});

test('CatSha256', assert => {
  const left = new Timestamp(Utils.toBytes('foo', 'UTF-8'));
  const right = new Timestamp(Utils.toBytes('bar', 'UTF-8'));
  const stampLeftRight = Merkle.catSha256(left, right);
  assert.true(Utils.arrEq(stampLeftRight.getDigest(), Utils.hexToBytes('c3ab8ff13720e8ad9047dd39466b3c8974e592c2fa383d4a3960714caef0c4f2')));

  const righter = new Timestamp(Utils.toBytes('baz', 'UTF-8'));
  const stampRighter = Merkle.catSha256(stampLeftRight, righter);
  assert.true(Utils.arrEq(stampRighter.getDigest(), Utils.hexToBytes('23388b16c66f1fa37ef14af8eb081712d570813e2afb8c8ae86efa726f3b7276')));
  assert.end();
});

function defTimestamp(assert, n, expectedMerkleRoot) {
  const roots = [];

  for (let i = 0; i < n; i++) {
    roots.push(new Timestamp([i]));
  }
  const merkleTip = Merkle.makeMerkleTree(roots);
  assert.true(Utils.arrEq(merkleTip.getDigest(), expectedMerkleRoot));

  roots.forEach(root => {
    const tips = root.allTips();
    tips.forEach(tip => {
      assert.true(Utils.arrEq(tip, merkleTip.getDigest()));
    });
  });
}
