import Member from './member';
import { Header, Options } from '../types/library';
import { DatasetMetadata as DatasetJsonMetadata, ItemDescription as DatasetJsonColumn } from 'js-stream-dataset-json';
import { createReadStream, createWriteStream } from 'fs';
import Filter, { ItemDataArray } from 'js-array-filter';
import path from 'path';

/**
 * @typedef {"array" | "object" } rowFormat
 */

class Library {
    members: Member[];
    created: object;
    modified: object;
    sasVersion: string;
    osVersion: string;
    pathToFile: string;
    header: Header;
    /**
     * Library associated with the XPORT file.
     * @param pathToFile Path to XPT file.
     * @param options Options.
     */
    constructor (pathToFile: string) {
        this.pathToFile = pathToFile;
        this.members = [];
        this.header = {
            sasSymbol: [],
            sasLib: '',
            sasVer: '',
            sasOs: '',
            sasCreate: '',
            sasModified: ''
        };
    }

    /**
     * Parse Library Header information.
     *     # 1. The first header record:
     *
     *    HEADER RECORD*******LIBRARY HEADER RECORD!!!!!!!
     *    000000000000000000000000000000
     *
     *  2. The first real header record ... as a C structure:
     *
     *    struct REAL_HEADER {
     *       char sas_symbol[2][8];       / "SAS", twice             /
     *       char saslib[8];              / "SASLIB"                 /
     *       char sasver[8];              / version of SAS used      /
     *       char sas_os[8];              / operating system used    /
     *       char blanks[24];
     *       char sas_create[16];         / datetime created         /
     *       };
     *
     *  3. Second real header record
     *
     *        ddMMMyy:hh:mm:ss
     *
     *     In this record, the string is the datetime modified. Most
     *     often, the datetime created and datetime modified will always
     *     be the same. Pad with ASCII blanks to 80 bytes. Note that only
     *     a 2-digit year appears. If any program needs to read in this
     *     2-digit year, be prepared to deal with dates in the 1900s or
     *     the 2000s.
     * @param data Raw header - 3x80 bytes.
     */
    private parseHeader (dataBuffer: Buffer): void {
        // Skip first 80 bytes till the first real header record
        const headerBuffer = dataBuffer.subarray(80, 3 * 80);

        const sasSymbol1 = headerBuffer.subarray(0, 8).toString('ascii').trim();
        const sasSymbol2 = headerBuffer.subarray(8, 16).toString('ascii').trim();
        const sasLib = headerBuffer.subarray(16, 24).toString('ascii').trim();
        const sasVer = headerBuffer.subarray(24, 32).toString('ascii').trim();
        const sasOs = headerBuffer.subarray(32, 40).toString('ascii').trim();
        const sasCreate = headerBuffer.subarray(64, 80).toString('ascii').trim();
        const sasModified = headerBuffer.subarray(80, 2 * 80).toString('ascii').trim();

        this.header.sasSymbol = [sasSymbol1, sasSymbol2];
        this.header.sasLib = sasLib;
        this.header.sasVer = sasVer;
        this.header.sasOs = sasOs;
        this.header.sasCreate = sasCreate;
        this.header.sasModified = sasModified;
    }

    public getHeader (): Header {
        return this.header;
    }

    private parseMembers (data: Buffer, obsStart: number): void {
        const member = new Member(obsStart);
        member.parseRaw(data);
        this.members.push(member);
    }

