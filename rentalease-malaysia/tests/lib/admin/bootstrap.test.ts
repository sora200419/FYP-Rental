import { describe, expect, it } from 'vitest';
import { buildAdminBootstrapDecision } from '@/lib/admin/bootstrap';

describe('admin bootstrap decision', () => {
  it('requires ADMIN_EMAIL and ADMIN_PASSWORD', () => {
    const result = buildAdminBootstrapDecision({
      env: { ADMIN_EMAIL: '', ADMIN_PASSWORD: '', ADMIN_NAME: '' },
      existingUser: null,
    });

    expect(result.status).toBe('missing-env');
  });

  it('returns missing-env when trimmed env values are empty', () => {
    const result = buildAdminBootstrapDecision({
      env: {
        ADMIN_EMAIL: '   ',
        ADMIN_PASSWORD: '   ',
        ADMIN_NAME: 'RentalEase Admin',
      },
      existingUser: null,
    });

    expect(result.status).toBe('missing-env');
  });

  it('creates an admin when no user exists', () => {
    const result = buildAdminBootstrapDecision({
      env: {
        ADMIN_EMAIL: 'admin@example.com',
        ADMIN_PASSWORD: 'Secret123!',
        ADMIN_NAME: 'RentalEase Admin',
      },
      existingUser: null,
    });

    expect(result.status).toBe('create');
    expect(result.email).toBe('admin@example.com');
  });

  it('lowercases mixed-case admin email before creating an admin', () => {
    const result = buildAdminBootstrapDecision({
      env: {
        ADMIN_EMAIL: 'Admin@Example.COM',
        ADMIN_PASSWORD: 'Secret123!',
        ADMIN_NAME: 'RentalEase Admin',
      },
      existingUser: null,
    });

    expect(result.status).toBe('create');
    expect(result.email).toBe('admin@example.com');
  });

  it('falls back to RentalEase Admin when ADMIN_NAME is whitespace only', () => {
    const result = buildAdminBootstrapDecision({
      env: {
        ADMIN_EMAIL: 'admin@example.com',
        ADMIN_PASSWORD: 'Secret123!',
        ADMIN_NAME: '   ',
      },
      existingUser: null,
    });

    expect(result.status).toBe('create');
    expect(result.name).toBe('RentalEase Admin');
  });

  it('promotes a matching non-admin user', () => {
    const result = buildAdminBootstrapDecision({
      env: {
        ADMIN_EMAIL: 'admin@example.com',
        ADMIN_PASSWORD: 'Secret123!',
        ADMIN_NAME: 'RentalEase Admin',
      },
      existingUser: { id: 'user_1', role: 'TENANT', name: 'Alex' },
    });

    expect(result.status).toBe('promote');
    expect(result.userId).toBe('user_1');
  });
});
