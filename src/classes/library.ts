import Member from './member';
import parseDate from '../utils/parseDate';
import { createReadStream, createWriteStream } from 'fs';
import path from 'path';

/**
 * @typedef {"array" | "object" } rowFormat
 */

class Library {
    members: Member[];
    created: Date;
    modified: Date;
    sasVersion: string;
    osVersion: string;
    pathToFile: string;
    /**
     * Library associated with the XPORT file.
     * @param pathToFile Path to XPT file.
     * @param options Options.
     */
    constructor (pathToFile: string) {
        this.pathToFile = pathToFile;
        this.members = [];
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
    private parseHeader (data: Buffer): void {
        const headerRegex = new RegExp(
            'HEADER RECORD\\*{7}LIBRARY HEADER RECORD!{7}0{30} {2}' +
            'SAS {5}SAS {5}SASLIB {2}' + 
            '(?<sasVersion>.{8})(?<osVersion>.{8})' +
            ' {24}(?<created>.{16})(?<modified>.{16})'
        );

        const header = headerRegex.exec(data.toString('binary')).groups;
        this.sasVersion = header.sasVersion.trim();
        this.osVersion = header.osVersion.trim();
        this.created = parseDate(header.created);
        this.modified = parseDate(header.modified);
    }

    private parseMembers (data: Buffer, obsStart: number): void {
        const member = new Member(obsStart);
        member.parseRaw(data);
        this.members.push(member);
    }

    /**
     * Get metadata information from XPORT file.
     */
    public async getMetadata (): Promise<object> {
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
        this.parseHeader(data.slice(0, 3 * 80));
        // Parse members - the rest
        this.parseMembers(data.slice(3 * 80), obsStart);

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

        return result;
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
                if (skip[index] !== true) {
                    header[varName] = member.variables[varName].label;
                }
            });
            return header;
        } else {
            const header: string[] = [];
            member.variableOrder.forEach((varName: string, index: number) => {
                if (skip[index] !== true) {
                    header.push(varName);
                }
            });
            return header;
        }
    }

    /**
     * Read observations.
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
            if (options?.skipHeader !== true) {
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
     * Convert XPT to CSV files. Each dataset within the XPT file is written to the outDir folder as a separate csv file.
     * @param outDir Output folder.
     * @param options Read options. See read() method options.
    */
    public async toCsv (outDir: string, options?: Options): Promise<void> {
        for (let i = 0; i < Object.keys(this.members).length; i++) {
            const member: Member = Object.values(this.members)[i];
            // If list of datasets provided, filter those not in the list
            if (options?.dsNames.length > 0 &&
                options.dsNames.map(dsName => dsName.toUpperCase()).includes(member.name.toUpperCase()) !== true
            ) {
                continue;
            }
            const writer = createWriteStream(path.join(outDir, member.name + '.csv'));
            // Force row format to be array
            const modifiedOpitions: Options = { ...options, rowFormat: 'array' };
            // Print header
            if (options?.skipHeader !== true) {
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
