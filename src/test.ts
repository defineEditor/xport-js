import { createReadStream } from 'fs';
import Library from './classes/library';
import { performance } from 'perf_hooks';

async function test(): Promise<object> {
    const file = 'data/adsl.xpt';
    let lib = new Library(file);
    let metadata = await lib.getMetadata();
    let t0 = performance.now();
    let data = lib.read({ rowFormat: 'object', keep: ['usubjid'] });
    console.log(metadata);
    let allObs: Array<any> = [];
    for await (const obs of data) {
        allObs.push(obs);
    }
    let sample = allObs.slice(10);
    let t1 = performance.now();
    console.log((t1 - t0) + " milliseconds.");
    console.log(allObs.length);
    return metadata;
}

test();