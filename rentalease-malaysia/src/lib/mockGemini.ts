/*
 * Mock Gemini fixtures for development and testing.
 *
 * Why this file exists
 * --------------------
 * The real Gemini API is slow (12-18 seconds per agreement generation),
 * rate-limited on the free tier, and costs real tokens. During wizard
 * development in Phase C, we'll trigger generation dozens of times per
 * day just to verify that clause text reflects wizard answers correctly.
 * Doing that against the real API would burn through the daily quota
 * within an hour and slow iteration to a crawl.
 *
 * The workaround is a canned fixture response that looks realistic enough
 * to exercise the full downstream flow — viewer, red flags tab, bilingual
 * display, PDF rendering — without making a network call.
 *
 * How to enable
 * -------------
 * Add the following line to your `.env.local` file (create the file at
 * the project root if it doesn't exist):
 *
 *     USE_MOCK_GEMINI=true
 *
 * The mock stays active until you either remove the line, set it to
 * anything other than "true", or restart the dev server with the value
 * unset. Real Gemini calls resume immediately after that.
 *
 * When to turn it off
 * -------------------
 * Turn the flag OFF during:
 *   - End-to-end integration tests (you want to verify the real API works)
 *   - The UAT sessions (testers should see real AI output)
 *   - The Part 2 demo (examiners want to see the real thing)
 *   - Any time you're specifically debugging Gemini prompt behavior
 *
 * Leave the flag ON during:
 *   - Wizard UI development
 *   - Viewer and red flags component work
 *   - PDF layout iteration
 *   - Any UI change that happens to trigger agreement regeneration
 */

import type { GeneratedAgreement } from './gemini';

/*
 * The fixture mimics a realistic generated agreement at a medium length.
 * It's not meant to be legally sound — it's just long enough to exercise
 * pagination in the PDF and scrolling in the viewer, and varied enough to
 * test red flag rendering at all three severity levels.
 */
