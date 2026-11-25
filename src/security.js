import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';

export function reallyReallySecureHashPassword(password) {
  return bcrypt.hash(password, 12);
}

export function reallyReallySecureCheckPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export function reallyReallySecureNewToken() {
  return randomBytes(32).toString('base64url');
}
