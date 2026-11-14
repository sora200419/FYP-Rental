import { describe, expect, it } from 'vitest';
import { maskIcNumber, redactIcNumbers } from '../../src/lib/icRedaction';
import { detectFileKind, validateUpload } from '../../src/lib/uploadValidation';
import { buildAdminBootstrapDecision } from '../../src/lib/admin/bootstrap';
import { passwordSchema } from '../../src/lib/passwordPolicy';

describe('redactIcNumbers', () => {
  const text =
    'Landlord IC: 900101-14-5678. Tenant IC: 950505105432. Landlord again: 900101145678.';

  it('replaces every IC number with a placeholder, one per distinct number', () => {
    const { text: redacted, count } = redactIcNumbers(text);
    expect(redacted).toBe(
      'Landlord IC: [[IC_1]]. Tenant IC: [[IC_2]]. Landlord again: [[IC_1]].',
    );
    expect(count).toBe(2);
    expect(redacted).not.toMatch(/\d{6}/);
  });

  it('restores full or masked numbers, tolerating spacing inside placeholders', () => {
    const { restore } = redactIcNumbers(text);
    expect(restore('Signed by [[IC_1]] and [[ IC_2 ]].', 'full')).toBe(
      'Signed by 900101-14-5678 and 950505-10-5432.',
    );
    expect(restore('Tenant [[IC_2]]', 'masked')).toBe('Tenant ******-**-5432');
  });

  it('leaves unknown placeholders and longer digit runs alone', () => {
    const { text: redacted, restore } = redactIcNumbers('Account 1234567890123456');
    expect(redacted).toBe('Account 1234567890123456');
    expect(restore('[[IC_9]]', 'full')).toBe('[[IC_9]]');
  });

  it('masks all but the last four digits', () => {
    expect(maskIcNumber('900101-14-5678')).toBe('******-**-5678');
  });
});

describe('detectFileKind', () => {
  const bytes = (...values: (number | string)[]) =>
    Uint8Array.from(
      values.flatMap((v) => (typeof v === 'string' ? [...v].map((c) => c.charCodeAt(0)) : [v])),
    );

  it('recognises supported formats by their leading bytes', () => {
    expect(detectFileKind(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('jpeg');
    expect(detectFileKind(bytes(0x89, 'PNG', 0x0d, 0x0a, 0x1a, 0x0a))).toBe('png');
    expect(detectFileKind(bytes('RIFF', 0, 0, 0, 0, 'WEBP'))).toBe('webp');
    expect(detectFileKind(bytes('%PDF-1.7'))).toBe('pdf');
    expect(detectFileKind(bytes(0, 0, 0, 0x18, 'ftypheic'))).toBe('heic');
  });

  it('rejects anything else, whatever its name or declared type', () => {
    expect(detectFileKind(bytes('<svg xmlns="http://www.w3.org/2000/svg">'))).toBeNull();
    expect(detectFileKind(bytes('MZ', 0x90, 0))).toBeNull();
    expect(detectFileKind(new Uint8Array())).toBeNull();
  });
});

describe('validateUpload', () => {
  it('rejects a file whose content does not match an allowed kind', async () => {
    const fake = new File(['<html>not an image</html>'], 'photo.jpg', { type: 'image/jpeg' });
    const result = await validateUpload(fake, { allowed: ['jpeg', 'png'] });
    expect(result).toEqual({ ok: false, error: 'Invalid file type. Accepted: JPG, PNG' });
  });

  it('accepts a real PDF and reports the MIME type from content', async () => {
    const pdf = new File(['%PDF-1.4\n...'], 'statement', { type: 'application/octet-stream' });
    const result = await validateUpload(pdf, { allowed: ['pdf'] });
    expect(result.ok && result.file.mimeType).toBe('application/pdf');
  });

  it('rejects missing, empty and oversized files', async () => {
    expect((await validateUpload(null, { allowed: ['pdf'] })).ok).toBe(false);
    expect((await validateUpload(new File([], 'x.pdf'), { allowed: ['pdf'] })).ok).toBe(false);
    const big = new File(['%PDF-' + 'x'.repeat(2048)], 'big.pdf');
    expect((await validateUpload(big, { allowed: ['pdf'], maxBytes: 1024 })).ok).toBe(false);
  });
});

describe('buildAdminBootstrapDecision', () => {
  const env = { ADMIN_EMAIL: 'Admin@Example.com', ADMIN_PASSWORD: 'a-long-password-123' };

  it('creates the admin when no account uses the email', () => {
    expect(buildAdminBootstrapDecision({ env, existingUser: null })).toMatchObject({
      status: 'create',
      email: 'admin@example.com',
    });
  });

  it('never promotes an existing non-admin account', () => {
    expect(
      buildAdminBootstrapDecision({
        env,
        existingUser: { id: 'u1', role: 'TENANT', name: 'Someone' },
      }),
    ).toEqual({ status: 'conflict', email: 'admin@example.com' });
  });

  it('refuses a weak admin password and skips when env is missing', () => {
    expect(
      buildAdminBootstrapDecision({ env: { ...env, ADMIN_PASSWORD: 'short' }, existingUser: null }),
    ).toEqual({ status: 'weak-password' });
    expect(buildAdminBootstrapDecision({ env: {}, existingUser: null })).toEqual({
      status: 'missing-env',
    });
  });
});

describe('passwordSchema', () => {
  it('requires 12 to 128 characters', () => {
    expect(passwordSchema.safeParse('elevenchars').success).toBe(false);
    expect(passwordSchema.safeParse('twelve-chars').success).toBe(true);
    expect(passwordSchema.safeParse('x'.repeat(129)).success).toBe(false);
  });
});
