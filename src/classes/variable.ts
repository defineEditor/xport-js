import struct from '../utils/struct';

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
     * <br>   short ntype;       / VARIABLE TYPE: 1=NUMERIC, 2=CHAR       /
     * <br>   short nhfun;       / HASH OF NNAME (always 0)               /
     * <br>   short nlng;        / LENGTH OF VARIABLE IN OBSERVATION      /
     * <br>   short nvar0;       / VARNUM                                 /
     * <br>   char8 nname;       / NAME OF VARIABLE                       /
     * <br>   char40 nlabel;     / LABEL OF VARIABLE                      /
     * <br>   char8 nform;       / NAME OF FORMAT                         /
     * <br>   short nfl;         / FORMAT FIELD LENGTH OR 0               /
     * <br>   short nfd;         / FORMAT NUMBER OF DECIMALS              /
     * <br>   short nfj;         / 0=LEFT JUSTIFICATION, 1=RIGHT JUST     /
     * <br>   char nfill[2];     / (UNUSED, FOR ALIGNMENT AND FUTURE)     /
     * <br>   char8 niform;      / NAME OF INPUT FORMAT                   /
     * <br>   short nifl;        / INFORMAT LENGTH ATTRIBUTE              /
     * <br>   short nifd;        / INFORMAT NUMBER OF DECIMALS            /
     * <br>   long npos;         / POSITION OF VALUE IN OBSERVATION       /
     * <br>   char rest[52];     / remaining fields are irrelevant        /
     * <br>   };
     *
     * Note that the length given in the last 4 bytes of the member
     * header record indicates the actual number of bytes for the NAMESTR
     * structure. The size of the structure listed above is 140 bytes.
     * Under VAX/VMS, the size will be 136 bytes, meaning that the 'rest'
     * variable may be truncated.
     * @param raw Raw description of a varilable.
     * @param fmt Struct format used to parse the binary data.
     */
    public parseRaw (raw: Buffer, fmt: string): void {
        const varStruct = struct(fmt);
        const arrBuf = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const varMeta: any[] = varStruct.unpack(arrBuf);
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
