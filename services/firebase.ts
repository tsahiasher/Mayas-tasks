import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.API_KEY,
  authDomain: "maya-s-task.firebaseapp.com",
  projectId: "maya-s-task",
  storageBucket: "maya-s-task.firebasestorage.app",
  messagingSenderId: "350568568050",
  appId: "1:350568568050:web:88a5ce30e500e228ecac6b"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);