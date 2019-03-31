
const test = require('tape')
const rp = require('request-promise')
const Utils = require('../../src/utils.js')
const OpenTimestamps = require('../../src/open-timestamps.js')
const DetachedTimestampFile = require('../../src/detached-timestamp-file.js')
const Context = require('../../src/context.js')
const Ops = require('../../src/ops.js')
const Notary = require('../../src/notary.js')

// const Timestamp = require('../timestamp.js');
const baseUrl = 'https://raw.githubusercontent.com/opentimestamps/javascript-opentimestamps/master'
let incompleteOtsInfo
let incompleteOts
let incomplete
let helloworldOts
let helloworld
let merkle2Ots
let merkle2OtsInfo
let unknown
let unknownOts
let knownUnknown
let knownUnknownOts
let merkle3
let merkle3Ots
let badStamp
let badStampOts
let osdsp
let osdspOts

test('setup', assert => {
    const incompleteOtsInfoPromise = rp({url: baseUrl + '/examples/incomplete.txt.ots.info', encoding: null})
    const incompleteOtsPromise = rp({url: baseUrl + '/examples/incomplete.txt.ots', encoding: null})
    const incompletePromise = rp({url: baseUrl + '/examples/incomplete.txt', encoding: null})

    const helloworldOtsPromise = rp({url: baseUrl + '/examples/hello-world.txt.ots', encoding: null})
    const helloworldPromise = rp({url: baseUrl + '/examples/hello-world.txt', encoding: null})

    const merkle2OtsPromise = rp({url: baseUrl + '/examples/merkle2.txt.ots', encoding: null})
    const merkle2OtsInfoPromise = rp({url: baseUrl + '/examples/merkle2.txt.ots.info', encoding: null})

    const unknownPromise = rp({url: baseUrl + '/examples/unknown-notary.txt', encoding: null})
    const unknownOtsPromise = rp({url: baseUrl + '/examples/unknown-notary.txt.ots', encoding: null})

    const knownUnknownPromise = rp({url: baseUrl + '/examples/known-and-unknown-notary.txt', encoding: null})
    const knownUnknownOtsPromise = rp({url: baseUrl + '/examples/known-and-unknown-notary.txt.ots', encoding: null})

    const merkle3Promise = rp({url: baseUrl + '/examples/merkle3.txt', encoding: null})
    const merkle3OtsPromise = rp({url: baseUrl + '/examples/merkle3.txt.ots', encoding: null})

    const badStampPromise = rp({url: baseUrl + '/examples/bad-stamp.txt', encoding: null})
    const badStampOtsPromise = rp({url: baseUrl + '/examples/bad-stamp.txt.ots', encoding: null})

    const osdspPromise = rp({url: baseUrl + '/examples/osdsp.txt', encoding: null})
    const osdspOtsPromise = rp({url: baseUrl + '/examples/osdsp.txt.ots', encoding: null})

    Promise.all([
        incompleteOtsInfoPromise, incompleteOtsPromise, incompletePromise,
        helloworldOtsPromise, helloworldPromise,
        merkle2OtsPromise, merkle2OtsInfoPromise,
        unknownPromise, unknownOtsPromise,
        knownUnknownPromise, knownUnknownOtsPromise,
        merkle3Promise, merkle3OtsPromise,
        badStampPromise, badStampOtsPromise,
        osdspPromise, osdspOtsPromise
    ]).then(values => {
        incompleteOtsInfo = values[0]
        incompleteOts = values[1]
        incomplete = values[2]
        helloworldOts = values[3]
        helloworld = values[4]
        merkle2Ots = values[5]
        merkle2OtsInfo = values[6]
        unknown = values[7]
        unknownOts = values[8]
        knownUnknown = values[9]
        knownUnknownOts = values[10]
        merkle3 = values[11]
        merkle3Ots = values[12]
        badStamp = values[13]
        badStampOts = values[14]
        osdsp = values[15]
        osdspOts = values[16]
        assert.end()
    }).catch(err => {
        assert.fail('err=' + err)
    })
})

