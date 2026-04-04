import { describe, expect, it } from 'vitest';
import { permissionMatches } from './permissions';

describe('permissionMatches', () => {
  it('ستاره کامل', () => {
    expect(permissionMatches(['*'], 'crm:read')).toBe(true);
  });
  it('تطبیق دقیق', () => {
    expect(permissionMatches(['contracts:read'], 'contracts:read')).toBe(true);
    expect(permissionMatches(['contracts:read'], 'contracts:write')).toBe(false);
  });
  it('پیشوند با *', () => {
    expect(permissionMatches(['crm:*'], 'crm:read')).toBe(true);
    expect(permissionMatches(['contracts:*'], 'contracts:read')).toBe(true);
  });
});
