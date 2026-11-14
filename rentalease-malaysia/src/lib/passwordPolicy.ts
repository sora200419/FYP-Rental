import { z } from 'zod';

// One password rule for registration, reset and the client forms.
// 12 characters is the NIST SP 800-63B baseline; 128 caps bcrypt work (bcrypt
// itself only reads the first 72 bytes).
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer`);
