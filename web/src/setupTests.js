// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock Firebase Auth globally
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({ currentUser: null })),
  onAuthStateChanged: jest.fn((auth, callback) => {
    callback(null); // No user by default
    return () => {}; // Return unsubscribe function
  }),
  signInWithPopup: jest.fn(),
  GoogleAuthProvider: jest.fn()
}));

// Mock Firebase Firestore globally
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  addDoc: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({ docs: [] }))
}));

// Mock Firebase Realtime Database globally
jest.mock('firebase/database', () => ({
  getDatabase: jest.fn(() => ({})),
  ref: jest.fn(() => ({})),
  onValue: jest.fn((ref, callback) => {
    callback({ val: () => null, exists: () => false });
    return () => {};
  }),
  set: jest.fn(() => Promise.resolve()),
  update: jest.fn(() => Promise.resolve()),
  push: jest.fn(() => Promise.resolve({ key: 'mock-key' })),
  get: jest.fn(() => Promise.resolve({ 
    exists: () => false, 
    val: () => null 
  })),
  remove: jest.fn(() => Promise.resolve())
}));
