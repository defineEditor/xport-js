import Library from '../src/classes/library';
import Filter, { BasicFilter, ColumnMetadata } from 'js-array-filter';

interface DsMetadata {
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
const pathADTTE = `${__dirname}/adtte.xpt`;

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

        const metadata: DsMetadata[] = await lib.getMetadata() as DsMetadata[];
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
        expect(typeof metadata.sourceSystem?.name).toBe('string');
        expect(typeof metadata.sourceSystem?.version).toBe('string');

        // Check datetime fields
        expect(metadata.datasetJSONCreationDateTime).toBeDefined();
        expect(metadata.dbLastModifiedDateTime).toBeDefined();
    });
});

describe('Can read xpt records using await iterable', () => {
    it('Records read are valid', async () => {
        const lib = new Library(path);

        const records: (string | number | object)[] = [];
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
        const headers = records.data.shift() as AlfalfaRecord;
        expect(headers.POP).toBe('');
        expect(headers.SAMPLE).toBe('');
        expect(headers.REP).toBe('');
        expect(headers.SEEDWT).toBe('');
        expect(headers.HARV1).toBe('');
        expect(headers.HARV2).toBe('');

        const firstElement: AlfalfaRecord = records.data[0] as AlfalfaRecord;
        expect(firstElement.POP).toBe('min');
        expect(firstElement.SAMPLE).toBe(0);
        expect(firstElement.REP).toBe(1);
        expect(firstElement.SEEDWT).toBe(64);
        expect(firstElement.HARV1).toBe(171.7);
        expect(firstElement.HARV2).toBe(180.3);

        expect(records.data.length).toBe(40);
    });

    it('Should round numeric values according to precision', async () => {
        const lib = new Library(path);
        const records = await lib.getData({
            type: 'object',
            roundPrecision: 1
        });

        const firstElement: AlfalfaRecord = records.data[1] as AlfalfaRecord;
        expect(firstElement.HARV1).toBe(138.2);  // Original value preserved

        const roundedRecords = await lib.getData({
            type: 'object',
            roundPrecision: 0
        });

        const firstRoundedElement: AlfalfaRecord = roundedRecords.data[1] as AlfalfaRecord;
        expect(firstRoundedElement.HARV1).toBe(138);  // Rounded to nearest integer
    });

    it('Should filter records correctly', async () => {
        const lib = new Library(path);
        const columns = await lib.getMetadata() as DsMetadata[];

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
        expect(records.data.length).toBe(20);
        expect(records.lastRow).toBe(39);
        expect(records.endReached).toBe(true);
    });
    it('Should set lastRow and endReached', async () => {
        const lib = new Library(path);
        const columns = await lib.getMetadata() as DsMetadata[];

        const updatedColumns: ColumnMetadata[] = columns.map((column) => {
            return ({ ...column, dataType: column.type } as  ColumnMetadata);
        });

        const filter = new Filter("xpt", updatedColumns, {
            conditions: [
                { variable: "POP", operator: "eq", value: 'min' }
            ],
            connectors: [],
        });

        const records = await lib.getData({ type: 'array', filter, length: 18 });
        expect(records.data.length).toBe(18);
        expect(records.lastRow).toBe(32);
        expect(records.endReached).toBe(false);
    });
    it('Should filter records correctly with BasicFilter', async () => {
        const lib = new Library(path);


        const filter = {
            conditions: [
                { variable: "POP", operator: "eq", value: 'MAX' },
                { variable: "SAMPLE", operator: "ge", value: 3 },
            ],
            connectors: ["and"],
        } as BasicFilter;

        const records = await lib.getData({ type: 'array', filter });
        expect(records.data.length).toBe(20);
    });
});

describe('Test parseHeader method', () => {
    it('Should correctly parse the header', async () => {
        const lib = new Library(path);
        const _metadata: DsMetadata[] = await lib.getMetadata() as DsMetadata[];

        const header = lib.getHeader();
        expect(header).toMatchSnapshot();
    });
});