    /**
     * Get metadata information from XPORT file.
     */
    public async getMetadata<T extends "xport" | "dataset-json1.1">(
        format: T = "xport" as T
    ): Promise<T extends "dataset-json1.1" ? DatasetJsonMetadata : object> {
        // Get header of the XPT containing metadata
        let data = Buffer.from([]);
        const stream = createReadStream(this.pathToFile);
        // Position of the first observation in the dataset;
        let obsStart: number;
        for await (const chunk of stream) {
            data = Buffer.concat([data, chunk]);
            // Stop reading the header when the first observatin is met
            const obsString = data.toString('binary').indexOf('HEADER RECORD*******OBS     HEADER RECORD!!!!!!!000000000000000000000000000000');
            if (obsString >= 0) {
                obsStart = obsString + 80;
                break;
            }
        }
        // Parse header - first 3x80 bytes
        this.parseHeader(data.subarray(0, 3 * 80));
        // Parse members - the rest
        this.parseMembers(data.subarray(3 * 80), obsStart);

        const result: object[] = [];
        Object.values(this.members).forEach((member: Member) => {
            member.variableOrder.forEach((varName: string) => {
                const variable = member.variables[varName];
                const varAttrs: { [key: string]: string|null|number } = {
                    dataset: member.name,
                    name: variable.name,
                    label: variable.label,
                    length: variable.length,
                    type: variable.type,
                };
                if (variable.formatName !== '') {
                    varAttrs.format = variable.formatName + variable.formatW + '.';
                    // Avoid formats like DATE9.0
                    if (variable.formatD !== '0') {
                        varAttrs.format += variable.formatD;
                    }
                }
                if (variable.informatName !== '') {
                    varAttrs.informat = variable.informatName + variable.informatW + '.';
                    if (variable.informatD !== '0') {
                        varAttrs.informat += variable.informatD;
                    }
                }
                result.push(varAttrs);
            });
        });

        if (format === 'xport') {
            return result as T extends "dataset-json1.1" ? DatasetJsonMetadata : object;
        } else if (format === 'dataset-json1.1') {
            if (this.members.length !== 1) {
                // throw(new Error('format only supports single dataset files'));
            }
            const currentMember = this.members[0];
            const records = currentMember.getRecordsNum(this.pathToFile);

            const updatedColumns: DatasetJsonColumn[] = result.map((column: { [key: string]: string }) => {
                const updateType = column.type === 'Char' ? 'string' : 'double';
                const updatedColumn: DatasetJsonColumn = {
                    itemOID: column.name,
                    name: column.name,
                    label: column.label,
                    dataType: updateType,
                    length: parseInt(column.length),
                    displayFormat: column.format,
                };
                return updatedColumn;
            });

            // Format metadata similar to Dataset-JSON 1.1 spec
            const djMetadata: DatasetJsonMetadata = {
                datasetJSONCreationDateTime: currentMember.created,
                datasetJSONVersion: '',
                records,
                name: currentMember.name,
                label: currentMember.label,
                columns: updatedColumns,
                dbLastModifiedDateTime: currentMember.modified,
                sourceSystem: {
                    name: `${this.header.sasSymbol[0]} ${this.header.sasOs}`,
                    version: this.header.sasVer,
                }

            };
            return djMetadata;
        }
    }

    private getHeaderRecord (member: Member, options: Options): string[]|object {
        // If keep is used, flag which variables to skip
        let keep = options?.keep !== undefined ? options.keep : [];
        keep = keep.map(varName => varName.toUpperCase());
        const skip: boolean[] = [];
        member.variableOrder.forEach((varName: string) => {
            if (keep.length > 0 && !keep.includes(varName.toUpperCase())) {
                skip.push(true);
            } else {
                skip.push(false);
            }
        });
        if (options?.rowFormat === 'object') {
            const header: { [key: string]: string } = {};
            member.variableOrder.forEach((varName: string, index: number) => {
                if (!skip[index]) {
                    header[varName] = member.variables[varName].label;
                }
            });
            return header;
        } else {
            const header: string[] = [];
            member.variableOrder.forEach((varName: string, index: number) => {
                if (!skip[index]) {
                    header.push(varName);
                }
            });
            return header;
        }
    }

