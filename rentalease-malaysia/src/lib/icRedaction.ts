// Keeps Malaysian IC (MyKad/NRIC) numbers out of text sent to the AI model.
// Each distinct number is swapped for a placeholder such as [[IC_1]] before
// the request, and swapped back (in full or masked) in the model's output.

// 12 digits as YYMMDD-PB-###G, with or without dashes, not part of a longer
// digit run.
const IC_NUMBER = /(?<!\d)(\d{6})-?(\d{2})-?(\d{4})(?!\d)/g;
const PLACEHOLDER = /\[\[\s*IC_(\d+)\s*\]\]/g;

export type IcRestoreMode = 'full' | 'masked';

export function maskIcNumber(ic: string): string {
  const digits = ic.replace(/\D/g, '');
  return `******-**-${digits.slice(-4)}`;
}

export function redactIcNumbers(text: string): {
  text: string;
  count: number;
  restore: (output: string, mode: IcRestoreMode) => string;
} {
  const originals: string[] = [];
  const indexByDigits = new Map<string, number>();

  const redacted = text.replace(IC_NUMBER, (match, a: string, b: string, c: string) => {
    const digits = `${a}${b}${c}`;
    let index = indexByDigits.get(digits);
    if (index === undefined) {
      originals.push(`${a}-${b}-${c}`);
      index = originals.length;
      indexByDigits.set(digits, index);
    }
    return `[[IC_${index}]]`;
  });

  const restore = (output: string, mode: IcRestoreMode) =>
    output.replace(PLACEHOLDER, (match, n: string) => {
      const original = originals[Number(n) - 1];
      if (!original) return match;
      return mode === 'full' ? original : maskIcNumber(original);
    });

  return { text: redacted, count: originals.length, restore };
}
