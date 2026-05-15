import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { messagesEn, messagesMs } from '@/lib/i18n';

describe('agreement generation wait copy', () => {
  it('sets the wizard overlay estimate to one minute', () => {
    const wizardSource = readFileSync(
      new URL('../../src/components/wizard/WizardContainer.tsx', import.meta.url),
      'utf8',
    );

    expect(wizardSource).toContain('This takes about 1 minute.');
  });

  it('keeps localized generation estimate copy aligned', () => {
    expect(messagesEn.wizard_generating_desc).toBe('This takes about 1 minute.');
    expect(messagesMs.wizard_generating_desc).toBe('Ini mengambil masa kira-kira 1 minit.');
  });
});
