// Small IndexedDB helper for storing audio blobs under 'aidc-audio' DB
export function openAudioDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("aidc-audio", 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("tracks")) db.createObjectStore("tracks");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveAudioBlob(id: string, blob: Blob): Promise<void> {
  const db = await openAudioDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("tracks", "readwrite");
    const store = tx.objectStore("tracks");
    const r = store.put(blob, id);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  });
}

export async function getAudioBlob(id: string): Promise<Blob | null> {
  const db = await openAudioDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("tracks", "readonly");
    const store = tx.objectStore("tracks");
    const r = store.get(id);
    r.onsuccess = () => {
      resolve(r.result || null);
      db.close();
    };
    r.onerror = () => {
      reject(r.error);
      db.close();
    };
  });
}

export async function deleteAudioBlob(id: string): Promise<void> {
  const db = await openAudioDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("tracks", "readwrite");
    const r = tx.objectStore("tracks").delete(id);
    r.onsuccess = () => resolve();
    r.onerror = () => reject(r.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => db.close();
  });
}

export default { openAudioDB, saveAudioBlob, getAudioBlob, deleteAudioBlob };
