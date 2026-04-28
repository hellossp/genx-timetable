import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION = 'subjects';

export const subjectService = {
  async getAll() {
    const snapshot = await getDocs(collection(db, COLLECTION));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getById(id) {
    const docRef = doc(db, COLLECTION, id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() };
  },

  async create(data) {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      periodsPerWeek: data.periodsPerWeek || 3,
      createdAt: new Date().toISOString(),
    });
    return { id: docRef.id, ...data };
  },

  async update(id, data) {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, data);
    return { id, ...data };
  },

  async delete(id) {
    const docRef = doc(db, COLLECTION, id);
    await deleteDoc(docRef);
  },
};
