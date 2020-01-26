import Member from './member';
import { createReadStream } from 'fs';

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
        //
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

    /**
     * Read observations.
     * @param options Read options.
     * @param options.dsNames List of dataset names to read, by default all datasets are read.
     * @param options.rowFormat {rowFormat} [array] Output observation format.
     * Array: [value1, value2, value3, ...]
     * Object: { var1: value1, var: value2, var3: value3, ... }
     * @param options.keep [[]] Array of variables to keep in the result (case-insensitive)
     * @param options.skipHeader [false] Flag to control whether the first record contains variable names.
     * @param options.encoding [binary] String encoding, default is latin1 (binary). See the list of encodings supported by Node.js:
     * https://nodejs.org/api/buffer.html#buffer_buffers_and_character_encodings
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
                    yield header;
                } else {
                    const header: string[] = [];
                    member.variableOrder.forEach((varName: string, index: number) => {
                        if (skip[index] !== true) {
                            header.push(varName);
                        }
                    });
                    yield header;
                }
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
}

export default Library;
