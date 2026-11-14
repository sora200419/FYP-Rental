// Server-side validation for uploaded files. The type is decided from the
// file's first bytes ("magic numbers"), not from the browser-supplied MIME
// type, which a client can set to anything.

export type FileKind = 'jpeg' | 'png' | 'webp' | 'pdf' | 'heic';

export const MIME_TYPE_BY_KIND: Record<FileKind, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
  heic: 'image/heic',
};

const LABEL_BY_KIND: Record<FileKind, string> = {
  jpeg: 'JPG',
  png: 'PNG',
  webp: 'WebP',
  pdf: 'PDF',
  heic: 'HEIC',
};

export const DEFAULT_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const HEIF_BRANDS = new Set(['heic', 'heix', 'heim', 'heis', 'hevc', 'hevx', 'mif1', 'msf1']);

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.subarray(start, end));
}

/** Identifies the file type from its leading bytes, or null if unsupported. */
export function detectFileKind(bytes: Uint8Array): FileKind | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'jpeg';
  }
  if (
    bytes.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => bytes[i] === b)
  ) {
    return 'png';
  }
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP') {
    return 'webp';
  }
  if (bytes.length >= 5 && ascii(bytes, 0, 5) === '%PDF-') {
    return 'pdf';
  }
  if (bytes.length >= 12 && ascii(bytes, 4, 8) === 'ftyp' && HEIF_BRANDS.has(ascii(bytes, 8, 12))) {
    return 'heic';
  }
  return null;
}

export type ValidatedUpload = {
  buffer: Buffer;
  kind: FileKind;
  /** MIME type derived from the detected kind, safe to pass to storage. */
  mimeType: string;
  name: string;
  size: number;
};

export type UploadValidationResult =
  | { ok: true; file: ValidatedUpload }
  | { ok: false; error: string };

/**
 * Validates one multipart form field: present, a file, non-empty, within the
 * size limit, and (by content) one of the allowed kinds.
 */
export async function validateUpload(
  value: FormDataEntryValue | null,
  options: { allowed: FileKind[]; maxBytes?: number },
): Promise<UploadValidationResult> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_UPLOAD_BYTES;

  if (!(value instanceof File)) {
    return { ok: false, error: 'No file provided' };
  }
  if (value.size <= 0) {
    return { ok: false, error: 'The file is empty.' };
  }
  if (value.size > maxBytes) {
    return {
      ok: false,
      error: `File must be ${Math.round(maxBytes / (1024 * 1024))} MB or smaller.`,
    };
  }

  const buffer = Buffer.from(await value.arrayBuffer());
  const kind = detectFileKind(buffer);
  if (!kind || !options.allowed.includes(kind)) {
    const accepted = options.allowed.map((k) => LABEL_BY_KIND[k]).join(', ');
    return { ok: false, error: `Invalid file type. Accepted: ${accepted}` };
  }

  return {
    ok: true,
    file: { buffer, kind, mimeType: MIME_TYPE_BY_KIND[kind], name: value.name, size: value.size },
  };
}
