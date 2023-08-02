import { API_KEY, APP_ID, AUTH_DOMAIN, GOOGLE_APPLICATION_CREDENTIALS, MESSAGING_SENDER_ID, PROJECT_ID, STORAGE_BUCKET } from '../../config/default';
import admin from 'firebase-admin';
import { initializeApp } from "firebase/app";

const serviceAccount = require(GOOGLE_APPLICATION_CREDENTIALS);
const firebaseConfig = {
    apiKey: API_KEY,
    authDomain: AUTH_DOMAIN,
    projectId: PROJECT_ID,
    storageBucket: STORAGE_BUCKET,
    messagingSenderId: MESSAGING_SENDER_ID,
    appId: APP_ID
};

export default {
    initialize(): void {
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        initializeApp(firebaseConfig);
    }
}
