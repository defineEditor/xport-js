xport-js
===========
Library to read in v5/v6 [XPORT files](http://support.sas.com/techsup/technote/ts140.pdf) using Node.js .
# Installation
To add xport-js to your project, run
```
npm install xport-js
```
# Usage and Documentation
See the library [documentation](https://defineeditor.github.io/xport-js/index.html) for details on methods and options available.

```
import Library from 'xport-js';
// Create a library instance
const lib = new Library('/path/to/ds.xpt');
// Get variable metadata
const metadata = await lib.getMetadata();
// Get dataset records as objects
let records = [];
for await (let obs of lib.read({ rowFormat: 'object' })) {
    records.push(obs);
}
// Output contents of XPT file to CSV file(s)
await lib.toCsv('/outDir/')
```
##  Library.read method
This method return AsyncIterable which can be used in [for await ... of](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of) statement.
```
lib.read(options);
```
* **dsNames** List of dataset names to read, by default all datasets are read.
* **rowFormat** [default=array] Output observation format.
*array*: [value1, value2, value3, ...]
*object*: { var1: value1, var: value2, var3: value3, ... }
* **keep** [default=[]] Array of variables to keep in the result (case-insensitive)
* **skipHeader** [default=false] Flag to control whether the first record contains variable names.
* **encoding** [default=binary] String encoding, default is latin1 (binary). See the list of [encodings](https://nodejs.org/api/buffer.html#buffer_buffers_and_character_encodings) supported by Node.js.
##  Library.toCsv method
Creates CSV file(s) in the outDir.
```
lib.read(outDir, options);
```
See read method options description for details.

## Library.getUniqueValues

Returns unique values for specified columns in the dataset.

### Usage

```typescript
const lib = new Library('path/to/file.xpt');
const unique = await lib.getUniqueValues({
  columns: ['AGE', 'SEX', 'RACE'],
  limit: 10,           // Optional: max number of unique values per column (0 = no limit)
  addCount: true,      // Optional: include counts for each unique value
  sort: true,          // Optional: sort unique values
  roundPrecision: 0    // Optional: round numeric values
});
```

### Parameters

- `columns` (string[]): List of variable names to get unique values for.
- `limit` (number, optional): Maximum number of unique values per column (default: 0, no limit).
- `addCount` (boolean, optional): Whether to include counts for each unique value (default: false).
- `sort` (boolean, optional): Whether to sort the unique values (default: false).
- `roundPrecision` (number, optional): Rounds numeric values to the specified precision.

### Returns

A Promise resolving to an object where each key is a column name and the value is an object with:
- `values`: Array of unique values for that column.
- `counts`: (if `addCount` is true) Object mapping value to count.

# Authors

* [**Dmitry Kolosov**](https://www.linkedin.com/in/dmitry-kolosov-91751413/)
* [**Sergei Krivtcov**](https://www.linkedin.com/in/sergey-krivtsov-677419b4/)

# License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
