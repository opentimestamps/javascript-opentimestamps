
# javascript-opentimestamps


![OpenTimestamps logo](https://raw.githubusercontent.com/opentimestamps/logo/master/white-bg/website-horizontal-350x75.png)


[![Build Status](https://travis-ci.org/eternitywall/javascript-opentimestamps.svg?branch=master)](https://travis-ci.org/eternitywall/javascript-opentimestamps)

This repo host the javascript implementation of OpenTimestamps.

It is a based on the python implementation at https://github.com/opentimestamps/python-opentimestamps and https://github.com/opentimestamps/opentimestamps-client

It is developed as node modules, you can use it in the browser with tools such as browserify.
Have a look at the /examples folder for a demo of this.

Documentation available at https://eternitywall.com/docs/javascript-opentimestamps/

## Installation

Using npm:

```shell
$ npm install -g javascript-opentimestamps
```

Using Browserify:

```shell
npm install -g browserify
browserify test.js -o test.bundle.js
```

```html
<script src="test.bundle.js"></script>
```


## Compatibility

#### Browser

ECMAScript 6 browser compatibility required.

#### Node version

This library is tested on CI against version 6.0 and 6.1


## Command Line

#### Stamp

Create timestamp `README.md.ots` from this `README.md` with the aid of a remote calendar.

```shell
$ ots-cli.js stamp README.md
The timestamp proof 'README.md.ots' has been created!
```

#### Info

Show information on a timestamp.

```shell
$ ots-cli.js info examples/incomplete.txt.ots
File sha256 hash: 05c4f616a8e5310d19d938cfd769864d7f4ccdc2ca8b479b10af83564b097af9
Timestamp:
append e754bf93806a7ebaa680ef7bd0114bf4
sha256
append b573e8850cfd9e63d1f043fbb6fc250e
sha256
prepend 57cfa5c4
append 6fb1ac8d4e4eb0e7
verify PendingAttestation('https://alice.btc.calendar.opentimestamps.org')

```

#### Verify

Verify the timestamp attestations with the aid of remote block explorers.

```shell
$ ots-cli.js verify examples/hello-world.txt.ots
Assuming target filename is 'examples/hello-world.txt'
Success! Bitcoin attests data existed as of Thu May 28 2015 17:41:18 GMT+0200 (CEST)
```

Note: This verification using block explorers is convenient but not as secure as asking to a local node.
To mitigate the risks, answer from block explorer is considered only if two different endpoint return the same result. Even by doing so this is not as secure as asking a local node.   

#### Upgrade

Upgrade incomplete remote calendar timestamps to be independently verifiable. This command overwrite the file `examples/incomplete.txt.ots` if needed and make a backup of the old content at `examples/incomplete.txt.ots`. 

```shell
$ ots-cli.js upgrade examples/incomplete.txt.ots
Timestamp has been successfully upgraded!
```

## From code

#### Stamp and Info

Create timestamp with the aid of a remote calendar.

```js
const OpenTimestamps = require('javascript-opentimestamps');
const file = Buffer.from('5468652074696d657374616d70206f6e20746869732066696c6520697320696e636f6d706c6574652c20616e642063616e2062652075706772616465642e0a','hex');
const stampResultPromise = OpenTimestamps.stamp(file);
stampResultPromise.then(stampResult => {
  const infoResult = OpenTimestamps.info(stampResult);
  console.log(infoResult);
});
```
Const `file` created from the hex representation of the file `test/incomplete.txt`

#### Info

Show information on a timestamp.

```js
const OpenTimestamps = require('javascript-opentimestamps');
const fileOts = Buffer.from('004f70656e54696d657374616d7073000050726f6f6600bf89e2e884e89294010805c4f616a8e5310d19d938cfd769864d7f4ccdc2ca8b479b10af83564b097af9f010e754bf93806a7ebaa680ef7bd0114bf408f010b573e8850cfd9e63d1f043fbb6fc250e08f10457cfa5c4f0086fb1ac8d4e4eb0e70083dfe30d2ef90c8e2e2d68747470733a2f2f616c6963652e6274632e63616c656e6461722e6f70656e74696d657374616d70732e6f7267','hex');
const infoResult = OpenTimestamps.info(fileOts);
console.log(infoResult);
```

Const `fileOts` created from the hex representation of the file `test/incomplete.txt.ots`. You can match the printed result with the file `test/incomplete.txt.ots.info`.

#### Verify
 
Verify the timestamp attestations.

```js
const OpenTimestamps = require('javascript-opentimestamps');
const file = Buffer.from('48656c6c6f20576f726c64210a','hex');
const fileOts = Buffer.from('004f70656e54696d657374616d7073000050726f6f6600bf89e2e884e89294010803ba204e50d126e4674c005e04d82e84c21366780af1f43bd54a37816b6ab34003f1c8010100000001e482f9d32ecc3ba657b69d898010857b54457a90497982ff56f97c4ec58e6f98010000006b483045022100b253add1d1cf90844338a475a04ff13fc9e7bd242b07762dea07f5608b2de367022000b268ca9c3342b3769cdd062891317cdcef87aac310b6855e9d93898ebbe8ec0121020d8e4d107d2b339b0050efdd4b4a09245aa056048f125396374ea6a2ab0709c6ffffffff026533e605000000001976a9140bf057d40fbba6744862515f5b55a2310de5772f88aca0860100000000001976a914f00688ac000000000808f120a987f716c533913c314c78e35d35884cac943fa42cac49d2b2c69f4003f85f880808f120dec55b3487e1e3f722a49b55a7783215862785f4a3acb392846019f71dc64a9d0808f120b2ca18f485e080478e025dab3d464b416c0e1ecb6629c9aefce8c8214d0424320808f02011b0e90661196ff4b0813c3eda141bab5e91604837bdf7a0c9df37db0e3a11980808f020c34bc1a4a1093ffd148c016b1e664742914e939efabe4d3d356515914b26d9e20808f020c3e6e7c38c69f6af24c2be34ebac48257ede61ec0a21b9535e4443277be306460808f1200798bf8606e00024e5d5d54bf0c960f629dfb9dad69157455b6f2652c0e8de810808f0203f9ada6d60baa244006bb0aad51448ad2fafb9d4b6487a0999cff26b91f0f5360808f120c703019e959a8dd3faef7489bb328ba485574758e7091f01464eb65872c975c80808f020cbfefff513ff84b915e3fed6f9d799676630f8364ea2a6c7557fad94a5b5d7880808f1200be23709859913babd4460bbddf8ed213e7c8773a4b1face30f8acfdf093b7050808000588960d73d7190103f7ef15','hex');
const verifyResultPromise = OpenTimestamps.verify(fileOts,file);
verifyResultPromise.then(verifyResult => {
  // return a timestamp if verified, undefined otherwise.
  console.log(verifyResult);
});
```

Const `file` created from the hex representation of the file `test/hello-world.txt.ots` while `fileOts` contains `test/hello-world.txt` 

#### Upgrade

Upgrade incomplete remote calendar timestamps to be indipendently verifiable.

```js
const OpenTimestamps = require('javascript-opentimestamps');
const ots = Buffer.from('004f70656e54696d657374616d7073000050726f6f6600bf89e2e884e89294010805c4f616a8e5310d19d938cfd769864d7f4ccdc2ca8b479b10af83564b097af9f010e754bf93806a7ebaa680ef7bd0114bf408f010b573e8850cfd9e63d1f043fbb6fc250e08f10457cfa5c4f0086fb1ac8d4e4eb0e70083dfe30d2ef90c8e2e2d68747470733a2f2f616c6963652e6274632e63616c656e6461722e6f70656e74696d657374616d70732e6f7267','hex');
const upgradePromise = OpenTimestamps.upgrade(ots);
upgradePromise.then(timestampBytes => {
    if (ots.equals(timestampBytes)) {
      console.log('Timestamp not upgraded');
    } else {
      console.log('Timestamp upgraded');
    }
}).catch(err => {
    console.log(err);
});
```

## License

LGPL3
