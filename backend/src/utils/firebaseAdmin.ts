import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// You must provide a service account JSON or rely on default application credentials
// e.g. set process.env.GOOGLE_APPLICATION_CREDENTIALS="path/to/key.json"
// Or pass config objects directly here.

if (!admin.apps.length) {
    admin.initializeApp({
        // credential: admin.credential.applicationDefault() 
        // -> For local dev, you might use: admin.credential.cert(serviceAccountJson)
    });
}

export const db = admin.firestore();
export const auth = admin.auth();
export const storage = admin.storage();
