
const test = require('tape')
const rp = require('request-promise')
const Utils = require('../src/utils.js')
const OpenTimestamps = require('../src/open-timestamps.js')
const DetachedTimestampFile = require('../src/detached-timestamp-file.js')
const Context = require('../src/context.js')
const Ops = require('../src/ops.js')
const Notary = require('../src/notary.js')

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
  const incompleteOtsInfoPromise = rp({ url: baseUrl + '/examples/incomplete.txt.ots.info', encoding: null })
  const incompleteOtsPromise = rp({ url: baseUrl + '/examples/incomplete.txt.ots', encoding: null })
  const incompletePromise = rp({ url: baseUrl + '/examples/incomplete.txt', encoding: null })

  const helloworldOtsPromise = rp({ url: baseUrl + '/examples/hello-world.txt.ots', encoding: null })
  const helloworldPromise = rp({ url: baseUrl + '/examples/hello-world.txt', encoding: null })

  const merkle2OtsPromise = rp({ url: baseUrl + '/examples/merkle2.txt.ots', encoding: null })
  const merkle2OtsInfoPromise = rp({ url: baseUrl + '/examples/merkle2.txt.ots.info', encoding: null })

  const unknownPromise = rp({ url: baseUrl + '/examples/unknown-notary.txt', encoding: null })
  const unknownOtsPromise = rp({ url: baseUrl + '/examples/unknown-notary.txt.ots', encoding: null })

  const knownUnknownPromise = rp({ url: baseUrl + '/examples/known-and-unknown-notary.txt', encoding: null })
  const knownUnknownOtsPromise = rp({ url: baseUrl + '/examples/known-and-unknown-notary.txt.ots', encoding: null })

  const merkle3Promise = rp({ url: baseUrl + '/examples/merkle3.txt', encoding: null })
  const merkle3OtsPromise = rp({ url: baseUrl + '/examples/merkle3.txt.ots', encoding: null })

  const badStampPromise = rp({ url: baseUrl + '/examples/bad-stamp.txt', encoding: null })
  const badStampOtsPromise = rp({ url: baseUrl + '/examples/bad-stamp.txt.ots', encoding: null })

  const osdspPromise = rp({ url: baseUrl + '/examples/osdsp.txt', encoding: null })
  const osdspOtsPromise = rp({ url: baseUrl + '/examples/osdsp.txt.ots', encoding: null })

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

// INFO TESTS
test('OpenTimestamps.info()', assert => {
  const detachedOts = DetachedTimestampFile.deserialize(new Context.StreamDeserialization(incompleteOts))
  const otsInfoCalc = OpenTimestamps.info(detachedOts)
  assert.false(otsInfoCalc === undefined)
  assert.false(incompleteOts === undefined)
  assert.true(incompleteOtsInfo.equals(Buffer.from(otsInfoCalc)))
  assert.end()
})

test('OpenTimestamps.info()', assert => {
  const detachedOts = DetachedTimestampFile.deserialize(new Context.StreamDeserialization(merkle2Ots))
  const merkle2OtsInfoCalc = OpenTimestamps.info(detachedOts)
  assert.false(merkle2OtsInfoCalc === undefined)
  assert.false(merkle2Ots === undefined)
  assert.true(merkle2OtsInfo.equals(Buffer.from(merkle2OtsInfoCalc)))
  assert.end()
})

test('OpenTimestamps.info()', assert => {
  const detachedOts = DetachedTimestampFile.deserialize(new Context.StreamDeserialization(unknownOts))
  const unknownInfoCalc = OpenTimestamps.info(detachedOts)
  assert.false(unknownInfoCalc === undefined)
  assert.false(unknownOts === undefined)
  assert.end()
})

test('OpenTimestamps.info()', assert => {
  const detachedOts = DetachedTimestampFile.deserialize(new Context.StreamDeserialization(knownUnknownOts))
  const knownUnknownInfoCalc = OpenTimestamps.info(detachedOts)
  assert.false(knownUnknownInfoCalc === undefined)
  assert.false(knownUnknownOts === undefined)
  assert.end()
})

test('OpenTimestamps.info()', assert => {
  const detachedOts = DetachedTimestampFile.deserialize(new Context.StreamDeserialization(merkle3Ots))
  const merkle3InfoCalc = OpenTimestamps.info(detachedOts)
  assert.false(merkle3InfoCalc === undefined)
  assert.false(merkle3Ots === undefined)
  assert.end()
})

test('OpenTimestamps.info()', assert => {
  const detachedOts = DetachedTimestampFile.deserialize(new Context.StreamDeserialization(badStampOts))
  const badStampInfoCalc = OpenTimestamps.info(detachedOts)
  assert.false(badStampInfoCalc === undefined)
  assert.false(badStampOts === undefined)
  assert.end()
})

