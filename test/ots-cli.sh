#!/usr/bin/env bash
echo --- START TESTING ots-cli.js
echo ">> node ots-cli.js stamp README.md" && node ots-cli.js stamp README.md && rm README.md.ots && \
echo ">> node ots-cli.js upgrade examples/empty.ots" && node ots-cli.js upgrade examples/empty.ots && \
echo ">> node ots-cli.js verify examples/empty.ots" && node ots-cli.js verify examples/empty.ots && \

# Test: stamp input file
echo ">> node ots-cli.js stamp README.md" && node ots-cli.js stamp README.md && (node ots-cli.js info README.md.ots | grep "File sha256 hash") && rm -rf README.md.ots && \
echo ">> node ots-cli.js stamp -a sha1 README.md" && node ots-cli.js stamp -a sha1 README.md && (node ots-cli.js info README.md.ots | grep "File sha1 hash") && rm -rf README.md.ots && \
echo ">> node ots-cli.js stamp -a sha256  README.md" && node ots-cli.js stamp -a sha256 README.md && (node ots-cli.js info README.md.ots | grep "File sha256 hash") && rm -rf README.md.ots && \
echo ">> node ots-cli.js stamp -a ripemd160 README.md" && node ots-cli.js stamp -a ripemd160 README.md && (node ots-cli.js info README.md.ots | grep "File ripemd160 hash") && rm -rf README.md.ots && \

# Test: stamp input files
echo ">> node ots-cli.js stamp README.md LICENSE" && \
node ots-cli.js stamp README.md LICENSE && \
(node ots-cli.js info README.md.ots | grep "File sha256 hash") && (node ots-cli.js info README.md.ots | grep "PendingAttestation") && \
(node ots-cli.js info LICENSE.ots | grep "File sha256 hash") && (node ots-cli.js info LICENSE.ots | grep "PendingAttestation") && \
rm -rf README.md.ots LICENSE.ots && \

# Test: stamp input hash
SHA1=$(shasum -a 1 README.md | awk '{print $1;}') && \
SHA256=$(shasum -a 256 README.md | awk '{print $1;}') && \
echo ">> node ots-cli.js stamp -d ${SHA256}" && node ots-cli.js stamp -d ${SHA256} && (node ots-cli.js info ${SHA256}.ots | grep "File sha256 hash") && rm -rf ${SHA256}.ots && \
echo ">> node ots-cli.js stamp -a sha256 -d ${SHA256}" && node ots-cli.js stamp -a sha256 -d ${SHA256} && (node ots-cli.js info ${SHA256}.ots | grep "File sha256 hash") && rm -rf ${SHA256}.ots && \
echo ">> node ots-cli.js stamp -a sha1 -d ${SHA1}" && node ots-cli.js stamp -a sha1 -d ${SHA1} && (node ots-cli.js info ${SHA1}.ots | grep "File sha1 hash") && rm -rf ${SHA1}.ots && \

# Test: info attestations
echo ">> node ots-cli.js info examples/incomplete.txt.ots" && (node ots-cli.js info examples/incomplete.txt.ots | grep "PendingAttestation") && \
echo ">> node ots-cli.js info examples/hello-world.txt.ots" && (node ots-cli.js info examples/hello-world.txt.ots | grep "BitcoinBlockHeaderAttestation") && \
echo ">> node ots-cli.js info examples/unknown-notary.txt.ots" && (node ots-cli.js info examples/unknown-notary.txt.ots | grep "UnknownAttestation") && \

# Test: upgrade examples/incomplete.txt and check double upgrade
echo ">> node ots-cli.js upgrade examples/incomplete.txt.ots" && \
cp examples/incomplete.txt.ots examples/incomplete.txt.ots.old && \
node ots-cli.js upgrade examples/incomplete.txt.ots && \
(node ots-cli.js info examples/incomplete.txt.ots | grep "BitcoinBlockHeaderAttestation") && \
cp examples/incomplete.txt.ots examples/incomplete.txt.ots.upgraded && \
node ots-cli.js upgrade examples/incomplete.txt.ots && \
diff examples/incomplete.txt.ots examples/incomplete.txt.ots.upgraded && \
cp examples/incomplete.txt.ots.old examples/incomplete.txt.ots && rm examples/incomplete.txt.ots.bak examples/incomplete.txt.ots.old examples/incomplete.txt.ots.upgraded && \

# Test: verify ots
HELLOWORLD="Success! Bitcoin block 358391 attests existence as of" && \
HELLOWORLD_HASH="03ba204e50d126e4674c005e04d82e84c21366780af1f43bd54a37816b6ab340" && \
echo ">> node ots-cli.js verify examples/hello-world.txt.ots" && node ots-cli.js verify examples/hello-world.txt.ots | grep "${HELLOWORLD}" && \
echo ">> node ots-cli.js verify -f examples/hello-world.txt examples/hello-world.txt.ots" && node ots-cli.js verify -f examples/hello-world.txt examples/hello-world.txt.ots | grep "${HELLOWORLD}" && \
echo ">> node ots-cli.js verify -d ${HELLOWORLD_HASH} examples/hello-world.txt.ots" && node ots-cli.js verify -d ${HELLOWORLD_HASH} examples/hello-world.txt.ots | grep "${HELLOWORLD}" && \
echo ">> node ots-cli.js verify -d ${HELLOWORLD_HASH} -a sha256 examples/hello-world.txt.ots" && node ots-cli.js verify -d ${HELLOWORLD_HASH} -a sha256 examples/hello-world.txt.ots | grep "${HELLOWORLD}" && \

# Test: upgrade pending attestation with different calendar url
echo ">> node ots-cli.js upgrade -c https://finney.calendar.eternitywall.com examples/incomplete.txt.ots" && \
cp examples/incomplete.txt.ots examples/incomplete.txt.ots.old && \
node ots-cli.js upgrade -c https://finney.calendar.eternitywall.com examples/incomplete.txt.ots && \
diff examples/incomplete.txt.ots examples/incomplete.txt.ots.old && \
cp examples/incomplete.txt.ots.old examples/incomplete.txt.ots && \
rm examples/incomplete.txt.ots.old && \

# Test: bad attestation
echo ">> node ots-cli.js verify examples/bad-stamp.txt.ots" && \
node ots-cli.js verify examples/bad-stamp.txt.ots | grep "Digest does not match merkleroot" && \

echo --- END TESTING ots-cli.js
