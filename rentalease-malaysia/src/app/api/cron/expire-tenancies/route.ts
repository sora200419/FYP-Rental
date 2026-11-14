// GET /api/cron/expire-tenancies
// Runs once a day (scheduled in vercel.json). It:
//   1. moves ACTIVE tenancies whose endDate has passed to EXPIRED and frees
//      their rooms, and
//   2. clears invitations with no response after INVITATION_EXPIRY_DAYS, and
//   3. sends TENANCY_ENDING_SOON notifications and emails 30 and 7 days before
//      the end date.
//
// Protected with CRON_SECRET. Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`
// automatically when the CRON_SECRET environment variable is set.
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createNotification } from '@/lib/notifications';
import { sendTenancyEndingSoonEmail } from '@/lib/email';
import { syncRoomAvailability } from '@/lib/roomAvailability';
import { deleteUnstartedTenancy } from '@/lib/tenancyCancellation';
import { INVITATION_EXPIRY_DAYS } from '@/lib/tenancyLifecycle';
import { tenantTenancyHref } from '@/lib/tenantLinks';

const DAY_MS = 24 * 60 * 60 * 1000;

const tenancyEndingSelect = {
  id: true,
  tenantId: true,
  room: {
    select: {
      property: {
        select: {
          address: true,
          landlord: { select: { id: true, name: true, email: true } },
        },
      },
    },
  },
  tenant: { select: { name: true, email: true } },
} as const;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const now = new Date();

  // 1. Expire tenancies whose endDate has passed, then recompute availability
  //    for their rooms so the landlord can invite a new tenant.
  const toExpire = await prisma.tenancy.findMany({
    where: { status: 'ACTIVE', endDate: { lt: now } },
    select: { id: true, roomId: true },
  });

  if (toExpire.length > 0) {
    await prisma.$transaction(async (tx) => {
      await tx.tenancy.updateMany({
        where: { id: { in: toExpire.map((t) => t.id) }, status: 'ACTIVE' },
        data: { status: 'EXPIRED' },
      });
      for (const roomId of new Set(toExpire.map((t) => t.roomId))) {
        await syncRoomAvailability(tx, roomId);
      }
    });
  }

  // 2. Invitations nobody answered. Recorded in the audit log under the
  //    landlord (AuditLog needs a user), with the reason saying it was automatic.
  const staleInvitations = await prisma.tenancy.findMany({
    where: {
      status: 'INVITED',
      createdAt: { lt: new Date(now.getTime() - INVITATION_EXPIRY_DAYS * DAY_MS) },
    },
    select: {
      id: true,
      tenantId: true,
      room: { select: { label: true, property: { select: { landlordId: true, address: true } } } },
    },
  });
  let expiredInvitations = 0;
  for (const invitation of staleInvitations) {
    const { landlordId, address } = invitation.room.property;
    try {
      await deleteUnstartedTenancy({
        tenancyId: invitation.id,
        actorId: landlordId,
        action: 'TENANCY_INVITATION_EXPIRED',
        reason: `Automatically removed: no response within ${INVITATION_EXPIRY_DAYS} days`,
      });
      expiredInvitations += 1;
      await Promise.allSettled([
        createNotification(
          landlordId,
          'INVITATION_RESPONDED',
          'Invitation expired',
          `Your invitation for ${invitation.room.label} at ${address} received no response within ${INVITATION_EXPIRY_DAYS} days and was removed. The room is available again.`,
          '/dashboard/landlord/tenancies',
        ),
        createNotification(
          invitation.tenantId,
          'INVITATION_RESPONDED',
          'Invitation expired',
          `The tenancy invitation for ${address} expired because it was not answered within ${INVITATION_EXPIRY_DAYS} days.`,
          '/dashboard/tenant',
        ),
      ]);
    } catch (error) {
      console.error(`[cron] Could not expire invitation ${invitation.id}:`, error);
    }
  }

  // 3. Ending-soon reminders. The window is one day wide so each tenancy is
  //    picked up exactly once per threshold by a daily run.
  const baseUrl = process.env.NEXTAUTH_URL ?? '';
  const notifyPromises: Promise<unknown>[] = [];
  const notifiedCounts: Record<number, number> = {};

  for (const daysLeft of [30, 7]) {
    const windowStart = new Date(now.getTime() + (daysLeft - 1) * DAY_MS);
    const windowEnd = new Date(now.getTime() + daysLeft * DAY_MS);

    const ending = await prisma.tenancy.findMany({
      where: { status: 'ACTIVE', endDate: { gte: windowStart, lt: windowEnd } },
      select: tenancyEndingSelect,
    });
    notifiedCounts[daysLeft] = ending.length;

    const landlordMessage =
      daysLeft === 30
        ? 'A tenancy you manage is ending in 30 days. Consider offering a renewal.'
        : 'A tenancy you manage is ending in 7 days. Please prepare for move-out.';
    const tenantMessage =
      daysLeft === 30
        ? 'Your tenancy is ending in 30 days. Contact your landlord about renewal.'
        : 'Your tenancy is ending in 7 days. Please prepare for move-out.';

    for (const t of ending) {
      const { address, landlord } = t.room.property;
      // Same in-app links as lib/endingSoonNotifications.ts, which de-duplicates
      // by link — a different link here would produce duplicate notifications.
      const landlordLink = `/dashboard/landlord/tenancies/${t.id}`;
      const tenantLink = tenantTenancyHref(t.id);
      const landlordEmailLink =
        daysLeft === 30
          ? `${baseUrl}/dashboard/landlord/tenancies/${t.id}/renew`
          : `${baseUrl}${landlordLink}`;

      notifyPromises.push(
        createNotification(
          landlord.id,
          'TENANCY_ENDING_SOON',
          `Tenancy ending in ${daysLeft} days`,
          landlordMessage,
          landlordLink,
        ),
        createNotification(
          t.tenantId,
          'TENANCY_ENDING_SOON',
          `Your tenancy ends in ${daysLeft} days`,
          tenantMessage,
          tenantLink,
        ),
        sendTenancyEndingSoonEmail(landlord.email, landlord.name, address, daysLeft, landlordEmailLink),
        sendTenancyEndingSoonEmail(t.tenant.email, t.tenant.name, address, daysLeft, `${baseUrl}${tenantLink}`),
      );
    }
  }

  await Promise.allSettled(notifyPromises);

  return NextResponse.json({
    expired: toExpire.length,
    expiredInvitations,
    notified30Days: notifiedCounts[30] ?? 0,
    notified7Days: notifiedCounts[7] ?? 0,
  });
}
