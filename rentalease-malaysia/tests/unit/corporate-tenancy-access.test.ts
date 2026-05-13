import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
  canLegallySignCorporateAgreement,
  canManageCorporateOccupants,
} from "@/lib/corporate-tenancy-access";

const getServerSession = vi.fn();
const createNotification = vi.fn();
const tenancyFindUnique = vi.fn();
const tenancyUpdate = vi.fn();
const tenancyDelete = vi.fn();
const roomUpdate = vi.fn();
const transaction = vi.fn();

vi.mock("next-auth", () => ({
  getServerSession,
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenancy: {
      findUnique: tenancyFindUnique,
      update: tenancyUpdate,
      delete: tenancyDelete,
    },
    room: {
      update: roomUpdate,
    },
    $transaction: transaction,
  },
}));

vi.mock("@/lib/notifications", () => ({
  createNotification,
}));

let patchTenancyInvitation: typeof import("@/app/api/tenancies/[id]/respond/route").PATCH;

beforeAll(async () => {
  ({ PATCH: patchTenancyInvitation } = await import(
    "@/app/api/tenancies/[id]/respond/route"
  ));
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("canManageCorporateOccupants", () => {
  it("allows landlords to manage corporate occupants", () => {
    expect(
      canManageCorporateOccupants({
        actorRole: "LANDLORD",
        isAuthorizedSignatory: false,
      }),
    ).toBe(true);
  });

  it("allows authorized tenant signatories to manage corporate occupants", () => {
    expect(
      canManageCorporateOccupants({
        actorRole: "TENANT",
        isAuthorizedSignatory: true,
      }),
    ).toBe(true);
  });

  it("denies non-signatory tenants from managing corporate occupants", () => {
    expect(
      canManageCorporateOccupants({
        actorRole: "TENANT",
        isAuthorizedSignatory: false,
      }),
    ).toBe(false);
  });
});

describe("canLegallySignCorporateAgreement", () => {
  it("allows only an authorized corporate signatory to sign for a corporate tenancy", () => {
    expect(
      canLegallySignCorporateAgreement({
        leasePartyType: "CORPORATE",
        isAuthorizedSignatory: true,
      }),
    ).toBe(true);

    expect(
      canLegallySignCorporateAgreement({
        leasePartyType: "CORPORATE",
        isAuthorizedSignatory: false,
      }),
    ).toBe(false);

    expect(
      canLegallySignCorporateAgreement({
        leasePartyType: "INDIVIDUAL",
        isAuthorizedSignatory: false,
      }),
    ).toBe(true);
  });
});

describe("corporate tenancy invitation response", () => {
  it("rejects a non-signatory tenant trying to accept a corporate invitation", async () => {
    getServerSession.mockResolvedValue({
      user: { id: "tenant-user-1", role: "TENANT", name: "Staff Occupant" },
    });

    tenancyFindUnique.mockResolvedValue({
      id: "tenancy-1",
      tenantId: "tenant-user-1",
      roomId: "room-1",
      status: "INVITED",
      leasePartyType: "CORPORATE",
      authorizedSignatoryUserId: "signatory-user-1",
      authorizedSignatoryName: "Jane Director",
      room: {
        property: {
          landlordId: "landlord-1",
          address: "18 Jalan SS 15/4",
          city: "Subang Jaya",
        },
      },
      tenant: { id: "tenant-user-1", name: "Staff Occupant", isVerified: true },
      authorizedSignatoryUser: {
        id: "signatory-user-1",
        name: "Jane Director",
        isVerified: true,
      },
    });

    const response = await patchTenancyInvitation(
      new Request("http://localhost/api/tenancies/tenancy-1/respond", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ACCEPT" }),
      }),
      { params: Promise.resolve({ id: "tenancy-1" }) },
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error:
        "Only the authorized signatory can accept this corporate tenancy invitation.",
    });
    expect(tenancyUpdate).not.toHaveBeenCalled();
    expect(createNotification).not.toHaveBeenCalled();
  });
});
