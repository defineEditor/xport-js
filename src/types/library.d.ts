import Filter from "js-array-filter";

export interface Options {
    dsNames?: string[];
    rowFormat?: "object" | "array";
    keep?: string[];
    encoding?: BufferEncoding;
    skipHeader?: boolean;
    filter?: Filter;
}

export interface Header {
    sasSymbol: string[];
    sasLib: string;
    sasVer: string;
    sasOs: string;
    sasCreate: string;
    sasModified: string;
}
