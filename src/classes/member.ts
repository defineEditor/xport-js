import Variable from './variable';
import ibm2ieee from '../utils/ibm2ieee';
import { createReadStream, statSync } from 'fs';
import { Options } from '../types/library';

class Member {
    variables: {[index: string]: Variable};
    variableOrder: string[];
    obsStart: number;
    name: string;
    label: string;
    type: string;
    created: string;
    modified: string;
    descriptorSize: number;

    /**
     * Member (dataset) within the XPORT file.
     * @param obsStart Position in XPT of the first observation.
     */
    constructor (obsStart: number) {
        this.variables = {};
        this.variableOrder = [];
        this.obsStart = obsStart;
    }

    /**
     * Parse Member Header information.
     * @param data Raw header.
     */
    public parseRawHeader (data: Buffer): void {
        const headerRegex = new RegExp(
            'HEADER RECORD\\*{7}MEMBER {2}HEADER RECORD!{7}0{17}' +
            '160{8}(?<descriptorSize>140|136) {2}' +
            'HEADER RECORD\\*{7}DSCRPTR HEADER RECORD!{7}0{30}  ' +
            'SAS\\s{5}(?<name>.{8})SASDATA ' +
            '.{16}\\s{24}(?<created>.{16})' +
            '(?<modified>.{16})\\s{16}' +
            '(?<label>.{40})(?<type>.{8})'
        );
        const header = headerRegex.exec(data.toString('binary')).groups;
        this.descriptorSize = parseInt(header.descriptorSize);
        this.name = header.name.trim();
        this.label = header.label.trim();
        this.created = header.created.trim();
        this.modified = header.modified.trim();
        this.type = header.type.trim();
    }

    /**
     * Parse Member information from XPORT file.
     * @param stream XPT file stream.
     */
    public parseRaw (data: Buffer): void {
        // Parse basic header information;
        this.parseRawHeader(data.subarray(0, 4 * 80));
        // Get the number of variables
        // Format depends on the OS
        let format: string;
        if (this.descriptorSize === 140) {
            format = '>hhhh8s40s8shhh2s8shhi52s';
        } else {
            format = '>hhhh8s40s8shhh2s8shhi48s';
        }
        const nameStrRaw = data.subarray(4 * 80, 5 * 80).toString('binary');
        const numVars = parseInt(/HEADER RECORD\*{7}NAMESTR HEADER RECORD!{7}0{6}(?<numVars>.{4})0{20}/.exec(nameStrRaw).groups.numVars);
        const varMetaRaw = data.subarray(5 * 80);
        for (let i = 0; i < numVars; i++) {
            const variable: Variable = new Variable(varMetaRaw.subarray(i * this.descriptorSize, (i + 1) * this.descriptorSize), format);
            this.variables[variable.name] = variable;
        }
        this.variableOrder = Object.keys(this.variables).sort((var1, var2) => {
            if (this.variables[var1].varNum > this.variables[var2].varNum) {
                return 1;
            } else {
                return -1;
            }
        });
    }

    /**
     * Read member observations.
     * @param pathToFile Path to XPT file.
     * @param options Read options. See Library.read method description for details.
     * @return Async Iterable which returns observations
     */
    public async * read (pathToFile: string, options?: Options): AsyncIterable<Array<number|string>|object> {
        // Options
        const encoding = options?.encoding !== undefined ? options.encoding : 'binary';
        const rowType = options?.rowFormat === 'object' ? 'object' : 'array';
        const roundPrecision = options?.roundPrecision;
        let multiplier: number;
        if (roundPrecision !== undefined) {
            multiplier = Math.pow(10, roundPrecision);
        }
        let keep = options?.keep !== undefined ? options.keep : [];
        keep = keep.map(varName => varName.toUpperCase());
        const stream = createReadStream(pathToFile, { start: this.obsStart });
        const obsSize: number = Object.values(this.variables).reduce((totLen, variable) => (totLen + variable.length), 0);
        // Get sizes/names/types/skip flag for all variables
        const lengths: number[] = [];
        const types: string[] = [];
        const varNames: string[] = [];
        const skip: boolean[] = [];
        this.variableOrder.forEach(varName => {
            const variable = this.variables[varName];
            lengths.push(variable.length);
            types.push(variable.type);
            varNames.push(variable.name);
            if (keep.length > 0 && !keep.includes(varName.toUpperCase())) {
                skip.push(true);
            } else {
                skip.push(false);
            }
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let obs: any;
        let data = Buffer.from([]);
        for await (const chunk of stream) {
            data = Buffer.concat([data, chunk]);
            while (data.length >= obsSize) {
                // Parse single observation
                if (rowType === 'array') {
                    obs = [];
                } else if (rowType === 'object') {
                    obs = {};
                }
                obs = [];
                lengths.forEach((length, index) => {
                    if (skip[index] === true) {
                        data = data.subarray(length);
                        return;
                    }
                    let value: string|number;
                    if (types[index] === 'Num') {
                        if (roundPrecision !== undefined) {
                            value = ibm2ieee(data.subarray(0, length));
                            if (value !== null) {
                                value = Math.round(value * multiplier) / multiplier;
                            }
                        } else {
                            value = ibm2ieee(data.subarray(0, length));
                        }
                    } else {
                        value = data.subarray(0, length).toString(encoding).trim();
                    }
                    if (rowType === 'array') {
                        obs.push(value);
                    } else if (rowType === 'object') {
                        obs[varNames[index]] = value;
                    }
                    // Skip the bytes which were just processed
                    data = data.subarray(length);
                });
                yield obs;
            }
        }
    }

    /**
     * Get total number of records in the member
     * @param pathToFile Path to XPT file
     * @returns Number of records
     */
    public getRecordsNum(pathToFile: string): number {
        if (!this.variables || Object.keys(this.variables).length === 0) {
            return 0;
        }

        const obsSize: number = Object.values(this.variables).reduce((totLen, variable) => (totLen + variable.length), 0);
        const stats = statSync(pathToFile);

        // Calculate nameStr section size with proper padding
        const numVars = Object.keys(this.variables).length;
        // Each nameStr record length depends on OS/format (140 or 136 bytes)
        const totalNameStrBytes = numVars * this.descriptorSize;
        // nameStr records are stored in 80-byte blocks
        // Calculate how many full 80-byte blocks we need
        const numFullRecords = Math.floor(totalNameStrBytes / 80);
        // Calculate remaining bytes that don't fill a complete 80-byte block
        const remainingBytes = totalNameStrBytes % 80;
        // If we have remaining bytes, we need one more block with padding
        const paddedNameStrSize = remainingBytes > 0 ? (numFullRecords + 1) * 80 : numFullRecords * 80;

        // Calculate total header size:
        // - Library header (3 blocks * 80 bytes)
        // - Member header (4 blocks * 80 bytes)
        // - Namestr header (1 block * 80 bytes)
        // - Variable information (padded nameStr section)
        // - Data heaader header (1 block * 80 bytes)
        const headerSize = (3 + 4 + 1) * 80 + paddedNameStrSize + 80;

        // Calculate actual data size by removing all headers
        const dataSize = stats.size - headerSize;
        // Use floor to avoid counting partial records
        return Math.floor(dataSize / obsSize);
    }
}

export default Member;
