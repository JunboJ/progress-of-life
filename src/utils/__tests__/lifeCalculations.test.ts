import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'
import { calculateLifeStats } from '../lifeCalculations'

describe('calculateLifeStats', () => {
  it('returns correct start and end dates for a given DOB and lifespan', () => {
    const result = calculateLifeStats(80, '1995-02-14')

    expect(result.startDate.format('YYYY-MM-DD')).toBe('1995-02-14')
    expect(result.endDate.format('YYYY-MM-DD')).toBe('2075-02-14')
    expect(result.months).toBe(960)
    expect(result.days).toBe(dayjs('2075-02-14').diff(dayjs('1995-02-14'), 'd'))
    expect(result.daysLived).toBe(dayjs().diff(dayjs('1995-02-14'), 'd'))
  })

  it('uses today when dob is empty', () => {
    const result = calculateLifeStats(80, '')

    expect(result.startDate.isSame(result.today, 'day')).toBe(true)
    expect(result.endDate.isSame(result.today.add(80, 'year'), 'day')).toBe(true)
    expect(result.days).toBe(result.endDate.diff(result.startDate, 'd'))
  })
})
