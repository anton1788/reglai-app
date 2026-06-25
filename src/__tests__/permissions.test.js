// src/__tests__/permissions.test.js
import { describe, it, expect } from 'vitest';
import { 
  getRolePermissions, 
  canInviteRole, 
  getAvailableRolesForInvite,
  getRoleLabel,
  isSuperAdmin
} from '../utils/permissions';

describe('Permissions', () => {
  describe('getRolePermissions', () => {
    it('returns correct permissions for master', () => {
      const perms = getRolePermissions('master');
      
      expect(perms.canCreate).toBe(true);
      expect(perms.canViewAnalytics).toBe(false);
      expect(perms.canViewAllApplications).toBe(false);
      expect(perms.canInviteUsers).toBe(false);
      expect(perms.canReceive).toBe(false);
      expect(perms.canManageUsers).toBe(false);
    });

    it('returns correct permissions for foreman', () => {
      const perms = getRolePermissions('foreman');
      
      expect(perms.canCreate).toBe(true);
      expect(perms.canViewAnalytics).toBe(false);
      expect(perms.canViewAllApplications).toBe(false);
      expect(perms.canInviteUsers).toBe(false);
    });

    it('returns correct permissions for manager', () => {
      const perms = getRolePermissions('manager');
      
      expect(perms.canCreate).toBe(true);
      expect(perms.canViewAnalytics).toBe(true);
      expect(perms.canViewAllApplications).toBe(true);
      expect(perms.canInviteUsers).toBe(true);
      expect(perms.canManageUsers).toBe(true);
    });

    it('returns correct permissions for supply_admin', () => {
      const perms = getRolePermissions('supply_admin');
      
      expect(perms.canCreate).toBe(true);
      expect(perms.canViewAnalytics).toBe(true);
      expect(perms.canViewAllApplications).toBe(true);
      expect(perms.canReceive).toBe(true);
      expect(perms.canInviteUsers).toBe(true);
    });

    it('returns correct permissions for accountant', () => {
      const perms = getRolePermissions('accountant');
      
      expect(perms.canViewAnalytics).toBe(true);
      expect(perms.canViewAllApplications).toBe(true);
      expect(perms.canCreate).toBe(false);
    });

    it('returns correct permissions for client', () => {
      const perms = getRolePermissions('client');
      
      expect(perms.canCreate).toBe(false);
      expect(perms.canViewAnalytics).toBe(false);
      expect(perms.canViewAllApplications).toBe(false);
    });

    it('returns default permissions for unknown role', () => {
      const perms = getRolePermissions('unknown');
      
      expect(perms.canCreate).toBe(false);
      expect(perms.canViewAnalytics).toBe(false);
      expect(perms.canViewAllApplications).toBe(false);
    });
  });

  describe('canInviteRole', () => {
    it('manager can invite any role except super_admin', () => {
      expect(canInviteRole('manager', 'master')).toBe(true);
      expect(canInviteRole('manager', 'foreman')).toBe(true);
      expect(canInviteRole('manager', 'supply_admin')).toBe(true);
      expect(canInviteRole('manager', 'accountant')).toBe(true);
      expect(canInviteRole('manager', 'client')).toBe(true);
      expect(canInviteRole('manager', 'super_admin')).toBe(false);
    });

    it('supply_admin can only invite limited roles', () => {
      expect(canInviteRole('supply_admin', 'master')).toBe(true);
      expect(canInviteRole('supply_admin', 'foreman')).toBe(true);
      expect(canInviteRole('supply_admin', 'accountant')).toBe(true);
      expect(canInviteRole('supply_admin', 'client')).toBe(true);
      expect(canInviteRole('supply_admin', 'manager')).toBe(false);
      expect(canInviteRole('supply_admin', 'supply_admin')).toBe(false);
    });

    it('master cannot invite anyone', () => {
      expect(canInviteRole('master', 'master')).toBe(false);
      expect(canInviteRole('master', 'foreman')).toBe(false);
      expect(canInviteRole('master', 'manager')).toBe(false);
    });

    it('foreman cannot invite anyone', () => {
      expect(canInviteRole('foreman', 'master')).toBe(false);
      expect(canInviteRole('foreman', 'foreman')).toBe(false);
    });

    it('accountant cannot invite anyone', () => {
      expect(canInviteRole('accountant', 'master')).toBe(false);
      expect(canInviteRole('accountant', 'accountant')).toBe(false);
    });

    it('client cannot invite anyone', () => {
      expect(canInviteRole('client', 'master')).toBe(false);
      expect(canInviteRole('client', 'client')).toBe(false);
    });

    it('super_admin can invite anyone', () => {
      expect(canInviteRole('super_admin', 'master')).toBe(true);
      expect(canInviteRole('super_admin', 'manager')).toBe(true);
      expect(canInviteRole('super_admin', 'supply_admin')).toBe(true);
    });
  });

  describe('getAvailableRolesForInvite', () => {
    it('returns all roles except super_admin for manager', () => {
      const roles = getAvailableRolesForInvite('manager', true);
      
      expect(roles).toHaveLength(5); // master, foreman, supply_admin, accountant, client
      expect(roles.some(r => r.value === 'super_admin')).toBe(false);
      expect(roles.some(r => r.value === 'manager')).toBe(true);
    });

    it('returns limited roles for supply_admin', () => {
      const roles = getAvailableRolesForInvite('supply_admin', false);
      
      expect(roles).toHaveLength(4); // master, foreman, accountant, client
      expect(roles.some(r => r.value === 'manager')).toBe(false);
      expect(roles.some(r => r.value === 'supply_admin')).toBe(false);
      expect(roles.some(r => r.value === 'super_admin')).toBe(false);
    });

    it('returns empty array for master', () => {
      const roles = getAvailableRolesForInvite('master', false);
      expect(roles).toHaveLength(0);
    });

    it('returns empty array for foreman', () => {
      const roles = getAvailableRolesForInvite('foreman', false);
      expect(roles).toHaveLength(0);
    });

    it('returns all roles for super_admin', () => {
      const roles = getAvailableRolesForInvite('super_admin', true);
      
      expect(roles).toHaveLength(6); // all roles except super_admin itself
      expect(roles.some(r => r.value === 'super_admin')).toBe(false);
    });
  });

  describe('getRoleLabel', () => {
    it('returns correct labels for all roles', () => {
      expect(getRoleLabel('master')).toBe('Мастер');
      expect(getRoleLabel('foreman')).toBe('Прораб');
      expect(getRoleLabel('manager')).toBe('Руководитель');
      expect(getRoleLabel('supply_admin')).toBe('Администратор снабжения');
      expect(getRoleLabel('accountant')).toBe('Бухгалтер');
      expect(getRoleLabel('client')).toBe('Заказчик');
      expect(getRoleLabel('super_admin')).toBe('Супер-админ');
    });

    it('returns fallback for unknown role', () => {
      expect(getRoleLabel('unknown')).toBe('Неизвестная роль');
    });
  });

  describe('isSuperAdmin', () => {
    it('returns true for super_admin role', () => {
      expect(isSuperAdmin('super_admin', null)).toBe(true);
    });

    it('returns true for user with super_admin metadata', () => {
      const user = { user_metadata: { role: 'super_admin' } };
      expect(isSuperAdmin('master', user)).toBe(true);
    });

    it('returns false for non-super_admin role', () => {
      expect(isSuperAdmin('master', null)).toBe(false);
      expect(isSuperAdmin('manager', null)).toBe(false);
      expect(isSuperAdmin('supply_admin', null)).toBe(false);
    });

    it('returns false for user without metadata', () => {
      expect(isSuperAdmin('master', {})).toBe(false);
    });
  });
});