
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // 👈 인증 기능 로드

// 가은 님의 기존 파이어베이스 설정값 (그대로 유지)
const firebaseConfig = {
  apiKey: "AIzaSyDs5ZW3zBMKQvDIw2i5dvD1Iklk-2j-ThE",
  authDomain: "artlens-project.firebaseapp.com",
  projectId: "artlens-project",
  storageBucket: "artlens-project.firebasestorage.app",
  messagingSenderId: "316097796033",
  appId: "1:316097796033:web:fb0d1d4c7c9e8c24b54140",
  measurementId: "G-XCP2G4Y8FJ"
};

// 🚨 [핵심] app 선언은 이 파일 전체에서 딱 '한 번'만 존재해야 합니다!
const app = initializeApp(firebaseConfig);

// 선언된 단 하나의 app 인스턴스를 각각의 서비스에 주입하여 export 합니다.
export const db = getFirestore(app);
export const auth = getAuth(app);