test('OpenTimestamps.DetachedTimestampFile()', assert => {
  const detached1 = DetachedTimestampFile.fromBytes(new Ops.OpSHA256(), incomplete)

  const ctx = new Context.StreamDeserialization(incomplete)
  const detached2 = DetachedTimestampFile.fromBytes(new Ops.OpSHA256(), ctx)

  const ctx1 = new Context.StreamDeserialization(incomplete)
  const fdHash = new Ops.OpSHA256().hashFd(ctx1)
  const detached3 = DetachedTimestampFile.fromHash(new Ops.OpSHA256(), fdHash)

  const bufferHash = Buffer.from(fdHash)
  const detached4 = DetachedTimestampFile.fromHash(new Ops.OpSHA256(), bufferHash)

  assert.true(detached1.equals(detached2))
  assert.true(detached2.equals(detached3))
  assert.true(detached3.equals(detached4))
  assert.end()
})

// STAMP TESTS FILE

test('OpenTimestamps.stamp()', assert => {
  const sha256 = Utils.hexToBytes('05c4f616a8e5310d19d938cfd769864d7f4ccdc2ca8b479b10af83564b097af9')
  const detached = DetachedTimestampFile.fromBytes(new Ops.OpSHA256(), incomplete)
  OpenTimestamps.stamp(detached).then(() => {
    assert.false(detached === undefined)
    assert.true(Utils.arrEq(sha256, detached.fileDigest()))
    assert.end()
  }).catch(err => {
    assert.fail('err=' + err)
  })
})

// STAMP TESTS HASH
test('OpenTimestamps.stamp()', assert => {
  // Pass single input file
  const sha256 = Utils.hexToBytes('05c4f616a8e5310d19d938cfd769864d7f4ccdc2ca8b479b10af83564b097af9')
  const detached = DetachedTimestampFile.fromHash(new Ops.OpSHA256(), sha256)

  OpenTimestamps.stamp(detached).then(() => {
    assert.false(detached === undefined)
    assert.true(Utils.arrEq(sha256, detached.fileDigest()))
    assert.end()
  }).catch(err => {
    assert.fail('err=' + err)
  })
})

// MULTISTAMP TESTS HASH

test('OpenTimestamps.stamp()', assert => {
  const files = [
    incomplete,
    helloworld
  ]
  const sha256 = [
    Utils.hexToBytes('05c4f616a8e5310d19d938cfd769864d7f4ccdc2ca8b479b10af83564b097af9'),
    Utils.hexToBytes('03ba204e50d126e4674c005e04d82e84c21366780af1f43bd54a37816b6ab340')
  ]
  const detaches = []
  files.forEach(file => {
    const detached = DetachedTimestampFile.fromBytes(new Ops.OpSHA256(), new Context.StreamDeserialization(file))
    detaches.push(detached)
  })
  files.forEach((files, i) => {
    assert.true(Utils.arrEq(sha256[i], detaches[i].fileDigest()))
  })

  OpenTimestamps.stamp(detaches).then(() => {
    assert.equals(detaches.length, files.length)

    detaches.forEach((timestamp, i) => {
      assert.false(timestamp === undefined)
      assert.true(Utils.arrEq(sha256[i], timestamp.fileDigest()))
    })
    assert.end()
  }).catch(err => {
    assert.fail('err=' + err)
  })
})

// UPGRADE TESTS

test('OpenTimestamps.upgrade()', assert => {
  const detached = DetachedTimestampFile.deserialize(new Context.StreamDeserialization(incompleteOts))
  const detachedBefore = DetachedTimestampFile.deserialize(new Context.StreamDeserialization(incompleteOts))

  OpenTimestamps.upgrade(detached).then(changed => {
    assert.true(detached !== null)
    assert.true(changed)
    assert.false(detached.equals(detachedBefore))
    assert.end()
  }).catch(err => {
    assert.fail('err=' + err)
    assert.end()
  })
})

test('OpenTimestamps.upgrade()', assert => {
  const detached = DetachedTimestampFile.deserialize(new Context.StreamDeserialization(helloworldOts))
  const detachedBefore = DetachedTimestampFile.deserialize(new Context.StreamDeserialization(helloworldOts))

  OpenTimestamps.upgrade(detached).then(changed => {
    assert.true(detached !== null)
    assert.false(changed)
    assert.true(detached.equals(detachedBefore))
    assert.end()
  }).catch(err => {
    assert.fail('err=' + err)
    assert.end()
  })
})

test('OpenTimestamps.upgrade()', assert => {
  const detached = DetachedTimestampFile.deserialize(new Context.StreamDeserialization(unknownOts))
  const detachedBefore = DetachedTimestampFile.deserialize(new Context.StreamDeserialization(unknownOts))

  OpenTimestamps.upgrade(detached).then(changed => {
    assert.true(detached !== null)
    assert.false(changed)
    assert.true(detached.equals(detachedBefore))
    assert.end()
  }).catch(err => {
    assert.fail('err=' + err)
    assert.end()
  })
})

test('OpenTimestamps.upgrade()', assert => {
  const detached = DetachedTimestampFile.deserialize(new Context.StreamDeserialization(knownUnknownOts))
  const detachedBefore = DetachedTimestampFile.deserialize(new Context.StreamDeserialization(knownUnknownOts))

  OpenTimestamps.upgrade(detached).then(changed => {
    assert.true(detached !== null)
    assert.true(changed)
    assert.false(detached.equals(detachedBefore))
    assert.end()
  }).catch(err => {
    assert.fail('err=' + err)
    assert.end()
  })
})

