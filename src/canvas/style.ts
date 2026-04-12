export const CalendarStyle = {
  cellWidth: 32,
  cellHeight: 32,
  cellGap: 6,
  paddingTop: 6,
  paddingRight: 6,
  paddingBottom: 6,
  paddingLeft: 6,
} as const

export type CalendarStyle = typeof CalendarStyle
