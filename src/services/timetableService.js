import {
  collection, doc, getDocs, addDoc, deleteDoc, query, where
} from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION = 'timetables';

export const timetableService = {
  async getAll() {
    const snapshot = await getDocs(collection(db, COLLECTION));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getByClassAndSection(classId, sectionId) {
    const q = query(
      collection(db, COLLECTION),
      where('classId', '==', classId),
      where('sectionId', '==', sectionId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async save(data) {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      createdAt: new Date().toISOString(),
    });
    return { id: docRef.id, ...data };
  },

  async delete(id) {
    const docRef = doc(db, COLLECTION, id);
    await deleteDoc(docRef);
  },
};
