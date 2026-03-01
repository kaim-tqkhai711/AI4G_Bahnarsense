import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK.
// Set one of:
//   - GOOGLE_APPLICATION_CREDENTIALS = path to service account JSON file
//   - FIREBASE_SERVICE_ACCOUNT_KEY = JSON string (or base64-encoded JSON) of the key

function getCredential(): admin.credential.Credential {
    const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (key) {
        try {
            const json = key.startsWith('{') ? key : Buffer.from(key, 'base64').toString('utf8');
            return admin.credential.cert(JSON.parse(json));
        } catch (e) {
            console.warn('[firebaseAdmin] FIREBASE_SERVICE_ACCOUNT_KEY invalid, falling back to application default');
        }
    }
    return admin.credential.applicationDefault();
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: getCredential(),
    });
}

export const db = admin.firestore();
export const auth = admin.auth();
export const storage = admin.storage();
