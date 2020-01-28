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
for await (let obs of lib.read({ rowFormat: 'object'})) {
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

# Authors

* [**Dmitry Kolosov**](https://www.linkedin.com/in/dmitry-kolosov-91751413/)
* [**Sergei Krivtcov**](https://www.linkedin.com/in/sergey-krivtsov-677419b4/)

# License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
