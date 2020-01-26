import Library from './classes/library';
import { performance } from 'perf_hooks';

async function test (): Promise<object> {
    const file = 'data/adsl.xpt';
    const lib = new Library(file);
    const metadata = await lib.getMetadata();
    const t0 = performance.now();
    const data = lib.read({ rowFormat: 'object', keep: ['usubjid'] });
    console.log(metadata);
    const allObs: Array<Array<string|number>|object> = [];
    for await (const obs of data) {
        allObs.push(obs);
    }
    const t1 = performance.now();
    console.log((t1 - t0).toString() + ' milliseconds.');
    console.log(allObs.length);
    return metadata;
}

test();
