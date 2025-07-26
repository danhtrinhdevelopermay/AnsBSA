/**
 * Firebase Authentication Service
 * Handles Firebase admin operations and user management
 */

import admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
let firebaseInitialized = false;
let firebaseAuth: admin.auth.Auth | null = null;

if (!admin.apps.length) {
  // Check if all required Firebase environment variables are present
  const requiredVars = ['FIREBASE_PROJECT_ID', 'FIREBASE_PRIVATE_KEY_ID', 'FIREBASE_PRIVATE_KEY', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_CLIENT_ID', 'FIREBASE_CLIENT_CERT_URL'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log('⚠️ Missing Firebase environment variables:', missingVars.join(', '));
    console.log('📝 Firebase will work in development mode without server verification');
  } else {
    // Use environment variables for Firebase config
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n').replace(/"/g, ''),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
    };

    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID
      });
      console.log('✅ Firebase Admin initialized successfully');
      console.log(`🔥 Project ID: ${process.env.FIREBASE_PROJECT_ID}`);
      firebaseInitialized = true;
      firebaseAuth = admin.auth();
    } catch (error) {
      console.warn('⚠️ Firebase Admin initialization failed:', error);
      console.log('📝 Firebase will work in development mode without server verification');
    }
  }
}

// Export auth 
export const auth = firebaseAuth;
export default admin;

/**
 * Verify Firebase ID token
 */
export async function verifyFirebaseToken(token: string): Promise<admin.auth.DecodedIdToken | null> {
  if (!firebaseAuth) {
    console.warn('⚠️ Firebase not initialized, skipping token verification');
    // Return a mock decoded token for development mode
    return {
      uid: 'dev-user-id',
      email: 'dev@example.com',
      name: 'Development User',
      aud: '',
      auth_time: Date.now() / 1000,
      exp: Date.now() / 1000 + 3600,
      firebase: { identities: {}, sign_in_provider: 'custom' },
      iat: Date.now() / 1000,
      iss: '',
      sub: 'dev-user-id'
    } as admin.auth.DecodedIdToken;
  }
  
  try {
    const decodedToken = await firebaseAuth.verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('❌ Firebase token verification failed:', error);
    return null;
  }
}

/**
 * Get user by Firebase UID
 */
export async function getFirebaseUser(uid: string): Promise<admin.auth.UserRecord | null> {
  if (!firebaseAuth) {
    console.warn('⚠️ Firebase not initialized, cannot get user');
    return null;
  }
  
  try {
    const userRecord = await firebaseAuth.getUser(uid);
    return userRecord;
  } catch (error) {
    console.error('❌ Failed to get Firebase user:', error);
    return null;
  }
}