// Script to upload passages to Firebase Realtime Database
// Run this once to populate the database with passages

const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set } = require('firebase/database');
const passagesData = require('../src/data/passages.json');

// Firebase config (same as app)
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
const db = getDatabase(app);

async function uploadPassages() {
  try {
    console.log('Uploading passages to Firebase...');

    // Upload all passages
    const passagesRef = ref(db, 'passages');
    await set(passagesRef, passagesData);

    console.log('✅ Successfully uploaded passages to Firebase!');
    console.log('Database structure:');
    console.log('  /passages');
    console.log('    /easy (8 passages)');
    console.log('    /medium (8 passages)');
    console.log('    /hard (8 passages)');
    console.log('\nTotal: 24 passages uploaded');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error uploading passages:', error);
    process.exit(1);
  }
}

uploadPassages();
