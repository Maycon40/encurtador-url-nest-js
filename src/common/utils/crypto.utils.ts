import { createHash, randomInt, timingSafeEqual } from 'crypto';

function hash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function compare(plainTextToken: string, hashedToken: string): boolean {
  const hashedInput = hash(plainTextToken);

  const a = Buffer.from(hashedInput, 'hex');
  const b = Buffer.from(hashedToken, 'hex');

  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(a, b);
}

function generate6DigitCode(): string {
  return randomInt(100000, 999999).toString();
}

const cryptography = {
  hash,
  compare,
  generate6DigitCode,
};

export default cryptography;