const MOCK_AGREEMENT: GeneratedAgreement = {
  rawContent: `RESIDENTIAL TENANCY AGREEMENT

This Agreement is made between the Landlord and the Tenant for the rental of the Premises described below, pursuant to the Contracts Act 1950 and related Malaysian statutes.

1. PARTIES AND PROPERTY DESCRIPTION
The Landlord and the Tenant are identified in the signature block at the end of this Agreement. The Premises subject to this tenancy is the room or unit described therein at the address stated in the signature block.

2. TENANCY PERIOD
The tenancy shall commence on the start date and expire on the end date as stated in the signature block, unless sooner terminated in accordance with the provisions of this Agreement.

3. MONTHLY RENT AND PAYMENT TERMS
The Tenant shall pay the monthly rent stated in the signature block on or before the 1st day of each calendar month. Payment shall be made by bank transfer to the Landlord's nominated account. Late payment may attract a penalty of RM 50 per week of delay after a grace period of 7 days.

4. SECURITY DEPOSIT AND CONDITIONS FOR REFUND
The Tenant shall pay the security deposit stated in the signature block prior to taking occupation. The deposit shall be held by the Landlord against breach of this Agreement, damage beyond ordinary wear and tear, and unpaid rent or utility bills. The deposit shall be refunded within 30 days after acceptance of the Move-Out Condition Report, less any documented deductions.

5. UTILITIES AND SERVICES
The Tenant shall be responsible for payment of all utility charges (electricity, water, internet) consumed during the tenancy, unless otherwise specified in the signature block. The Tenant shall arrange direct payment to service providers where applicable.

6. FURNISHING INVENTORY ACKNOWLEDGEMENT
The Tenant acknowledges receipt of the Premises in the condition documented in the Move-In Condition Report, and agrees to return the Premises in the same condition at the end of the tenancy, allowing for ordinary wear and tear.

7. PERMITTED USE AND OCCUPANCY LIMITS
The Premises shall be used solely for residential purposes by the Tenant and permitted occupants. The maximum number of occupants shall not exceed the limit stated in the signature block without written consent of the Landlord.

8. SUBLETTING AND TRANSFER PROHIBITION
The Tenant shall not sublet the Premises or transfer this Agreement to any third party without the prior written consent of the Landlord. Unauthorized subletting shall constitute a material breach of this Agreement.

9. MAINTENANCE AND REPAIRS
The Tenant shall be responsible for minor repairs costing less than RM 200. The Landlord shall be responsible for structural repairs, plumbing, and electrical faults not caused by Tenant negligence. Urgent repairs shall be responded to within 48 hours of notification.

10. LANDLORD'S RIGHT OF ENTRY AND INSPECTION
The Landlord shall have the right to inspect the Premises upon giving the Tenant at least 24 hours' written notice, except in the case of emergency, where entry may be made without notice.

11. TERMINATION AND NOTICE PERIOD
Either party may terminate this Agreement by giving 2 months' written notice to the other party. Early termination by the Tenant shall result in forfeiture of the security deposit unless a replacement tenant acceptable to the Landlord is secured.

12. REINSTATEMENT OBLIGATIONS
At the end of the tenancy, the Tenant shall return the Premises in broom-clean condition, remove all personal belongings, and return all keys and access cards. Professional cleaning may be required at the Landlord's discretion.

13. GOVERNING LAW AND DISPUTE RESOLUTION
This Agreement is governed by the laws of Malaysia. Any dispute arising from or in connection with this Agreement shall first be attempted to be resolved amicably through discussion. Failing amicable resolution, disputes may be referred to the Small Claims Tribunal or the Malaysian Courts.

14. ENTIRE AGREEMENT AND AMENDMENTS
This Agreement constitutes the entire understanding between the parties and supersedes any prior oral or written agreements. No amendment shall be valid unless made in writing and signed by both parties.

15. SIGNATURE BLOCK
[Landlord signature, name, IC, date]
[Tenant signature, name, IC, date]

(This is a MOCK agreement generated from local fixtures for development purposes. It will be replaced by real Gemini output when USE_MOCK_GEMINI is unset.)`,

  plainLanguageSummary: `Clause 1 (Parties and Property): Identifies who is renting to whom and what property is being rented. The specific names and addresses are in the signature block at the end.

Clause 2 (Tenancy Period): Sets the dates your tenancy starts and ends. If neither party ends it earlier, the tenancy runs for the full period.

Clause 3 (Rent Payment): You pay rent on the 1st of each month. If you're more than 7 days late, there's a RM 50 per week penalty.

Clause 4 (Security Deposit): The landlord holds your deposit against damage or unpaid rent. You get it back within 30 days of moving out, minus any documented deductions.

Clause 5 (Utilities): You pay your own electricity, water, and internet unless the agreement says otherwise.

Clause 6 (Furniture): You acknowledge receiving the property as shown in the Move-In Condition Report and agree to return it in the same state.

Clause 7 (Occupancy): Only you and approved occupants can live here, up to the maximum stated.

Clause 8 (No Subletting): You can't rent the place out to someone else or transfer the lease without the landlord's written permission.

Clause 9 (Maintenance): You pay for small repairs under RM 200. The landlord handles structural, plumbing, and electrical issues. Urgent issues get a 48-hour response.

Clause 10 (Inspections): The landlord can inspect with 24 hours' notice, or immediately in an emergency.

Clause 11 (Termination): Either side can end the agreement with 2 months' notice. Early termination by you forfeits the deposit unless you find a replacement tenant.

Clause 12 (Move-Out): Return the place clean, take your stuff, and hand back all keys.

Clause 13 (Disputes): Malaysian law applies. Try to resolve disagreements through discussion first; otherwise small claims or court.

Clause 14 (Whole Agreement): This document is the complete agreement. Changes need to be written and signed by both parties.`,

  redFlags: JSON.stringify([
    {
      severity: 'MEDIUM',
      clause: 'Clause 3 — Late Payment Penalty',
      issue:
        'The late payment penalty of RM 50 per week is defined but there is no cap on total late fees, which could accumulate significantly over time.',
      recommendation:
        "Consider adding a maximum total penalty (e.g., not exceeding one month's rent) to avoid disproportionate charges.",
    },
    {
      severity: 'HIGH',
      clause: 'Clause 4 — Deposit Refund Conditions',
      issue:
        'The clause allows deductions for "damage beyond ordinary wear and tear" without defining what qualifies. This ambiguity is a common source of deposit disputes.',
      recommendation:
        'Link the deduction criteria explicitly to the Move-In and Move-Out Condition Reports, and require photographic evidence for each claimed deduction.',
    },
    {
      severity: 'LOW',
      clause: 'Clause 10 — Landlord Entry',
      issue:
        'The 24-hour notice period is reasonable but the clause does not specify acceptable notice methods (written, SMS, in-app message).',
      recommendation:
        'Specify that notice may be delivered through the platform messaging system or by SMS, to avoid ambiguity about what constitutes valid notice.',
    },
  ]),
};

/*
 * Returns true when mock mode should be active. Reads the environment
 * variable fresh on every call rather than caching, so toggling the flag
 * in `.env.local` and restarting the dev server immediately takes effect
 * without any code changes.
 */
export function isMockGeminiEnabled(): boolean {
  return process.env.USE_MOCK_GEMINI === 'true';
}

/*
 * Returns the canned mock agreement. In the future, this could branch on
 * wizard inputs to return different fixtures for different policy choices,
 * but for now a single fixture covers the common case. The small artificial
 * delay (300ms) simulates network latency so the loading spinner in the
 * wizard actually has time to render — otherwise mock generation feels
 * instant and masks UI bugs that only appear during real loading.
 */
export async function getMockAgreement(): Promise<GeneratedAgreement> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return MOCK_AGREEMENT;
}

