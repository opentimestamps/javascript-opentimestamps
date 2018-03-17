const test = require('tape')
const Bitcoin = require('../src/bitcoin.js')

test('Bitcoin.info()', assert => {
  Bitcoin.BitcoinNode.readBitcoinConf().then(properties => {
    // console.log("Bitcoin properties");
    // console.log(properties);
    const bitcoin = new Bitcoin.BitcoinNode(properties)
    bitcoin.getInfo().then(json => {
      assert.true(json !== undefined)
      assert.end()
    }).catch(err => {
      assert.true('err=' + err)
      assert.end()
    })
  }).catch(err => {
    assert.true('err=' + err)
    assert.end()
  })
})

test('Bitcoin.getBlockHeader()', assert => {
  Bitcoin.BitcoinNode.readBitcoinConf().then(properties => {
    const bitcoin = new Bitcoin.BitcoinNode(properties)
    bitcoin.getBlockHeader(0).then(blockHeader => {
      assert.true(blockHeader !== undefined)
      assert.equals('4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b', blockHeader.getMerkleroot())
      assert.equals('1231006505', String(blockHeader.getTime()))
      assert.end()
    }).catch(err => {
      assert.true('err=' + err)
      assert.end()
    })
  }).catch(err => {
    assert.true('err=' + err)
    assert.end()
  })
})
