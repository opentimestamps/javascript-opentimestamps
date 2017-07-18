#!/usr/bin/env bash
echo --- START TESTING ots-cli.js
node ots-cli.js stamp README.md && rm README.md.ots && node ots-cli.js upgrade examples/empty.ots && node ots-cli.js verify examples/empty.ots && echo --- END TESTING ots-cli.js