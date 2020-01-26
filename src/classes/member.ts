import Variable from './variable';
import ibm2ieee from '../utils/ibm2ieee';
import { createReadStream } from 'fs';

class Member {
    variables: {[index:string]: Variable};
    variableOrder: Array<string>;
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
    public parseRawHeader(data: Buffer): void {
        let headerRegex = new RegExp(
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
    public parseRaw(data: Buffer): void {
        // Parse basic header information;
        this.parseRawHeader(data.slice(0, 4 * 80));
        // Get the number of variables
        // Format depends on the OS
        let format: string;
        if (this.descriptorSize === 140) {
            format = '>hhhh8s40s8shhh2s8shhi52s';
        } else {
            format = '>hhhh8s40s8shhh2s8shhi48s';
        }
        const nameStrRaw = data.slice(4 * 80, 5 * 80).toString('binary');
        const numVars = parseInt(/HEADER RECORD\*{7}NAMESTR HEADER RECORD\!{7}0{6}(?<numVars>.{4})0{20}/.exec(nameStrRaw).groups.numVars);
        const varMetaRaw = data.slice(5 * 80);
        for (let i = 0; i < numVars; i++) {
            let variable: Variable = new Variable(varMetaRaw.slice(i * this.descriptorSize, (i + 1) * this.descriptorSize), format);
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
    public async* read(pathToFile: string, options?: Options): AsyncIterable<Array<any>> {
        // Options
        let encoding = options?.encoding !== undefined ? options.encoding : 'binary';
        let rowType = options?.rowFormat === 'object' ? 'object' : 'array';
        let keep = options?.keep !== undefined ? options.keep : [];
        keep = keep.map(varName => varName.toUpperCase());
        let stream = createReadStream(pathToFile, { start: this.obsStart });
        let obsSize: number = Object.values(this.variables).reduce((totLen, variable) => (totLen + variable.length), 0);
        // Get sizes/names/types/skip flag for all variables
        let lengths: Array<number> = [];
        let types: Array<string> = [];
        let varNames: Array<string> = [];
        let skip: Array<boolean> = [];
        this.variableOrder.forEach(varName => {
            let variable = this.variables[varName];
            lengths.push(variable.length);
            types.push(variable.type);
            varNames.push(variable.name);
            if (keep.length > 0 && !keep.includes(varName.toUpperCase())) {
                skip.push(true);
            } else {
                skip.push(false);
            }
        });
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
                lengths.forEach( (length, index) => {
                    if (skip[index] === true) {
                        data = data.slice(length);
                        return;
                    }
                    let value: string|number;
                    if (types[index] === 'Num') {
                        value = ibm2ieee(data.slice(0,length));
                    } else {
                        value = data.slice(0,length).toString(encoding).trim();
                    }
                    if (rowType === 'array') {
                        obs.push(value);
                    } else if (rowType === 'object') {
                        obs[varNames[index]] = value;
                    }
                    // Skip the bytes which were just processed
                    data = data.slice(length);
                });
                yield obs;
            }
        }
    }
}

export default Member;