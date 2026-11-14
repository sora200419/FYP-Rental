import { describe, expect, it } from 'vitest';
import {
  localeFor,
  messagesEn,
  messagesMs,
  statusLabel,
  t,
  tc,
  toLanguage,
} from '../../src/lib/i18n';
import { getDashboardAttention, getTenancyStepLabels } from '../../src/lib/uiRedesign';

describe('dictionaries', () => {
  it('have the same keys and no empty strings', () => {
    expect(Object.keys(messagesMs).sort()).toEqual(Object.keys(messagesEn).sort());
    for (const [key, value] of Object.entries(messagesMs)) {
      expect(value.trim(), key).not.toBe('');
    }
  });

  it('keep the same {placeholders} in both languages', () => {
    const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
    for (const key of Object.keys(messagesEn) as (keyof typeof messagesEn)[]) {
      expect(placeholders(messagesMs[key]), key).toEqual(placeholders(messagesEn[key]));
    }
  });
});

describe('t / tc', () => {
  it('interpolates variables and leaves unknown placeholders visible', () => {
    expect(t('dashboard_welcome', 'en', { name: 'Aisyah' })).toBe('Welcome back, Aisyah');
    expect(t('dashboard_welcome', 'ms', { name: 'Aisyah' })).toBe('Selamat kembali, Aisyah');
    expect(t('dashboard_welcome', 'en')).toBe('Welcome back, {name}');
  });

  it('picks singular or plural English forms by count', () => {
    expect(tc('banner_agreement_review', 1, 'en')).toBe('1 agreement awaiting your review');
    expect(tc('banner_agreement_review', 3, 'en')).toBe('3 agreements awaiting your review');
    expect(tc('banner_agreement_review', 3, 'ms')).toBe('3 perjanjian menunggu semakan anda');
  });
});

describe('statusLabel', () => {
  it('translates known enum values and humanises unknown ones', () => {
    expect(statusLabel('agreement', 'PENDING_SIGNATURE_PROOF', 'en')).toBe('Awaiting signed copy');
    expect(statusLabel('tenancy', 'ACTIVE', 'ms')).toBe('Aktif');
    expect(statusLabel('payment', 'SOMETHING_NEW', 'en')).toBe('Something new');
  });
});

describe('language helpers', () => {
  it('default anything unknown to English', () => {
    expect(toLanguage('ms')).toBe('ms');
    expect(toLanguage('fr')).toBe('en');
    expect(toLanguage(undefined)).toBe('en');
    expect(localeFor('ms')).toBe('ms-MY');
  });

  it('translate the dashboard hero and the timeline', () => {
    const hero = getDashboardAttention(
      { role: 'TENANT', pendingAgreementReviews: 1, pendingPaymentVerifications: 0, unacknowledgedConditionReports: 0 },
      'ms',
    );
    expect(hero.title).toBe('1 perjanjian perlu disemak oleh anda');
    expect(getTenancyStepLabels('ms')).toEqual(['Jemputan', 'Perjanjian', 'Deposit', 'Keadaan', 'Aktif']);
    expect(getTenancyStepLabels()).toEqual(['Invite', 'Agreement', 'Deposit', 'Condition', 'Active']);
  });
});
