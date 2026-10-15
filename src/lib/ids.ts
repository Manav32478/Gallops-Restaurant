import { randomBytes, randomInt } from 'crypto';

/** URL-safe, unpredictable token (used for QR identifiers and order tracking URLs). */
export function randomToken(bytes = 18): string {
  return randomBytes(bytes).toString('base64url');
}

/**
 * Human-friendly order number, e.g. G102.
 * Sequential per restaurant per day (G = Gallops initial), collision-safe:
 * uniqueness is enforced by a DB retry loop in the order service.
 */
export function orderCode(prefix: string, sequence: number): string {
  return `${prefix}${sequence}`;
}

export function randomDigits(len: number): string {
  let out = '';
  for (let i = 0; i < len; i += 1) out += randomInt(0, 10).toString();
  return out;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}
