// Prints the VITE_TEACH_PASSWORD_HASH value for a Teach password. Must match src/lib/teachLock.js.
import { pbkdf2Sync, randomBytes } from 'node:crypto';

const password = process.argv[2];
if (!password) {
  console.error('Usage: npm run teach-password -- <password>');
  process.exit(1);
}
const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, 210000, 32, 'sha256');
console.log(`VITE_TEACH_PASSWORD_HASH=${salt.toString('hex')}:${hash.toString('hex')}`);
