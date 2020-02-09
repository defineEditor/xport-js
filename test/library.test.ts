import { default as Library } from '../src/classes/library'

interface AlfalfaMetadata {
    dataset: string,
    label: string,
    length: number,
    name: string,
    type: string
}

interface AlfalfaRecord {
    POP: string,
    SAMPLE: string,
    REP: string,
    SEEDWT: string,
    HARV1: string,
    HARV2: string
}

const path = `${__dirname}/Alfalfa.xpt`

describe(`Library default checks`, () => {
  it(`Library type should be a function`, () => {
    expect(typeof Library).toBe('function')
  })
})

describe(`Can read an xpt file`,  () => {
    it(`Library should have pathToFile field`, () => {
        const lib = new Library(path)
        expect(lib!.pathToFile).toBe(path)
    })

    it(`Library should provide metadata`, async () => {
        const lib = new Library(path)

        const metadata: Array<AlfalfaMetadata> = <Array<AlfalfaMetadata>> await lib.getMetadata()
        expect(metadata.length).toBe(6)

        const firstElement = metadata[0]
        expect(firstElement!.dataset).toBe('SPEC')
        expect(firstElement!.name).toBe('POP')
        expect(firstElement!.label).toBe('')
        expect(firstElement!.type).toBe('Char')
    })
})

describe(`Can read xpt records`,  () => {
    it(`Records read are valid`, async () => {
        const lib = new Library(path)

        let records = []
        for await (let obs of lib.read({ rowFormat: 'object'})) {
            records.push(obs)
        }
        const headers = <AlfalfaRecord>records.shift()
        expect(headers!.POP).toBe('')
        expect(headers!.SAMPLE).toBe('')
        expect(headers!.REP).toBe('')
        expect(headers!.SEEDWT).toBe('')
        expect(headers!.HARV1).toBe('')
        expect(headers!.HARV2).toBe('')

        const firstElement:AlfalfaRecord = <AlfalfaRecord>records[0]
        expect(firstElement!.POP).toBe('min')
        expect(firstElement!.SAMPLE).toBe(0)
        expect(firstElement!.REP).toBe(1)
        expect(firstElement!.SEEDWT).toBe(64)
        expect(firstElement!.HARV1).toBe(171.7)
        expect(firstElement!.HARV2).toBe(180.3)

        expect(records.length).toBe(40)
    })
})
