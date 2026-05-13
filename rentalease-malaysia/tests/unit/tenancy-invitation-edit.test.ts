import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const getServerSession = vi.fn();
const tenancyFindFirst = vi.fn();
const agreementFindUnique = vi.fn();
const tenancyUpdate = vi.fn();
const userFindUnique = vi.fn();
const createNotification = vi.fn();
const sendInvitationEmail = vi.fn();

vi.mock("next-auth", () => ({
  getServerSession,
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenancy: {
      findFirst: tenancyFindFirst,
      update: tenancyUpdate,
    },
    agreement: {
      findUnique: agreementFindUnique,
    },
    user: {
      findUnique: userFindUnique,
    },
  },
}));

vi.mock("@/lib/notifications", () => ({
  createNotification,
}));

vi.mock("@/lib/email", () => ({
  sendInvitationEmail,
}));

let patchTenancy: typeof import("@/app/api/tenancies/[id]/route").PATCH;

beforeAll(async () => {
  ({ PATCH: patchTenancy } = await import("@/app/api/tenancies/[id]/route"));
});

beforeEach(() => {
  vi.clearAllMocks();
  getServerSession.mockResolvedValue({
    user: { id: "landlord-1", role: "LANDLORD", name: "Landlord One" },
  });
  agreementFindUnique.mockResolvedValue(null);
});

describe("tenancy invitation recipient edits", () => {
  it("allows an invited individual tenancy to switch to a different tenant email", async () => {
    tenancyFindFirst.mockResolvedValue({
      id: "tenancy-1",
      status: "INVITED",
      leasePartyType: "INDIVIDUAL",
      tenant: {
        id: "tenant-old",
        name: "Wrong Tenant",
        email: "wrong@test.my",
      },
      authorizedSignatoryUser: null,
      room: {
        property: {
          landlordId: "landlord-1",
          address: "18 Jalan SS 15/4",
          city: "Subang Jaya",
        },
      },
    });

    userFindUnique
      .mockResolvedValueOnce({
        id: "tenant-new",
        name: "Correct Tenant",
        email: "correct@test.my",
        role: "TENANT",
      })
      .mockResolvedValueOnce({
        name: "Landlord One",
      });

    tenancyUpdate.mockResolvedValue({
      id: "tenancy-1",
      startDate: new Date("2026-06-01"),
      endDate: new Date("2027-05-31"),
      monthlyRent: 1500,
      depositAmount: 3000,
      status: "INVITED",
      tenant: {
        id: "tenant-new",
        name: "Correct Tenant",
        email: "correct@test.my",
      },
    });

    const response = await patchTenancy(
      new Request("http://localhost/api/tenancies/tenancy-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: "2026-06-01",
          endDate: "2027-05-31",
          monthlyRent: 1500,
          depositAmount: 3000,
          invitationEmail: "correct@test.my",
        }),
      }) as unknown as NextRequest,
      { params: Promise.resolve({ id: "tenancy-1" }) },
    );

    expect(response.status).toBe(200);
    expect(tenancyUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "tenancy-1" },
        data: expect.objectContaining({ tenantId: "tenant-new" }),
      }),
    );
    expect(createNotification).toHaveBeenCalledWith(
      "tenant-new",
      "INVITATION_RECEIVED",
      "Updated tenancy invitation",
      expect.stringContaining("18 Jalan SS 15/4"),
      "/dashboard/tenant/tenancy",
    );
    expect(sendInvitationEmail).toHaveBeenCalledWith(
      "correct@test.my",
      "Correct Tenant",
      "18 Jalan SS 15/4, Subang Jaya",
      "Landlord One",
    );
  });

  it("blocks recipient changes after the tenant has already accepted", async () => {
    tenancyFindFirst.mockResolvedValue({
      id: "tenancy-1",
      status: "PENDING",
      leasePartyType: "INDIVIDUAL",
      tenant: {
        id: "tenant-current",
        name: "Accepted Tenant",
        email: "accepted@test.my",
      },
      authorizedSignatoryUser: null,
      room: {
        property: {
          landlordId: "landlord-1",
          address: "18 Jalan SS 15/4",
          city: "Subang Jaya",
        },
      },
    });

    const response = await patchTenancy(
      new Request("http://localhost/api/tenancies/tenancy-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: "2026-06-01",
          endDate: "2027-05-31",
          monthlyRent: 1500,
          depositAmount: 3000,
          invitationEmail: "other@test.my",
        }),
      }) as unknown as NextRequest,
      { params: Promise.resolve({ id: "tenancy-1" }) },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error:
        "The invitation recipient can only be changed before the tenant accepts the invitation.",
    });
    expect(tenancyUpdate).not.toHaveBeenCalled();
    expect(createNotification).not.toHaveBeenCalled();
    expect(sendInvitationEmail).not.toHaveBeenCalled();
  });
});
