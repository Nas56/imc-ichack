import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyCgPruT1RandsNKe0Bx89cKY7gWHYtmfNY",
  authDomain: "imc-track.firebaseapp.com",
  databaseURL: "https://imc-track-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "imc-track",
  storageBucket: "imc-track.firebasestorage.app",
  messagingSenderId: "470053079167",
  appId: "1:470053079167:web:2f49b926eab9f07c6f574a",
  measurementId: "G-9JY2N8W210"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and Realtime Database
export const auth = getAuth(app);
export const db = getDatabase(app);

export default app;
