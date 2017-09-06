const test = require('tape');
const Utils = require('../src/utils.js');
const Context = require('../src/context.js');
const Notary = require('../src/notary.js');

test('serialization', assert => {
    // Serialization of pending attestations
    let pendingAttestation = new Notary.PendingAttestation(Utils.toBytes("foobar", "UTF-8"));

    let expected_serialized = Buffer.concat([
        Buffer.from(Utils.hexToBytes('83dfe30d2ef90c8e0706')),
        Buffer.from(Utils.toBytes('foobar', 'UTF-8'))
    ]);

    const ssc = new Context.StreamSerialization();
    pendingAttestation.serialize(ssc);
    assert.true(Utils.arrEq(expected_serialized, ssc.getOutput()));

    let ctx1 = new Context.StreamDeserialization(expected_serialized);
    let pendingAttestation2 = Notary.TimeAttestation.deserialize(ctx1);

    assert.true(Utils.arrEq(pendingAttestation2._TAG(), new Notary.PendingAttestation()._TAG()));
    assert.true(Utils.arrEq(pendingAttestation2.uri, Utils.toBytes("foobar", "UTF-8")));

    assert.end();
});



test('deserialization', assert => {
    // Deserialization of attestations
    let pendingAttestation = new Notary.PendingAttestation(Utils.toBytes("foobar", "UTF-8"));
    let ctx = new Context.StreamSerialization();
    pendingAttestation.serialize(ctx);

    let expected_serialized = Buffer.concat([
        Buffer.from(Utils.hexToBytes('83dfe30d2ef90c8e0706')),
        Buffer.from(Utils.toBytes('foobar', 'UTF-8'))
    ]);
    assert.true(Utils.arrEq(expected_serialized, ctx.getOutput()));

    assert.end();
});



test('invalidUriDeserialization', assert => {
    // illegal character

    let expected_serialized = Buffer.concat([
        Buffer.from([0x00]),
        Buffer.from(Utils.hexToBytes('83dfe30d2ef90c8e0706')),
        Buffer.from(Utils.toBytes('fo%bar', 'UTF-8'))
    ]);
    let ctx = new Context.StreamDeserialization(expected_serialized);
    Notary.TimeAttestation.deserialize(ctx);
    assert.end();
});
