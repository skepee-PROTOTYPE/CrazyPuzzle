import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCK1nHodN5OeNXTq0KmhzSne1a7CNZhjpc",
  authDomain: "mygameapp-fe399.firebaseapp.com",
  projectId: "mygameapp-fe399",
  storageBucket: "mygameapp-fe399.firebasestorage.app",
  messagingSenderId: "858848894749",
  appId: "1:858848894749:web:b5d4111b06f56987b48bf4",
  measurementId: "G-8456NCNN5V"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };
