const parseYear = (yearC: string): string => {
    // to fix before 2076
    // 1976 is the year of first SAS release, so no dataset should be created before that
    return parseInt(yearC) > 76 ? '19' + yearC : '20' + yearC;
}

const parseMonth = (monthC: string): string => {
    const monthN = 'JANFEBMARAPRMAYJUNJULAUGSEPOCTNOVDEC'.indexOf(monthC) / 3 + 1;
    return monthN >= 10 ? '' + monthN : '0' + monthN;
}

const parseDate = (dateC: string): Date => {
    const dateRegex = new RegExp(
        '(?<day>\\d{2})(?<month>[A-Z]{3})(?<year>\\d{2}):(?<time>[\\d:]{8})'
    );

    const date = dateRegex.exec(dateC).groups;
    const year = parseYear(date.year);
    const month = parseMonth(date.month);
    
    return new Date(year + '-' + month + '-' + date.day + 'T' + date.time);
}

export default parseDate;