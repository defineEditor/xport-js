import Library from '../src/classes/library';

interface AlfalfaMetadata {
    dataset: string
    label: string
    length: number
    name: string
    type: string
}

interface AlfalfaRecord {
    POP: string
    SAMPLE: string
    REP: string
    SEEDWT: string
    HARV1: string
    HARV2: string
}

const path = `${__dirname}/Alfalfa.xpt`;

describe('Library default checks', () => {
    it('Library type should be a function', () => {
        expect(typeof Library).toBe('function');
    });
});

describe('Can read an xpt file', () => {
    it('Library should have pathToFile field', () => {
        const lib = new Library(path);
        expect(lib.pathToFile).toBe(path);
    });

    it('Library should provide metadata', async () => {
        const lib = new Library(path);

        const metadata: AlfalfaMetadata[] = await lib.getMetadata() as AlfalfaMetadata[];
        expect(metadata.length).toBe(6);

        const firstElement = metadata[0];
        expect(firstElement.dataset).toBe('SPEC');
        expect(firstElement.name).toBe('POP');
        expect(firstElement.label).toBe('');
        expect(firstElement.type).toBe('Char');
    });
});

describe('Can read xpt records using await iterable', () => {
    it('Records read are valid', async () => {
        const lib = new Library(path);

        const records = [];
        for await (const obs of lib.read({ rowFormat: 'object' })) {
            records.push(obs);
        }
        const headers = records.shift() as AlfalfaRecord;
        expect(headers.POP).toBe('');
        expect(headers.SAMPLE).toBe('');
        expect(headers.REP).toBe('');
        expect(headers.SEEDWT).toBe('');
        expect(headers.HARV1).toBe('');
        expect(headers.HARV2).toBe('');

        const firstElement: AlfalfaRecord = records[0] as AlfalfaRecord;
        expect(firstElement.POP).toBe('min');
        expect(firstElement.SAMPLE).toBe(0);
        expect(firstElement.REP).toBe(1);
        expect(firstElement.SEEDWT).toBe(64);
        expect(firstElement.HARV1).toBe(171.7);
        expect(firstElement.HARV2).toBe(180.3);

        expect(records.length).toBe(40);
    });
});

describe('Can read xpt records using await function', () => {
    it('Records read are valid', async () => {
        const lib = new Library(path);

        const records = await lib.getData({ rowFormat: 'object' });
        const headers = records.shift() as AlfalfaRecord;
        expect(headers.POP).toBe('');
        expect(headers.SAMPLE).toBe('');
        expect(headers.REP).toBe('');
        expect(headers.SEEDWT).toBe('');
        expect(headers.HARV1).toBe('');
        expect(headers.HARV2).toBe('');

        const firstElement: AlfalfaRecord = records[0] as AlfalfaRecord;
        expect(firstElement.POP).toBe('min');
        expect(firstElement.SAMPLE).toBe(0);
        expect(firstElement.REP).toBe(1);
        expect(firstElement.SEEDWT).toBe(64);
        expect(firstElement.HARV1).toBe(171.7);
        expect(firstElement.HARV2).toBe(180.3);

        expect(records.length).toBe(40);
    });
});
