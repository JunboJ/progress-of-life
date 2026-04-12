import { describe, expect, it, beforeEach } from 'vitest'
import { calculateTooltipPosition } from '../tooltipPosition'

const config = { width: 80, height: 45 }

describe('calculateTooltipPosition', () => {
  beforeEach(() => {
    Object.defineProperty(document.body, 'clientWidth', {
      value: 1000,
      configurable: true,
    })
    Object.defineProperty(window, 'innerWidth', {
      value: 1020,
      configurable: true,
    })
    Object.defineProperty(window, 'innerHeight', {
      value: 800,
      configurable: true,
    })
  })

  it('returns the input position when there is enough room', () => {
    const result = calculateTooltipPosition(100, 100, config)
    expect(result).toEqual({ x: 100, y: 100 })
  })

  it('clamps the tooltip on the right edge', () => {
    const result = calculateTooltipPosition(980, 100, config)
    expect(result.x).toBe(1000 - config.width - (1020 - 1000))
    expect(result.y).toBe(100)
  })

  it('clamps the tooltip to the bottom edge', () => {
    const result = calculateTooltipPosition(100, 790, config)
    expect(result.x).toBe(100)
    expect(result.y).toBe(800 - config.height)
  })
})