test('OpenTimestamps.verify()', assert => {
    let detached
    let detachedOts
    try {
        detached = DetachedTimestampFile.fromBytes(new Ops.OpSHA256(), new Context.StreamDeserialization(incomplete))
        detachedOts = DetachedTimestampFile.deserialize(new Context.StreamDeserialization(incompleteOts))
    } catch (err) {
        assert.fail('err=' + err)
        assert.end()
        return
    }
    OpenTimestamps.verify(detachedOts, detached).then(result => {
        assert.deepEqual(result, {'bitcoin': {'timestamp': 1473227803, 'height': 428648}})
        assert.end()
    }).catch(err => {
        assert.fail('err=' + err)
        assert.end()
    })
})

test('OpenTimestamps.verify()', assert => {
    const detached = DetachedTimestampFile.fromBytes(new Ops.OpSHA256(), new Context.StreamDeserialization(helloworld))
    const detachedOts = DetachedTimestampFile.deserialize(new Context.StreamDeserialization(helloworldOts))
    OpenTimestamps.verify(detachedOts, detached).then(result => {
        assert.true(result !== undefined)
        assert.deepEqual(result, {'bitcoin': {'timestamp': 1432827678, 'height': 358391}})
        assert.end()
    }).catch(err => {
        assert.fail('err=' + err)
        assert.end()
    })
})

test('OpenTimestamps.verify()', assert => {
    const detached = DetachedTimestampFile.fromBytes(new Ops.OpSHA256(), new Context.StreamDeserialization(unknown))
    const detachedOts = DetachedTimestampFile.deserialize(new Context.StreamDeserialization(unknownOts))
    OpenTimestamps.verify(detachedOts, detached).then(result => {
        assert.deepEqual(result, {})
        assert.end()
    }).catch(err => {
        assert.fail('err=' + err)
        assert.end()
    })
})

test('OpenTimestamps.verify()', assert => {
    const detached = DetachedTimestampFile.fromBytes(new Ops.OpSHA256(), new Context.StreamDeserialization(knownUnknown))
    const detachedOts = DetachedTimestampFile.deserialize(new Context.StreamDeserialization(knownUnknownOts))
    OpenTimestamps.verify(detachedOts, detached).then(result => {
        assert.true(result !== undefined)
        assert.deepEqual(result, {'bitcoin': {'timestamp': 1474865937, 'height': 431564}})
        assert.true(detached !== undefined)
        assert.true(detachedOts !== undefined)
        assert.end()
    }).catch(err => {
        assert.fail('err=' + err)
        assert.end()
    })
})

test('OpenTimestamps.verify()', assert => {
    const detached = DetachedTimestampFile.fromBytes(new Ops.OpSHA256(), new Context.StreamDeserialization(badStamp))
    const detachedOts = DetachedTimestampFile.deserialize(new Context.StreamDeserialization(badStampOts))
    OpenTimestamps.verify(detachedOts, detached).then(result => {
        assert.fail(result)
        assert.end()
    }).catch(err => {
        assert.true(err !== undefined)
        assert.end()
    })
})

test('OpenTimestamps.verify()', assert => {
    const detached = DetachedTimestampFile.fromBytes(new Ops.OpSHA256(), new Context.StreamDeserialization(merkle3))
    const detachedOts = DetachedTimestampFile.deserialize(new Context.StreamDeserialization(merkle3Ots))
    OpenTimestamps.verify(detachedOts, detached).then(result => {
        assert.true(result !== undefined)
        assert.true(detached !== undefined)
        assert.true(detachedOts !== undefined)
        assert.end()
    }).catch(err => {
        assert.fail('err=' + err)
        assert.end()
    })
})

test('OpenTimestamps.verify()', assert => {
    const detached = DetachedTimestampFile.fromBytes(new Ops.OpSHA256(), new Context.StreamDeserialization(helloworld))
    const detachedOts = DetachedTimestampFile.deserialize(new Context.StreamDeserialization(helloworldOts))
    const options = {
        esplora: {
            url: 'https://blockstream.info/api'
        }
    }
    OpenTimestamps.verify(detachedOts, detached, options).then(result => {
        assert.true(result !== undefined)
        assert.deepEqual(result, {'bitcoin': {'timestamp': 1432827678, 'height': 358391}})
        assert.end()
    }).catch(err => {
        assert.fail('err=' + err)
        assert.end()
    })
})

