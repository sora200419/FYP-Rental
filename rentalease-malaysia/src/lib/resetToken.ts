import crypto from 'crypto';

/**
 * Hash a raw password-reset token to its storage form.
 *
 * Only the SHA-256 of the token sent in the email is persisted. If the
 * database leaks, the hashes cannot be turned back into usable reset links.
 */
export function hashResetToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}
