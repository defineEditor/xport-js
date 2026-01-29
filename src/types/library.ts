import Filter from "js-array-filter";

export interface Options {
    dsNames?: string[];
    rowFormat?: "object" | "array";
    keep?: string[];
    encoding?: BufferEncoding;
    skipHeader?: boolean;
    filter?: Filter;
    roundPrecision?: number;
}

export interface Header {
    sasSymbol: string[];
    sasLib: string;
    sasVer: string;
    sasOs: string;
    sasCreate: string;
    sasModified: string;
}

export interface UniqueValues {
    [name: string]: {
        values: (string | number | boolean | null)[]
        counts: {[name: string]: number}

    };
}

export interface VariableMetadata {
    dataset: string;
    name: string;
    label: string;
    length: number;
    type: string;
    format?: string;
    informat?: string;
}
