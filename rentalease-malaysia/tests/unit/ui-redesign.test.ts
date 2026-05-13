import { describe, expect, it } from 'vitest';
import {
  getDashboardAttention,
  getOccupancySummary,
  getPropertyCover,
  getPropertyCoverAlt,
} from '../../src/lib/uiRedesign';

describe('uiRedesign helpers', () => {
  it('selects the first ordered property photo as the cover', () => {
    const cover = getPropertyCover([
      { id: '2', imageUrl: '/second.jpg', caption: 'Second', order: 2 },
      { id: '1', imageUrl: '/first.jpg', caption: 'Front view', order: 1 },
    ]);

    expect(cover).toEqual({
      imageUrl: '/first.jpg',
      caption: 'Front view',
    });
  });

  it('returns null when no property photos exist', () => {
    expect(getPropertyCover([])).toBeNull();
  });

  it('builds accessible alt text from caption and address', () => {
    expect(getPropertyCoverAlt('Jalan Ampang Residence', 'Front view')).toBe(
      'Front view for Jalan Ampang Residence',
    );
    expect(getPropertyCoverAlt('Jalan Ampang Residence')).toBe(
      'Property photo for Jalan Ampang Residence',
    );
  });

  it('formats occupancy summaries', () => {
    expect(getOccupancySummary({ totalRooms: 0, occupiedRooms: 0 })).toEqual({
      label: 'No rooms',
      tone: 'muted',
    });
    expect(getOccupancySummary({ totalRooms: 3, occupiedRooms: 3 })).toEqual({
      label: 'Fully occupied',
      tone: 'success',
    });
    expect(getOccupancySummary({ totalRooms: 4, occupiedRooms: 2 })).toEqual({
      label: '2/4 occupied',
      tone: 'warning',
    });
  });

  it('chooses role-specific dashboard attention copy', () => {
    expect(
      getDashboardAttention({
        role: 'LANDLORD',
        pendingPaymentVerifications: 2,
        pendingAgreementReviews: 0,
        unacknowledgedConditionReports: 0,
      }).title,
    ).toBe('2 payment proofs need review');

    expect(
      getDashboardAttention({
        role: 'TENANT',
        pendingPaymentVerifications: 0,
        pendingAgreementReviews: 1,
        unacknowledgedConditionReports: 0,
      }).actionLabel,
    ).toBe('Review agreement');

    expect(
      getDashboardAttention({
        role: 'ADMIN',
        pendingKyc: 0,
        pendingProperties: 3,
      }).title,
    ).toBe('3 properties need verification');
  });
});
