import 'dotenv/config';
import { firebaseAuth } from '../src/config/firebase.js';

const [uid, role] = process.argv.slice(2);
if (!uid || !['admin', 'customer'].includes(role)) {
  console.error('Usage: node scripts/set-firebase-role.mjs <firebase-uid> <admin|customer>');
  process.exit(1);
}
await firebaseAuth().setCustomUserClaims(uid, { role });
console.log('Role updated. The user should sign out and sign in again to refresh the token.');