test('OpenTimestamps.upgrade()', assert => {
  const detached = DetachedTimestampFile.deserialize(new Context.StreamDeserialization(merkle3Ots))
  const detachedBefore = DetachedTimestampFile.deserialize(new Context.StreamDeserialization(merkle3Ots))

  OpenTimestamps.upgrade(detached).then(changed => {
    assert.true(detached !== null)
    assert.true(changed)
    assert.false(detached.equals(detachedBefore))
    assert.end()
  }).catch(err => {
    assert.fail('err=' + err)
    assert.end()
  })
})

test('OpenTimestamps.upgrade()', assert => {
  const detached = DetachedTimestampFile.deserialize(new Context.StreamDeserialization(badStampOts))
  const detachedBefore = DetachedTimestampFile.deserialize(new Context.StreamDeserialization(badStampOts))

  OpenTimestamps.upgrade(detached).then(changed => {
    assert.true(detached !== null)
    assert.false(changed)
    assert.true(detached.equals(detachedBefore))
    assert.end()
  }).catch(err => {
    assert.fail('err=' + err)
    assert.end()
  })
})

test('OpenTimestamps.stamp&upgrade()', assert => {
  const sha256 = Utils.hexToBytes('05c4f616a8e5310d19d938cfd769864d7f4ccdc2ca8b479b10af83564b097af9')
  const detached = DetachedTimestampFile.fromBytes(new Ops.OpSHA256(), incomplete)
  OpenTimestamps.stamp(detached).then(() => {
    assert.false(detached === undefined)
    assert.true(Utils.arrEq(sha256, detached.fileDigest()))
    return OpenTimestamps.upgrade(detached)
  }).then(changed => {
    assert.true(detached !== null)
    assert.false(changed)
    assert.end()
  }).catch(err => {
    assert.fail('err=' + err)
    assert.end()
  })
})

test('OpenTimestamps.emptyTimestamp()', assert => {
  const info = 'File sha256 hash: 05c4f616a8e5310d19d938cfd769864d7f4ccdc2ca8b479b10af83564b097af9\nTimestamp:\n'
  const detached = DetachedTimestampFile.fromBytes(new Ops.OpSHA256(), incomplete)
  const detachedInfo = OpenTimestamps.info(detached)
  assert.equal(detachedInfo, info)

  // serialize & deserialize
  const ctx = new Context.StreamSerialization()
  detached.serialize(ctx)
  const buffer = Buffer.from(ctx.getOutput())

  // error to deserialize an ots with empty timestamp
  try {
    DetachedTimestampFile.deserialize(new Context.StreamDeserialization(buffer))
    assert.true(false)
  } catch (err) {
    assert.true(true)
  }
  assert.end()
})

test('OpenTimestamps.serialize()', assert => {
  // from bytes: serialize to buffer
  const det = DetachedTimestampFile.fromBytes(new Ops.OpSHA256(), helloworld)
  const ots = det.serializeToBytes()

  // from bytes: serialize with context
  try {
    const detached = DetachedTimestampFile.fromBytes(new Ops.OpSHA256(), helloworld)
    const ctx = new Context.StreamSerialization()
    detached.serialize(ctx)
    assert.true(Utils.arrEq(ots, ctx.getOutput()))
  } catch (err) {
    assert.fail(err)
  }

  // from hash: serialize to buffer
  try {
    const hash = (new Ops.OpSHA256()).call(helloworld)
    const detached = DetachedTimestampFile.fromHash(new Ops.OpSHA256(), hash)
    const bytes = Utils.arrayToBytes(detached.serializeToBytes())
    assert.true(Utils.arrEq(ots, bytes))
  } catch (err) {
    assert.fail(err)
  }

  // from hash: serialize with context
  try {
    const hash = (new Ops.OpSHA256()).call(helloworld)
    const detached = DetachedTimestampFile.fromHash(new Ops.OpSHA256(), hash)
    const ctx = new Context.StreamSerialization()
    detached.serialize(ctx)
    assert.true(Utils.arrEq(ots, ctx.getOutput()))
  } catch (err) {
    assert.fail(err)
  }

  // from ots: serialize to buffer
  try {
    const detached = DetachedTimestampFile.deserialize(helloworldOts)
    const bytes = Utils.arrayToBytes(detached.serializeToBytes())
    assert.true(Utils.arrEq(helloworldOts, bytes))
  } catch (err) {
    assert.fail(err)
  }

  // from ots: serialize with context
  try {
    const detached = DetachedTimestampFile.deserialize(helloworldOts)
    const ctx = new Context.StreamSerialization()
    detached.serialize(ctx)
    assert.true(Utils.arrEq(helloworldOts, ctx.getOutput()))
  } catch (err) {
    assert.fail()
  }

  assert.end()
})
