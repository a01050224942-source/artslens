import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDs5ZW3zBMKQvDIw2i5dvD1Iklk-2j-ThE",
  authDomain: "artlens-project.firebaseapp.com",
  projectId: "artlens-project",
  storageBucket: "artlens-project.firebasestorage.app",
  messagingSenderId: "316097796033",
  appId: "1:316097796033:web:fb0d1d4c7c9e8c24b54140",
  measurementId: "G-XCP2G4Y8FJ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app); 