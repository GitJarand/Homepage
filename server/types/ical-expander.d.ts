declare module 'ical-expander' {
  interface IcalDate {
    toJSDate(): Date
    toUnixTime(): number
    toString(): string
  }

  interface VEvent {
    uid: string
    summary: string
    startDate: IcalDate
    endDate: IcalDate
    location?: string
  }

  interface Occurrence {
    item: VEvent
    startDate: IcalDate
    endDate: IcalDate
  }

  interface ExpandResult {
    events: VEvent[]
    occurrences: Occurrence[]
  }

  export default class IcalExpander {
    constructor(options: { ics: string; maxIterations?: number })
    between(start: Date, end: Date): ExpandResult
  }
}