describe('Test missing values', () => {
    it('Should read missing values as null', async () => {
        const lib = new Library(pathADTTE);
        const columns = await lib.getMetadata() as DsMetadata[];
        const updatedColumns: ColumnMetadata[] = columns.map((column) => {
            return ({ ...column, dataType: column.type } as  ColumnMetadata);
        });

        const filter = new Filter("xpt", updatedColumns, {
            conditions: [
                { variable: "SRCSEQ", operator: "eq", value: null },
            ],
            connectors: [],
        });
        const records = await lib.getData({ type: 'array', filter });
        expect(records.data.length).toBe(102);
    });
    it('Should read missing values as null when rounding is enabled', async () => {
        const lib = new Library(pathADTTE);
        const columns = await lib.getMetadata() as DsMetadata[];
        const updatedColumns: ColumnMetadata[] = columns.map((column) => {
            return ({ ...column, dataType: column.type } as  ColumnMetadata);
        });

        const filter = new Filter("xpt", updatedColumns, {
            conditions: [
                { variable: "SRCSEQ", operator: "eq", value: null },
            ],
            connectors: [],
        });
        const records = await lib.getData({ type: 'array', filter, roundPrecision: 10 });
        expect(records.data.length).toBe(102);
    });
});

describe('Test getUniqueValues method', () => {
    it('Should return unique values for specified columns (ADTTE)', async () => {
        const lib = new Library(pathADTTE);
        const unique = await lib.getUniqueValues({ columns: ['PARAMCD', 'AGE', 'SEX', 'RACE'] });

        // Should have keys for each requested column
        expect(Object.keys(unique)).toEqual(expect.arrayContaining(['PARAMCD', 'AGE', 'SEX', 'RACE']));

        expect(Array.isArray(unique.PARAMCD.values)).toBe(true);
        expect(unique.PARAMCD.values.length).toBeGreaterThan(0);
        expect(unique.PARAMCD.values).toEqual(['TTDE']);

        expect(Array.isArray(unique.AGE.values)).toBe(true);
        expect(unique.AGE.values.length).toEqual(36);
        expect(typeof unique.AGE.values[0]).toBe('number');

        // SEX should have 'M' and 'F'
        expect(unique.SEX.values.sort()).toEqual(['F', 'M']);

        // RACE should have the specified values
        expect(unique.RACE.values).toEqual(
            expect.arrayContaining([
                'WHITE',
                'BLACK OR AFRICAN AMERICAN',
                'AMERICAN INDIAN OR ALASKA NATIVE'
            ])
        );
    });

    it('Should respect the limit parameter (ADTTE)', async () => {
        const lib = new Library(pathADTTE);
        const unique = await lib.getUniqueValues({ columns: ['AGE'], limit: 10 });
        expect(unique.AGE.values.length).toEqual(10);
    });

    it('Should add counts when addCount is true (ADTTE)', async () => {
        const lib = new Library(pathADTTE);
        const unique = await lib.getUniqueValues({ columns: ['RACE'], addCount: true });
        expect(unique.RACE.counts).toBeDefined();
        // Check that counts are correct
        expect(unique.RACE.counts).toMatchSnapshot();
    });

    it('Should sort unique values when sort is true (ADTTE)', async () => {
        const lib = new Library(pathADTTE);
        const unique = await lib.getUniqueValues({ columns: ['AGE'], sort: true });
        const sorted = [...unique.AGE.values].sort((a, b) => Number(a) - Number(b));
        expect(unique.AGE.values).toEqual(sorted);
    });

    it('Should reject if column does not exist (ADTTE)', async () => {
        const lib = new Library(pathADTTE);
        await expect(lib.getUniqueValues({ columns: ['NOT_A_COLUMN'] }))
            .rejects
            .toThrow(/not found/);
    });
});