    /**
     * Read observations as async iterable.
     * @param options Read options.
     * - **dsNames** List of dataset names to read, by default all datasets are read.
     * - **rowFormat** [default=array] Output observation format.
     * <br> array: [value1, value2, value3, ...]
     * <br> object: { var1: value1, var: value2, var3: value3, ... }
     * - **keep** [default=[]] Array of variables to keep in the result (case-insensitive)
     * - **skipHeader** [default=false] Flag to control whether the first record contains variable names.
     * - **encoding** [default=binary] String encoding, default is latin1 (binary).
     * See the list of [encodings](https://nodejs.org/api/buffer.html#buffer_buffers_and_character_encodings) supported by Node.js.
    */
    public async * read (options?: Options): AsyncIterable<Array<number|string>|object> {
        // Check if metadata already parsed
        if (Object.keys(this.members).length === 0) {
            await this.getMetadata();
        }

        for (let i = 0; i < Object.keys(this.members).length; i++) {
            const member = Object.values(this.members)[i];
            // Output header
            if (!options?.skipHeader) {
                yield this.getHeaderRecord(member, options);
            }
            for await (const obs of member.read(this.pathToFile, options)) {
                yield obs;
            }
        }
        /* TODO Add multiple dataset case
        Object.values(this.members).forEach((member: Member) => {
            let result = await member.read(this.pathToFile);
        });
        */
        return [];
    }

    /**
     * Get all observations. This method will load all records into memory, for large datasets, the read method is suggested.
     * @param options Read options. See read method options for details
     */
    public async getData(props: {
        start?: number;
        length?: number;
        type?: "object" | "array";
        filterColumns?: string[];
        filter?: Filter;
        skipHeader?: boolean;
        roundPrecision?: number;
    }): Promise<Array<Array<number|string>|object>> {
        // Check if metadata already parsed
        const { start = 0, length, type = 'array', filter, skipHeader = true, filterColumns, roundPrecision } = props;

        const isFiltered = filter !== undefined;

        if (Object.keys(this.members).length === 0) {
            await this.getMetadata();
        }

        // Form options;
        const options: Options = {
            rowFormat: type,
            keep: filterColumns,
            skipHeader: skipHeader,
            filter: filter,
            roundPrecision,
        };

        let currentObs = 0;

        const result = [];
        for (let i = 0; i < Object.keys(this.members).length; i++) {
            const member = Object.values(this.members)[i];
            // Output header
            if (!skipHeader) {
                result.push(this.getHeaderRecord(member, options));
            }
            for await (const obs of member.read(this.pathToFile, options)) {
                currentObs++;
                if (start !== undefined && currentObs <= start) {
                    // Skip until start
                    continue;
                }
                if (isFiltered) {
                    if (filter.filterRow(obs as ItemDataArray)) {
                        result.push(obs);
                    }
                } else {
                    result.push(obs);
                }
                if (length && result.length === length) {
                    // Stop when length is reached
                    break;
                }
            }
        }
        return result;
    }

    /**
     * Convert XPT to CSV files. Each dataset within the XPT file is written to the outDir folder as a separate csv file.
     * @param outDir Output folder.
     * @param options Read options. See read() method options.
    */
    public async toCsv (outDir: string, options?: Options): Promise<void> {
        for (let i = 0; i < Object.keys(this.members).length; i++) {
            const member: Member = Object.values(this.members)[i];
            // If list of datasets provided, filter those not in the list
            if (options?.dsNames.length > 0 &&
                !options.dsNames.map(dsName => dsName.toUpperCase()).includes(member.name.toUpperCase())
            ) {
                continue;
            }
            const writer = createWriteStream(path.join(outDir, member.name + '.csv'));
            // Force row format to be array
            const modifiedOpitions: Options = { ...options, rowFormat: 'array' };
            // Print header
            if (!options?.skipHeader) {
                const header: string[] = this.getHeaderRecord(member, modifiedOpitions) as string[];
                writer.write(header.join() + '\n');
            }
            for await (const obs of member.read(this.pathToFile, modifiedOpitions)) {
                // Escape double quotes and commas
                const escapedObs: Array<string|number> = (obs as Array<string|number>).map(elem => {
                    if (typeof elem === 'string' && /,|"/.test(elem)) {
                        return '"' + elem.replace('"', '""') + '"';
                    } else {
                        return elem;
                    }
                });
                writer.write(escapedObs.join(',') + '\n');
            }
            writer.end();
        }
    }
}

export default Library;
