#!/usr/bin/env node

import * as argparse from 'argparse';

// Parse command line arguments
const parser = new argparse.ArgumentParser({
    description: 'A utility for converting a module to a TypeScript module',
});
parser.add_argument(
    '-b',
    '--binary',
    {
        type: 'string',
        required: true,
        help: 'path to the binary file',
    }
);
parser.add_argument(
    '-o',
    '--output',
    {
        default: '/tmp/tt.ts',
        help: 'path to the output file',
    }
);
parser.add_argument(
    '-n',
    '--name',
    {
        type: 'string',
        help: 'set module name',
    }
);
parser.add_argument(
    '--no-content',
    {
        action: 'storeTrue',
        default: false,
        help: 'flag to exclude content',
    }
);

const args = parser.parse_args();

// Print command line arguments
console.log(args);