export interface MockTranslation {
  plainLanguageSummaryMs: string;
  redFlagsMs: string;
}

const MOCK_TRANSLATION: MockTranslation = {
  plainLanguageSummaryMs: `Fasal 1 (Pihak-Pihak dan Harta): Mengenal pasti siapa yang menyewa kepada siapa dan harta apa yang disewakan. Nama dan alamat tertentu terdapat dalam blok tandatangan di penghujung.

Fasal 2 (Tempoh Penyewaan): Menetapkan tarikh sewa bermula dan tamat. Jika tiada pihak menamatkannya lebih awal, penyewaan berjalan untuk tempoh penuh.

Fasal 3 (Pembayaran Sewa): Anda membayar sewa pada hari pertama setiap bulan. Jika lebih daripada 7 hari lewat, ada penalti RM 50 seminggu.

Fasal 4 (Deposit Keselamatan): Tuan tanah memegang deposit anda terhadap kerosakan atau sewa yang tidak dibayar. Anda akan mendapatkannya semula dalam masa 30 hari selepas berpindah keluar, tolak sebarang potongan yang didokumenkan.

Fasal 5 (Utiliti): Anda membayar elektrik, air, dan internet sendiri melainkan perjanjian menyatakan sebaliknya.

Fasal 6 (Perabot): Anda mengakui menerima harta seperti yang ditunjukkan dalam Laporan Keadaan Masuk dan bersetuju untuk memulangkannya dalam keadaan yang sama.

Fasal 7 (Penghunian): Hanya anda dan penghuni yang diluluskan boleh tinggal di sini, sehingga jumlah maksimum yang dinyatakan.

Fasal 8 (Tiada Penyewaan Semula): Anda tidak boleh menyewakan semula tempat itu kepada orang lain atau memindahkan pajakan tanpa kebenaran bertulis tuan tanah.

Fasal 9 (Penyelenggaraan): Anda membayar untuk pembaikan kecil di bawah RM 200. Tuan tanah mengendalikan masalah struktur, paip, dan elektrik. Isu mendesak mendapat tindak balas dalam masa 48 jam.

Fasal 10 (Pemeriksaan): Tuan tanah boleh memeriksa dengan notis 24 jam, atau serta-merta dalam keadaan kecemasan.

Fasal 11 (Penamatan): Sama ada pihak boleh menamatkan perjanjian dengan notis 2 bulan. Penamatan awal oleh anda menyebabkan deposit hilang melainkan anda menemukan penyewa pengganti.

Fasal 12 (Berpindah Keluar): Kembalikan tempat itu dalam keadaan bersih, ambil barang anda, dan serahkan semua kunci.

Fasal 13 (Pertikaian): Undang-undang Malaysia terpakai. Cuba selesaikan perselisihan melalui perbincangan dahulu; jika tidak berjaya, tuntutan kecil atau mahkamah.

Fasal 14 (Perjanjian Keseluruhan): Dokumen ini merupakan perjanjian lengkap. Perubahan perlu dibuat secara bertulis dan ditandatangani oleh kedua-dua pihak.`,

  redFlagsMs: JSON.stringify([
    {
      severity: 'MEDIUM',
      clause: 'Fasal 3 — Penalti Pembayaran Lewat',
      issue: 'Penalti pembayaran lewat sebanyak RM 50 seminggu ditakrifkan tetapi tiada had jumlah keseluruhan penalti, yang boleh terkumpul dengan ketara dari semasa ke semasa.',
      recommendation: 'Pertimbangkan untuk menambah penalti maksimum keseluruhan (contohnya, tidak melebihi satu bulan sewa) bagi mengelakkan caj yang tidak berkadar.',
    },
    {
      severity: 'HIGH',
      clause: 'Fasal 4 — Syarat Pemulangan Deposit',
      issue: 'Fasal itu membenarkan potongan untuk "kerosakan melebihi kehausan biasa" tanpa menentukan apa yang layak. Kekaburan ini merupakan punca pertikaian deposit yang biasa.',
      recommendation: 'Kaitkan kriteria potongan secara eksplisit dengan Laporan Keadaan Masuk dan Keluar, dan memerlukan bukti fotografi untuk setiap tuntutan potongan.',
    },
    {
      severity: 'LOW',
      clause: 'Fasal 10 — Kemasukan Tuan Tanah',
      issue: 'Tempoh notis 24 jam adalah munasabah tetapi fasal itu tidak menentukan kaedah notis yang boleh diterima (bertulis, SMS, mesej dalam aplikasi).',
      recommendation: 'Nyatakan bahawa notis boleh dihantar melalui sistem pesanan platform atau SMS, untuk mengelakkan kekaburan tentang apa yang merupakan notis yang sah.',
    },
  ]),
};

export async function getMockTranslation(): Promise<MockTranslation> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return MOCK_TRANSLATION;
}
