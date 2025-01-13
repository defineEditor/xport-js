import Library from '../src/classes/library';
import Filter, { ColumnMetadata } from 'js-array-filter';

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

    it('Library should provide metadata in dataset-json1.1 format', async () => {
        const lib = new Library(path);

        const metadata = await lib.getMetadata('dataset-json1.1');

        // Check required dataset-json1.1 properties
        expect(metadata.name).toBe('SPEC');
        expect(metadata.records).toBe(40);
        expect(Array.isArray(metadata.columns)).toBe(true);
        expect(metadata.columns.length).toBe(6);

        // Check first column structure
        const firstColumn = metadata.columns[0];
        expect(firstColumn.itemOID).toBe('POP');
        expect(firstColumn.name).toBe('POP');
        expect(firstColumn.dataType).toBe('string');
        expect(typeof firstColumn.length).toBe('number');

        // Check source system info
        expect(metadata.sourceSystem).toBeDefined();
        expect(typeof metadata.sourceSystem.name).toBe('string');
        expect(typeof metadata.sourceSystem.version).toBe('string');

        // Check datetime fields
        expect(metadata.datasetJSONCreationDateTime).toBeDefined();
        expect(metadata.dbLastModifiedDateTime).toBeDefined();
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

        const records = await lib.getData({ type: 'object', skipHeader: false });
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

    it('Should round numeric values according to precision', async () => {
        const lib = new Library(path);
        const records = await lib.getData({
            type: 'object',
            roundPrecision: 1
        });

        const firstElement: AlfalfaRecord = records[1] as AlfalfaRecord;
        expect(firstElement.HARV1).toBe(138.2);  // Original value preserved

        const roundedRecords = await lib.getData({
            type: 'object',
            roundPrecision: 0
        });

        const firstRoundedElement: AlfalfaRecord = roundedRecords[1] as AlfalfaRecord;
        expect(firstRoundedElement.HARV1).toBe(138);  // Rounded to nearest integer
    });

    it('Should filter records correctly', async () => {
        const lib = new Library(path);
        const columns = await lib.getMetadata() as AlfalfaMetadata[];

        const updatedColumns: ColumnMetadata[] = columns.map((column) => {
            return ({ ...column, dataType: column.type } as  ColumnMetadata);
        });

        const filter = new Filter("xpt", updatedColumns, {
            conditions: [
                { variable: "POP", operator: "eq", value: 'MAX' },
                { variable: "SAMPLE", operator: "ge", value: 3 },
            ],
            connectors: ["and"],
        });

        const records = await lib.getData({ type: 'array', filter });
        expect(records.length).toBe(20);
    });
});

describe('Test parseHeader method', () => {
    it('Should correctly parse the header', async () => {
        const lib = new Library(path);
        const _metadata: AlfalfaMetadata[] = await lib.getMetadata() as AlfalfaMetadata[];

        const header = lib.getHeader();
        expect(header).toMatchSnapshot();
    });
});
