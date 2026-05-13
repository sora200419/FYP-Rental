import { describe, expect, it } from "vitest";

import {
  buildCorporateTenancyCreateInput,
  normalizeCorporateOccupants,
} from "@/lib/corporate-tenancy";

describe("normalizeCorporateOccupants", () => {
  it("trims values, removes empty rows, and normalizes occupant rows", () => {
    const occupants = normalizeCorporateOccupants([
      {
        name: "  Alice Tan  ",
        icNumber: " 900101-14-5678 ",
        phone: " 0123456789 ",
        roleLabel: " Finance Lead ",
      },
      {
        name: "   ",
        icNumber: "",
        phone: "   ",
        roleLabel: "",
      },
      {
        name: "Bob Lee",
        icNumber: "",
        phone: "",
        roleLabel: "",
      },
    ]);

    expect(occupants).toEqual([
      {
        name: "Alice Tan",
        icNumber: "900101-14-5678",
        phone: "0123456789",
        roleLabel: "Finance Lead",
      },
      {
        name: "Bob Lee",
        icNumber: null,
        phone: null,
        roleLabel: null,
      },
    ]);
  });

  it("preserves populated optional fields without stripping meaning", () => {
    const occupants = normalizeCorporateOccupants([
      {
        name: "Worker B",
        icNumber: "900101-10-1234",
        phone: "012-3456789",
        roleLabel: "Kitchen Crew",
      },
    ]);

    expect(occupants).toEqual([
      {
        name: "Worker B",
        icNumber: "900101-10-1234",
        phone: "012-3456789",
        roleLabel: "Kitchen Crew",
      },
    ]);
  });
});

describe("buildCorporateTenancyCreateInput", () => {
  it("builds a flat corporate tenancy payload with normalized occupants", () => {
    const createInput = buildCorporateTenancyCreateInput({
      roomId: "room_123",
      startDate: "2026-06-01",
      endDate: "2027-05-31",
      monthlyRent: 1800,
      depositAmount: 3600,
      companyName: "  Acme Sdn Bhd  ",
      companyRegistrationNo: " 202401234567 ",
      authorizedSignatoryName: "  Jane Director ",
      authorizedSignatoryIC: " 900101-14-5678 ",
      authorizedSignatoryRole: "  Director ",
      authorizedSignatoryEmail: " Jane.Director@Acme.Test ",
      occupants: [
        {
          name: "  Alice Tan  ",
          icNumber: " 900101-14-5678 ",
          phone: " 0123456789 ",
          roleLabel: " Finance Lead ",
        },
        {
          name: "Bob Lee",
          icNumber: "",
          phone: "",
          roleLabel: "",
        },
      ],
    });

    expect(createInput).toEqual({
      roomId: "room_123",
      leasePartyType: "CORPORATE",
      startDate: "2026-06-01",
      endDate: "2027-05-31",
      monthlyRent: 1800,
      depositAmount: 3600,
      companyName: "Acme Sdn Bhd",
      companyRegistrationNo: "202401234567",
      authorizedSignatoryName: "Jane Director",
      authorizedSignatoryIC: "900101-14-5678",
      authorizedSignatoryRole: "Director",
      authorizedSignatoryEmail: "jane.director@acme.test",
      occupants: [
        {
          name: "Alice Tan",
          icNumber: "900101-14-5678",
          phone: "0123456789",
          roleLabel: "Finance Lead",
        },
        {
          name: "Bob Lee",
          icNumber: null,
          phone: null,
          roleLabel: null,
        },
      ],
    });
  });
});
