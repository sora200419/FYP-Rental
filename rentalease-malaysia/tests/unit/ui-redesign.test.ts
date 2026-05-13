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

  it('uses creation date as the cover tie-breaker when photo order is tied or absent', () => {
    expect(
      getPropertyCover([
        { id: 'late', imageUrl: '/late.jpg', caption: 'Later', createdAt: '2026-02-01' },
        { id: 'early', imageUrl: '/early.jpg', caption: 'Earlier', createdAt: '2026-01-01' },
      ]),
    ).toEqual({
      imageUrl: '/early.jpg',
      caption: 'Earlier',
    });

    expect(
      getPropertyCover([
        { id: 'second', imageUrl: '/second.jpg', caption: 'Second', order: 1, createdAt: '2026-02-01' },
        { id: 'first', imageUrl: '/first.jpg', caption: 'First', order: 1, createdAt: '2026-01-01' },
      ]),
    ).toEqual({
      imageUrl: '/first.jpg',
      caption: 'First',
    });
  });

  it('uses Date timestamps as the cover tie-breaker when photo order is tied or absent', () => {
    expect(
      getPropertyCover([
        {
          id: 'later',
          imageUrl: '/later.jpg',
          caption: 'Later',
          createdAt: new Date('2026-01-02T00:00:00.000Z'),
        },
        {
          id: 'earliest',
          imageUrl: '/earliest.jpg',
          caption: 'Earliest',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]),
    ).toEqual({
      imageUrl: '/earliest.jpg',
      caption: 'Earliest',
    });

    expect(
      getPropertyCover([
        {
          id: 'later',
          imageUrl: '/ordered-later.jpg',
          caption: 'Ordered later',
          order: 1,
          createdAt: new Date('2026-01-02T00:00:00.000Z'),
        },
        {
          id: 'earliest',
          imageUrl: '/ordered-earliest.jpg',
          caption: 'Ordered earliest',
          order: 1,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]),
    ).toEqual({
      imageUrl: '/ordered-earliest.jpg',
      caption: 'Ordered earliest',
    });

    expect(
      getPropertyCover([
        {
          id: 'invalid',
          imageUrl: '/invalid.jpg',
          caption: 'Invalid date',
          createdAt: new Date('not-a-date'),
        },
        { id: 'missing', imageUrl: '/missing.jpg', caption: 'Missing date' },
        {
          id: 'valid',
          imageUrl: '/valid.jpg',
          caption: 'Valid date',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ]),
    ).toEqual({
      imageUrl: '/valid.jpg',
      caption: 'Valid date',
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
    expect(getOccupancySummary({ totalRooms: 2, occupiedRooms: 0 })).toEqual({
      label: 'Vacant',
      tone: 'default',
    });
  });

  it('chooses role-specific dashboard attention copy', () => {
    expect(
      getDashboardAttention({
        role: 'LANDLORD',
        pendingPaymentVerifications: 2,
        pendingAgreementReviews: 0,
        unacknowledgedConditionReports: 0,
      }),
    ).toEqual({
      title: '2 payment proofs need review',
      description: 'Confirm or reject submitted payment evidence to keep rent records current.',
      actionLabel: 'Review payments',
    });

    expect(
      getDashboardAttention({
        role: 'TENANT',
        pendingPaymentVerifications: 0,
        pendingAgreementReviews: 1,
        unacknowledgedConditionReports: 0,
      }),
    ).toEqual({
      title: '1 agreement needs your review',
      description: 'Review the latest agreement terms before signing or requesting changes.',
      actionLabel: 'Review agreement',
    });

    expect(
      getDashboardAttention({
        role: 'ADMIN',
        pendingKyc: 0,
        pendingProperties: 3,
      }),
    ).toEqual({
      title: '3 properties need verification',
      description: 'Review property evidence before landlords invite tenants.',
      actionLabel: 'Open property queue',
    });
  });
});
