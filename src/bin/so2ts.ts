
import * as argparse from 'argparse';
const { exec } = require('child_process');

// Parse command line arguments
const parser = new argparse.ArgumentParser({
    description: 'A utility for converting a module to a TypeScript module',
});
parser.add_argument(
    '-b',
    '--binary',
    {
        type: 'str',
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
        type: 'str',
        help: 'set module name',
    }
);
parser.add_argument(
    '--no-content',
    {
        action: 'store_true',
        default: false,
        help: 'flag to exclude content',
    }
);

const args = parser.parse_args();

const cmd = `${__dirname}/so2ts.py -b ${args.binary} -o ${args.output} ${args.name ? `--name ${args.name}` : ''} ${args.no_content ? '--no-content' : ''}`
console.log(`cmd: ${cmd}`);

exec(cmd, (error: { message: any; }, stdout: any, stderr: any) => {
    if (error) {
        console.error(`error: ${error.message}`);
        return;
    }
    if (stderr) {
        console.error(`stderr: ${stderr}`);
        return;
    }
    console.log(`stdout: ${stdout}`);
});


