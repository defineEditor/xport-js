const struct = require('../utils/struct');

class Variable {
    name: string;
    label: string;
    type: string;
    length: number;
    varNum: number;
    formatName: string;
    formatW: string;
    formatD: string;
    formatJ: string;
    informatName: string;
    informatW: string;
    informatD: string;

    /**
     * Member (dataset) within the XPORT file.
     * @param raw Raw description of a varilable.
     * @param fmt Struct format used to parse the binary data.
     */
    constructor (raw: Buffer, fmt: string) {
        if (raw !== undefined) {
            this.parseRaw(raw, fmt);
        }
    }

    /**
     * Parse Member information from XPORT file.
     * Here is the C structure definition for the namestr record:
     *
     * struct NAMESTR {
     *    short ntype;       / VARIABLE TYPE: 1=NUMERIC, 2=CHAR       /
     *    short nhfun;       / HASH OF NNAME (always 0)               /
     *    short nlng;        / LENGTH OF VARIABLE IN OBSERVATION      /
     *    short nvar0;       / VARNUM                                 /
     *    char8 nname;       / NAME OF VARIABLE                       /
     *    char40 nlabel;     / LABEL OF VARIABLE                      /
     *    char8 nform;       / NAME OF FORMAT                         /
     *    short nfl;         / FORMAT FIELD LENGTH OR 0               /
     *    short nfd;         / FORMAT NUMBER OF DECIMALS              /
     *    short nfj;         / 0=LEFT JUSTIFICATION, 1=RIGHT JUST     /
     *    char nfill[2];     / (UNUSED, FOR ALIGNMENT AND FUTURE)     /
     *    char8 niform;      / NAME OF INPUT FORMAT                   /
     *    short nifl;        / INFORMAT LENGTH ATTRIBUTE              /
     *    short nifd;        / INFORMAT NUMBER OF DECIMALS            /
     *    long npos;         / POSITION OF VALUE IN OBSERVATION       /
     *    char rest[52];     / remaining fields are irrelevant        /
     *    };
     *
     * Note that the length given in the last 4 bytes of the member
     * header record indicates the actual number of bytes for the NAMESTR
     * structure. The size of the structure listed above is 140 bytes.
     * Under VAX/VMS, the size will be 136 bytes, meaning that the 'rest'
     * variable may be truncated.
     * @param raw Raw description of a varilable.
     * @param fmt Struct format used to parse the binary data.
     */
    public parseRaw(raw: Buffer, fmt: string): void {
        let varStruct = struct(fmt);
        let arrBuf = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
        let varMeta: Array<any> = varStruct.unpack(arrBuf);
        this.type = varMeta[0] === 1 ? 'Num' : 'Char';
        this.length = varMeta[2];
        this.varNum = varMeta[3];
        this.name = varMeta[4].trim();
        this.label = varMeta[5].trim();
        this.formatName = varMeta[6].trim();
        this.formatW = varMeta[7].toString();
        this.formatD = varMeta[8].toString();
        this.formatJ = varMeta[9];
        this.informatName = varMeta[11].trim();
        this.informatW = varMeta[12].toString();
        this.informatD = varMeta[13].toString();
    }
}

export default Variable;