test('OpenTimestamps.verify()', assert => {
    // Test options with a bad esplora url (it should fail)
    const detached = DetachedTimestampFile.fromBytes(new Ops.OpSHA256(), new Context.StreamDeserialization(helloworld))
    let detachedOts
    try {
        detachedOts = DetachedTimestampFile.deserialize(new Context.StreamDeserialization(helloworldOts))
    } catch (err) {
        assert.fail(err)
        assert.end()
        return
    }
    const options = {
        esplora: {
            url: 'https://esplora.com'
        }
    }
    OpenTimestamps.verify(detachedOts, detached, options).then((result) => {
        assert.fail('Unable to reach the server (bad esplora url)')
        assert.end()
    }).catch((err) => {
        assert.true(err !== undefined)
        assert.end()
    })
})


test('OpenTimestamps.verify()', assert => {
    // Test options with timeout of 20s
    const detached = DetachedTimestampFile.fromBytes(new Ops.OpSHA256(), new Context.StreamDeserialization(helloworld))
    const detachedOts = DetachedTimestampFile.deserialize(new Context.StreamDeserialization(helloworldOts))
    const options = {
        esplora: { timeout: 20 }
    }
    OpenTimestamps.verify(detachedOts, detached, options).then(result => {
        assert.true(result !== undefined)
        assert.deepEqual(result, {'bitcoin': {'timestamp': 1432827678, 'height': 358391}})
        assert.end()
    }).catch(err => {
        assert.fail('err=' + err)
        assert.end()
    })
})

test('OpenTimestamps.multipleBitcoinAttestations()', assert => {
    const ots = DetachedTimestampFile.deserialize(osdspOts)
    const detached = DetachedTimestampFile.fromBytes(new Ops.OpSHA256(), osdsp)

    // ots is a completed timestamp with only 1 Bitcoin Attestation at block 523364 and 3 in pending
    assert.true(ots.timestamp.isTimestampComplete())
    const pendings = [...ots.timestamp.getAttestations()].filter(a => { return (a instanceof Notary.PendingAttestation) ? a : undefined })
    const bitcoins = [...ots.timestamp.getAttestations()].filter(a => { return (a instanceof Notary.BitcoinBlockHeaderAttestation) ? a : undefined })
    assert.equals(pendings.length, 4)
    assert.equals(bitcoins.length, 1)
    assert.equals(bitcoins[0].height, 523364)

    // upgrade ots to resolve the 3 pending attestations
    OpenTimestamps.upgrade(ots).then(changed => {
        assert.true(ots !== null)
        assert.true(changed)

        const pendings = [...ots.timestamp.getAttestations()].filter(a => {
            return (a instanceof Notary.PendingAttestation) ? a : undefined
        })
        const bitcoins523364 = [...ots.timestamp.getAttestations()].filter(a => {
            return (a instanceof Notary.BitcoinBlockHeaderAttestation && a.height === 523364) ? a : undefined
        })
        const bitcoins523367 = [...ots.timestamp.getAttestations()].filter(a => {
            return (a instanceof Notary.BitcoinBlockHeaderAttestation && a.height === 523367) ? a : undefined
        })
        assert.equals(pendings.length, 4)
        assert.equals(bitcoins523364.length, 1)
        assert.equals(bitcoins523367.length, 3)

        // verify upgreaded ots to obtain the min bitcoin attestation
        return OpenTimestamps.verify(ots, detached)
    }).then(result => {
        assert.true(ots !== null)
        assert.true(result !== null)
        // check min bitcoin attestation
        assert.deepEqual(result, {'bitcoin': {'timestamp': 1526719849, 'height': 523364}})
        assert.end()
    }).catch(err => {
        assert.fail('err=' + err)
        assert.end()
    })
})
