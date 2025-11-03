import { describe, it, expect } from 'vitest'
import { healthIcons, getHealthIcon, connectionStatusIcons, getConnectionStatusIcon } from './status-icons'
import {
  IconCircleCheck,
  IconCircleWarning,
  IconCircleInfo,
  IconClock3,
  IconCircleClose,
} from 'obra-icons-react'
import type { HealthStatus } from '@/types/api'

describe('Status Icons', () => {
  describe('healthIcons', () => {
    it('should have correct icon and color for Healthy status', () => {
      expect(healthIcons.Healthy).toEqual({
        icon: IconCircleCheck,
        color: 'text-grass-11',
      })
    })

    it('should have correct icon and color for Progressing status', () => {
      expect(healthIcons.Progressing).toEqual({
        icon: IconClock3,
        color: 'text-blue-400',
      })
    })

    it('should have correct icon and color for Degraded status', () => {
      expect(healthIcons.Degraded).toEqual({
        icon: IconCircleWarning,
        color: 'text-amber-400',
      })
    })

    it('should have correct icon and color for Suspended status', () => {
      expect(healthIcons.Suspended).toEqual({
        icon: IconCircleWarning,
        color: 'text-neutral-400',
      })
    })

    it('should have correct icon and color for Missing status', () => {
      expect(healthIcons.Missing).toEqual({
        icon: IconCircleWarning,
        color: 'text-red-400',
      })
    })

    it('should have correct icon and color for Unknown status', () => {
      expect(healthIcons.Unknown).toEqual({
        icon: IconCircleInfo,
        color: 'text-neutral-500',
      })
    })

    it('should have all health status keys defined', () => {
      const expectedStatuses: HealthStatus[] = [
        'Healthy',
        'Progressing',
        'Degraded',
        'Suspended',
        'Missing',
        'Unknown',
      ]

      expectedStatuses.forEach((status) => {
        expect(healthIcons[status]).toBeDefined()
        expect(healthIcons[status].icon).toBeDefined()
        expect(healthIcons[status].color).toBeDefined()
      })
    })

    it('should use IconCircleWarning for multiple degraded states', () => {
      expect(healthIcons.Degraded.icon).toBe(IconCircleWarning)
      expect(healthIcons.Suspended.icon).toBe(IconCircleWarning)
      expect(healthIcons.Missing.icon).toBe(IconCircleWarning)
    })
  })

  describe('getHealthIcon()', () => {
    it('should return correct icon for Healthy status', () => {
      const result = getHealthIcon('Healthy')
      expect(result.icon).toBe(IconCircleCheck)
      expect(result.color).toBe('text-grass-11')
    })

    it('should return correct icon for Progressing status', () => {
      const result = getHealthIcon('Progressing')
      expect(result.icon).toBe(IconClock3)
      expect(result.color).toBe('text-blue-400')
    })

    it('should return correct icon for Degraded status', () => {
      const result = getHealthIcon('Degraded')
      expect(result.icon).toBe(IconCircleWarning)
      expect(result.color).toBe('text-amber-400')
    })

    it('should return correct icon for Suspended status', () => {
      const result = getHealthIcon('Suspended')
      expect(result.icon).toBe(IconCircleWarning)
      expect(result.color).toBe('text-neutral-400')
    })

    it('should return correct icon for Missing status', () => {
      const result = getHealthIcon('Missing')
      expect(result.icon).toBe(IconCircleWarning)
      expect(result.color).toBe('text-red-400')
    })

    it('should return correct icon for Unknown status', () => {
      const result = getHealthIcon('Unknown')
      expect(result.icon).toBe(IconCircleInfo)
      expect(result.color).toBe('text-neutral-500')
    })

    it('should default to Unknown when status is undefined', () => {
      const result = getHealthIcon(undefined)
      expect(result.icon).toBe(IconCircleInfo)
      expect(result.color).toBe('text-neutral-500')
    })

    it('should return an object with icon and color properties', () => {
      const result = getHealthIcon('Healthy')
      expect(result).toHaveProperty('icon')
      expect(result).toHaveProperty('color')
      expect(typeof result.color).toBe('string')
    })
  })

  describe('connectionStatusIcons', () => {
    it('should have correct icon and color for Successful status', () => {
      expect(connectionStatusIcons.Successful).toEqual({
        icon: IconCircleCheck,
        color: 'text-grass-11',
      })
    })

    it('should have correct icon and color for Failed status', () => {
      expect(connectionStatusIcons.Failed).toEqual({
        icon: IconCircleClose,
        color: 'text-red-400',
      })
    })

    it('should have exactly two connection status types', () => {
      const keys = Object.keys(connectionStatusIcons)
      expect(keys).toHaveLength(2)
      expect(keys).toContain('Successful')
      expect(keys).toContain('Failed')
    })

    it('should use different icons for success and failure', () => {
      expect(connectionStatusIcons.Successful.icon).not.toBe(connectionStatusIcons.Failed.icon)
      expect(connectionStatusIcons.Successful.icon).toBe(IconCircleCheck)
      expect(connectionStatusIcons.Failed.icon).toBe(IconCircleClose)
    })

    it('should use different colors for success and failure', () => {
      expect(connectionStatusIcons.Successful.color).not.toBe(connectionStatusIcons.Failed.color)
      expect(connectionStatusIcons.Successful.color).toBe('text-grass-11')
      expect(connectionStatusIcons.Failed.color).toBe('text-red-400')
    })
  })

  describe('getConnectionStatusIcon()', () => {
    it('should return correct icon for Successful status', () => {
      const result = getConnectionStatusIcon('Successful')
      expect(result.icon).toBe(IconCircleCheck)
      expect(result.color).toBe('text-grass-11')
    })

    it('should return correct icon for Failed status', () => {
      const result = getConnectionStatusIcon('Failed')
      expect(result.icon).toBe(IconCircleClose)
      expect(result.color).toBe('text-red-400')
    })

    it('should default to Failed when status is undefined', () => {
      const result = getConnectionStatusIcon(undefined)
      expect(result.icon).toBe(IconCircleClose)
      expect(result.color).toBe('text-red-400')
    })

    it('should return an object with icon and color properties', () => {
      const result = getConnectionStatusIcon('Successful')
      expect(result).toHaveProperty('icon')
      expect(result).toHaveProperty('color')
      expect(typeof result.color).toBe('string')
    })
  })

  describe('Icon consistency', () => {
    it('should use consistent success icon across health and connection status', () => {
      expect(healthIcons.Healthy.icon).toBe(connectionStatusIcons.Successful.icon)
      expect(healthIcons.Healthy.color).toBe(connectionStatusIcons.Successful.color)
    })

    it('should use consistent grass-11 color for success states', () => {
      expect(healthIcons.Healthy.color).toBe('text-grass-11')
      expect(connectionStatusIcons.Successful.color).toBe('text-grass-11')
    })

    it('should use consistent red-400 color for failure states', () => {
      expect(healthIcons.Missing.color).toBe('text-red-400')
      expect(connectionStatusIcons.Failed.color).toBe('text-red-400')
    })
  })
})
