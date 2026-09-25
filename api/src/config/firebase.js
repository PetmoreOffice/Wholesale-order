import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

function firebaseConfig() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (projectId && clientEmail && privateKey) {
    return { projectId, credential: cert({ projectId, clientEmail, privateKey }) };
  }
  if (projectId && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return { projectId, credential: applicationDefault() };
  }
  throw new Error('Firebase Admin is not configured. Set FIREBASE_PROJECT_ID and GOOGLE_APPLICATION_CREDENTIALS, or provide the service-account fields.');
}

export function firebaseAuth() {
  if (!getApps().length) initializeApp(firebaseConfig());
  return getAuth();
}
