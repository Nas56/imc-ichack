import { uploadBooksToFirebase } from '../services/booksService';

/**
 * Initialize Firebase with default data
 * This should run once when the app first starts
 */
export const initializeFirebaseData = async () => {
  try {
    console.log('Initializing Firebase data...');

    // Upload books to Firebase
    await uploadBooksToFirebase();

    console.log('✅ Firebase data initialization complete');
    return true;
  } catch (error) {
    console.error('Error initializing Firebase data:', error);
    return false;
  }
};
