// src/__tests__/tariffPlans.test.js
import { describe, it, expect, vi } from 'vitest';
import { 
  checkQuota, 
  incrementApplicationUsage, 
  checkMaterialsLimit,
  getCompanyPlan 
} from '../utils/tariffPlans';

describe('Tariff Plans', () => {
  const mockSupabase = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ 
            data: { plan_tier: 'basic', daily_usage: 5, daily_limit: 10 }, 
            error: null 
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      }))
    }))
  };

  describe('checkQuota', () => {
    it('returns quota status for company', async () => {
      const result = await checkQuota(mockSupabase, 'test-company-id');
      
      expect(result).toHaveProperty('dailyUsage');
      expect(result).toHaveProperty('dailyLimit');
      expect(result).toHaveProperty('allowed');
      expect(result.dailyUsage).toBe(5);
      expect(result.dailyLimit).toBe(10);
    });

    it('returns allowed: true when usage is less than limit', async () => {
      const result = await checkQuota(mockSupabase, 'test-company-id');
      expect(result.allowed).toBe(true);
    });

    it('returns allowed: false when usage exceeds limit', async () => {
      const mockSupabaseOverLimit = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: { plan_tier: 'basic', daily_usage: 15, daily_limit: 10 }, 
                error: null 
              }))
            }))
          }))
        }))
      };
      
      const result = await checkQuota(mockSupabaseOverLimit, 'test-company-id');
      expect(result.allowed).toBe(false);
    });

    it('handles errors gracefully', async () => {
      const mockSupabaseError = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: null, 
                error: { message: 'Connection error' } 
              }))
            }))
          }))
        }))
      };
      
      const result = await checkQuota(mockSupabaseError, 'test-company-id');
      expect(result).toHaveProperty('dailyUsage');
      expect(result).toHaveProperty('dailyLimit');
      expect(result).toHaveProperty('allowed');
    });
  });

  describe('incrementApplicationUsage', () => {
    it('increments usage counter', async () => {
      const result = await incrementApplicationUsage(mockSupabase, 'test-company-id');
      expect(result).toBe(true);
    });

    it('handles errors gracefully', async () => {
      const mockSupabaseError = {
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: { message: 'Update failed' } }))
          }))
        }))
      };
      
      const result = await incrementApplicationUsage(mockSupabaseError, 'test-company-id');
      expect(result).toBe(false);
    });
  });

  describe('checkMaterialsLimit', () => {
    it('checks materials limit for basic plan', async () => {
      const result = await checkMaterialsLimit(mockSupabase, 'test-company-id', 5);
      expect(result.limit).toBe(10);
      expect(result.allowed).toBe(true);
    });

    it('rejects if over limit', async () => {
      const result = await checkMaterialsLimit(mockSupabase, 'test-company-id', 15);
      expect(result.allowed).toBe(false);
    });

    it('handles errors gracefully', async () => {
      const mockSupabaseError = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: null, 
                error: { message: 'Connection error' } 
              }))
            }))
          }))
        }))
      };
      
      const result = await checkMaterialsLimit(mockSupabaseError, 'test-company-id', 5);
      expect(result.limit).toBe(10);
      expect(result.allowed).toBe(true); // Default to allowed on error
    });
  });

  describe('getCompanyPlan', () => {
    it('returns company plan', async () => {
      const mockSupabasePlan = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: { plan_tier: 'pro', updated_at: new Date().toISOString() }, 
                error: null 
              }))
            }))
          }))
        }))
      };
      
      const result = await getCompanyPlan(mockSupabasePlan, 'test-company-id');
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('monthlyPrice');
    });

    it('returns basic plan by default if no plan found', async () => {
      const mockSupabaseEmpty = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ 
                data: null, 
                error: { code: 'PGRST116' } 
              }))
            }))
          }))
        }))
      };
      
      const result = await getCompanyPlan(mockSupabaseEmpty, 'test-company-id');
      expect(result.id).toBe('basic');
    });
  });
});