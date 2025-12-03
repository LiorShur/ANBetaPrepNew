import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js";
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-auth.js';
import { 
  getFirestore,
  initializeFirestore,
  memoryLocalCache
} from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAmsm916Lzp0MUXANq3SECO4ec7q1H0Vu4",
  authDomain: "accessnaturebeta-821a2.firebaseapp.com",
  projectId: "accessnaturebeta-821a2",
  storageBucket: "accessnaturebeta-821a2.appspot.com",
  messagingSenderId: "670888101781",
  appId: "1:670888101781:web:b4cf57f58e86182466589c",
  measurementId: "G-QL82J92CP7"
};

// Initialize app - check if already exists
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  console.log('🔥 Firebase app initialized');
} else {
  app = getApp();
  console.log('🔥 Using existing Firebase app');
}

// Initialize Firestore with memory cache to prevent Target ID conflicts
// This must be done BEFORE any getFirestore() calls
let db;
try {
  // Try to initialize with memory cache (prevents IndexedDB Target ID conflicts)
  db = initializeFirestore(app, {
    localCache: memoryLocalCache()
  });
  console.log('🔥 Firestore initialized with memory cache');
} catch (e) {
  // If initializeFirestore fails (already initialized), fall back to getFirestore
  if (e.code === 'failed-precondition' || e.message?.includes('already been called')) {
    db = getFirestore(app);
    console.log('🔥 Using existing Firestore instance');
  } else {
    // For any other error, try getFirestore as last resort
    console.warn('⚠️ Firestore init error:', e.message);
    db = getFirestore(app);
  }
}

export const auth = getAuth(app);
export { db };
export const storage = getStorage(app);

console.log('🔥 Firebase setup complete');