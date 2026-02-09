import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDQXJsVc3CTnMYQPUhXvx3YREjvCq48Rd8",
  authDomain: "leonardo-f364c.firebaseapp.com",
  projectId: "leonardo-f364c",
  storageBucket: "leonardo-f364c.firebasestorage.app",
  messagingSenderId: "1069516580302",
  appId: "1:1069516580302:web:a02a20b37b413494c9f79f",
};

export const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);

