#!/usr/bin/env bash
echo --- START TESTING ots-cli.js
echo ">> node ots-cli.js stamp README.md" && node ots-cli.js stamp README.md && rm README.md.ots && \
echo ">> node ots-cli.js upgrade examples/empty.ots" && node ots-cli.js upgrade examples/empty.ots && \
echo ">> node ots-cli.js verify examples/empty.ots" && node ots-cli.js verify examples/empty.ots && \

# Test: stamp input file
echo ">> node ots-cli.js stamp README.md" && node ots-cli.js stamp README.md && (node ots-cli.js info README.md.ots | grep "File sha256 hash") && rm -rf README.md.ots && \
echo ">> node ots-cli.js stamp -a SHA1 README.md" && node ots-cli.js stamp -a SHA1 README.md && (node ots-cli.js info README.md.ots | grep "File sha1 hash") && rm -rf README.md.ots && \
echo ">> node ots-cli.js stamp -a SHA256  README.md" && node ots-cli.js stamp -a SHA256 README.md && (node ots-cli.js info README.md.ots | grep "File sha256 hash") && rm -rf README.md.ots && \
echo ">> node ots-cli.js stamp -a RIPEMD160 README.md" && node ots-cli.js stamp -a RIPEMD160 README.md && (node ots-cli.js info README.md.ots | grep "File ripemd160 hash") && rm -rf README.md.ots && \

# Test: stamp input files
echo ">> node ots-cli.js stamp README.md LICENSE" && \
node ots-cli.js stamp README.md LICENSE && \
(node ots-cli.js info README.md.ots | grep "File sha256 hash") && (node ots-cli.js info README.md.ots | grep "PendingAttestation") && \
(node ots-cli.js info LICENSE.ots | grep "File sha256 hash") && (node ots-cli.js info LICENSE.ots | grep "PendingAttestation") && \
rm -rf README.md.ots LICENSE.ots && \

# Test: stamp input hash
sha1=$(shasum -a 1 README.md | awk '{print $1;}')
sha256=$(shasum -a 256 README.md | awk '{print $1;}')
echo ">> node ots-cli.js stamp -H $sha256" && node ots-cli.js stamp -H $sha256 && (node ots-cli.js info $sha256.ots | grep "File sha256 hash") && rm -rf $sha256.ots && \
echo ">> node ots-cli.js stamp -a SHA1 -H $sha1" && node ots-cli.js stamp -a SHA1 -H $sha1 && (node ots-cli.js info $sha1.ots | grep "File sha1 hash") && rm -rf $sha1.ots && \
echo ">> node ots-cli.js stamp -a SHA256 -H $sha256" && node ots-cli.js stamp -a SHA256 -H $sha256 && (node ots-cli.js info $sha256.ots | grep "File sha256 hash") && rm -rf $sha256.ots && \

# Test: info attestations
echo ">> node ots-cli.js info examples/incomplete.txt.ots" && (node ots-cli.js info examples/incomplete.txt.ots | grep "PendingAttestation") && \
echo ">> node ots-cli.js info examples/hello-world.txt.ots" && (node ots-cli.js info examples/hello-world.txt.ots | grep "BitcoinBlockHeaderAttestation") && \
echo ">> node ots-cli.js info examples/hello-world.txt.eth.ots" && (node ots-cli.js info examples/hello-world.txt.eth.ots | grep "EthereumBlockHeaderAttestation") && \
echo ">> node ots-cli.js info examples/unknown-notary.txt.ots" && (node ots-cli.js info examples/unknown-notary.txt.ots | grep "UnknownAttestation") && \

# Test: upgrade examples/incomplete.txt
echo ">> node ots-cli.js upgrade examples/incomplete.txt.ots" && \
cp examples/incomplete.txt.ots examples/incomplete.txt.ots.old && \
node ots-cli.js upgrade examples/incomplete.txt.ots && \
(node ots-cli.js info examples/incomplete.txt.ots | grep "BitcoinBlockHeaderAttestation") && \
cp examples/incomplete.txt.ots.old examples/incomplete.txt.ots && rm examples/incomplete.txt.ots.bak examples/incomplete.txt.ots.old && \

 echo --- END TESTING ots-cli.js