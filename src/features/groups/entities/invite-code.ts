/**
 * Invite code domain: pure generation and validation rules. No infra imports.
 *
 * Uses Crockford base32 alphabet (32 chars: 0-9, A-Z minus I, L, O, U) to
 * produce human-friendly codes that avoid visually ambiguous characters.
 * An invite code is always 8 characters long.
 */

// Crockford base32: digits + uppercase letters, excluding I, L, O, U.
const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const CODE_LENGTH = 8;
const VALID_CODE_REGEX = /^[0-9A-HJKMNP-TV-Z]{8}$/;

/**
 * Validates that a string conforms to the invite-code format:
 * - Exactly 8 characters
 * - Only Crockford base32 characters (0-9, A-Z minus I, L, O, U)
 */
export function isValidInviteCode(code: string): boolean {
  return VALID_CODE_REGEX.test(code);
}

/**
 * Generates a cryptographically random 8-character Crockford base32 invite code.
 *
 * Uses crypto.getRandomValues for randomness (not pure-random, not predictable).
 * Callers that need uniqueness MUST retry on DB unique-constraint violation
 * (probability of collision: 1/32^8 ≈ 1.1e-12 per attempt).
 */
export function generateInviteCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);

  return Array.from(bytes)
    .map((byte) => CROCKFORD_ALPHABET[byte % CROCKFORD_ALPHABET.length])
    .join("");
}
