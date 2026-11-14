import { describe, expect, it } from 'vitest';
import { normalizeEmail } from '../../src/lib/emailAddress';
import { formatOrdinal } from '../../src/lib/wizardFormatters';
import { buildRentScheduleEntries } from '../../src/lib/payments';
import {
  getInitialWizardStep,
  WIZARD_LAST_STEP_INDEX,
} from '../../src/components/wizard/WizardTypes';

describe('normalizeEmail', () => {
  it('lower-cases and trims so registration and login agree', () => {
    expect(normalizeEmail('  John.Doe@Example.COM ')).toBe('john.doe@example.com');
  });
});

describe('formatOrdinal', () => {
  it.each([
    [1, '1st'],
    [2, '2nd'],
    [3, '3rd'],
    [4, '4th'],
    [11, '11th'],
    [12, '12th'],
    [13, '13th'],
    [21, '21st'],
    [22, '22nd'],
    [23, '23rd'],
    [28, '28th'],
  ])('formats %i as %s', (n, expected) => {
    expect(formatOrdinal(n)).toBe(expected);
  });
});

describe('getInitialWizardStep', () => {
  it('resumes at the next unfinished step', () => {
    expect(getInitialWizardStep(0)).toBe(0);
    expect(getInitialWizardStep(3)).toBe(3);
  });

  it('reopens a completed wizard on the last step instead of a blank page', () => {
    expect(getInitialWizardStep(6)).toBe(WIZARD_LAST_STEP_INDEX);
  });

  it('treats missing or invalid values as a fresh start', () => {
    expect(getInitialWizardStep(undefined)).toBe(0);
    expect(getInitialWizardStep(null)).toBe(0);
    expect(getInitialWizardStep(-2)).toBe(0);
  });
});

describe('buildRentScheduleEntries', () => {
  // Local-time dates: the schedule is built with local-time getters.
  it('creates one PENDING entry per month on the rent due day', () => {
    const entries = buildRentScheduleEntries(
      't1',
      new Date(2026, 0, 1),
      new Date(2026, 11, 31),
      '1500.00',
      5,
    );
    expect(entries).toHaveLength(12);
    expect(entries[0]).toMatchObject({ tenancyId: 't1', amount: 1500, status: 'PENDING' });
    expect(entries[0].dueDate.getDate()).toBe(5);
  });

  it('starts the following month when the due day is before the start date', () => {
    const entries = buildRentScheduleEntries(
      't1',
      new Date(2026, 0, 10),
      new Date(2026, 3, 9),
      1000,
      5,
    );
    expect(entries.map((e) => e.dueDate.getMonth())).toEqual([1, 2, 3]);
  });

  it('clamps the due day to short months', () => {
    const entries = buildRentScheduleEntries(
      't1',
      new Date(2026, 0, 1),
      new Date(2026, 2, 31),
      1000,
      31,
    );
    // February 2026 has 28 days.
    expect(entries[1].dueDate.getDate()).toBe(28);
  });
});
