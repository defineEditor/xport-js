# xport-js

Library to read in v5/v6 [XPORT files](http://support.sas.com/techsup/technote/ts140.pdf) using Node.js .

## Installation

```sh
npm install xport-js
```

## Usage

```typescript
import Library from 'xport-js';

const lib = new Library('/path/to/file.xpt');
```

### Named exports

```typescript
import Library, { Member, Variable } from 'xport-js';
export type { Options, Header, UniqueValues, VariableMetadata } from 'xport-js';
```

## API

### `new Library(filePath)`

Creates a library instance associated with the XPORT file.

### `getMetadata(format?)`

Parses and returns metadata. Default format is `dataset-json1.1`.

```typescript
// Variable metadata (xport format)
const vars = await lib.getMetadata('xport');
// vars: Array<{ dataset, name, label, length, type, format?, informat? }>

// Dataset-JSON 1.1 metadata
const meta = await lib.getMetadata();
// meta: { name, label, records, columns, datasetJSONCreationDateTime, ... }
```
Returns a Promise resolving to metadata in one of the following formats:

- `format = 'xport'` — returns `VariableMetadata[]`
- `format = 'dataset-json1.1'` (default) — returns `DatasetJsonMetadata` (per the Dataset-JSON 1.1 spec)


### `read(options?)`

Async generator that yields observations row-by-row without loading the entire dataset into memory.

```typescript
for await (const row of lib.read({ rowFormat: 'object' })) {
  console.log(row);
}
```

Returns an async generator that yields rows in the specified format.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dsNames` | `string[]` | all datasets | Dataset names to read |
| `rowFormat` | `'array' \| 'object'` | `'array'` | Output format — array of values or key-value object |
| `keep` | `string[]` | `[]` | Variables to include (case-insensitive) |
| `skipHeader` | `boolean` | `false` | Omit the header row |
| `encoding` | `BufferEncoding` | `'binary'` | String encoding (see [Node.js encodings](https://nodejs.org/api/buffer.html#buffer_buffers_and_character_encodings)) |
| `filter` | `Filter \| BasicFilter` | — | Filter observations using [js-array-filter](https://github.com/defineEditor/js-array-filter) |
| `roundPrecision` | `number` | — | Round numeric values to N decimal places |

### `getData(props)`

Reads all observations into memory (for large datasets prefer `read`).

Returns a Promise resolving to an object containing:
- `data`: Array of rows in the specified format.
- `lastRow`: Index of the last row returned (useful for pagination).
- `endReached`: Boolean indicating if the end of the dataset has been reached.

```typescript
const result = await lib.getData({
  start: 0,              // first row to return
  length: 100,           // max rows to return
  type: 'object',        // 'array' | 'object'
  filterColumns: [],     // only these columns
  filter: { ... },       // js-array-filter filter
  skipHeader: true,
  roundPrecision: 2,
});
// result: { data: Array<row>, lastRow: number, endReached: boolean }
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `start` | `number` | `0` | Index of the first row to return (0-based) |
| `length` | `number` | all rows | Maximum number of rows to return |
| `type` | `'array' \| 'object'` | | `'array'` | Output format — array of values or key-value object |
| `filterColumns` | `string[]` | `[]` | Only include these columns (case-insensitive) |
| `filter` | `Filter \| BasicFilter` | — | Filter observations using [js-array-filter](https://github.com/defineEditor/js-array-filter) |
| `skipHeader` | `boolean` | `false` | Omit the header row |
| `roundPrecision` | `number` | — | Round numeric values to N decimal places (optional) |

### `getUniqueValues(props)`

Returns unique values for specified columns.
```typescript
const unique = await lib.getUniqueValues({
  columns: ['AGE', 'SEX', 'RACE'],
  limit: 10,            // max unique values per column (0 = no limit)
  addCount: true,       // include value counts
  sort: true,           // sort values
  roundPrecision: 0,    // round numeric values to integer
});
// { AGE: { values: [...], counts: { '45': 3, ... } }, ... }
```

Returns a Promise resolving to an object where each key is a column name and the value is an object with:
- `values`: Array of unique values for that column.
- `counts`: (if `addCount` is true) Object mapping value to count.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `columns` | `string[]` | — | List of variable names to get unique values for |
| `limit` | `number` | `0` | Maximum number of unique values per column (0 = no limit) |
| `addCount` | `boolean` | `false` | Whether to include counts for each unique value |
| `sort` | `boolean` | `false` | Whether to sort the unique values |
| `roundPrecision` | `number` | — | Rounds numeric values to the specified precision (optional) |

### `toCsv(outDir, options?)`

Writes each dataset to a separate CSV file in `outDir`.

```typescript
await lib.toCsv('./output', { skipHeader: false });
```

# Authors

* [**Dmitry Kolosov**](https://www.linkedin.com/in/dmitry-kolosov-91751413/)
* [**Sergei Krivtcov**](https://www.linkedin.com/in/sergey-krivtsov-677419b4/)

# License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

