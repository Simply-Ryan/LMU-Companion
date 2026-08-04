import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "graphic-imagery-q9v0l",
  appId: "1:1058663246159:web:2d931341b2caec77a33d3a",
  apiKey: "AIzaSyDtvcLjnDOrAsIlcsEYjx84dKe3mIM8xsk",
  authDomain: "graphic-imagery-q9v0l.firebaseapp.com",
  storageBucket: "graphic-imagery-q9v0l.firebasestorage.app",
  messagingSenderId: "1058663246159",
  measurementId: ""
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, "ai-studio-lmucompanion-df13d905-22d8-44fc-b4d4-8caa1587d723");
