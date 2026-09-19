import type { SavedPresentation, VideoClip } from '../types';

const DB_NAME = 'BulletpointDB';
const DB_VERSION = 1;
const STORE_PRESENTATIONS = 'presentations';
const STORE_BLOBS = 'video_blobs';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_PRESENTATIONS)) {
        db.createObjectStore(STORE_PRESENTATIONS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Fast save / update of presentation metadata only (scenes, timestamps, name, duration, thumbnail).
 * Overwrites existing record with the same id in IndexedDB without touching video blobs.
 */
export async function savePresentationMetadata(
  presentation: SavedPresentation
): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_PRESENTATIONS, 'readwrite');
      const store = tx.objectStore(STORE_PRESENTATIONS);
      store.put(presentation);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to update presentation metadata:', err);
  }
}

/**
 * Save presentation metadata and video blobs to IndexedDB
 */
export async function savePresentationToStorage(
  presentation: SavedPresentation,
  clips: VideoClip[]
): Promise<void> {
  try {
    const db = await openDB();

    // 1. Save presentation metadata
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_PRESENTATIONS, 'readwrite');
      const store = tx.objectStore(STORE_PRESENTATIONS);
      store.put(presentation);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    // 2. Save video blobs
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      let blob: Blob | null = clip.file || null;

      if (!blob && clip.url) {
        try {
          const resp = await fetch(clip.url);
          blob = await resp.blob();
        } catch (e) {
          console.warn('Could not fetch blob for clip:', clip.name, e);
        }
      }

      if (blob) {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE_BLOBS, 'readwrite');
          const store = tx.objectStore(STORE_BLOBS);
          const blobRecord = {
            id: `${presentation.id}_clip_${i}`,
            presId: presentation.id,
            clipIndex: i,
            name: clip.name,
            duration: clip.duration,
            blob,
          };
          store.put(blobRecord);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });
      }
    }
  } catch (err) {
    console.error('Failed to save presentation to IndexedDB:', err);
  }
}

/**
 * Get all saved presentations metadata
 */
export async function getAllPresentationsFromStorage(): Promise<SavedPresentation[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PRESENTATIONS, 'readonly');
      const store = tx.objectStore(STORE_PRESENTATIONS);
      const request = store.getAll();
      request.onsuccess = () => {
        const list = (request.result as SavedPresentation[]) || [];
        // Sort descending by updatedAt
        list.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(list);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to get presentations from IndexedDB:', err);
    return [];
  }
}

/**
 * Load a presentation and re-hydrate its video clips with fresh object URLs
 */
export async function loadPresentationFromStorage(
  id: string
): Promise<{ presentation: SavedPresentation; clips: VideoClip[]; videoUrl: string } | null> {
  try {
    const db = await openDB();

    // 1. Get presentation metadata
    const presentation: SavedPresentation | null = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PRESENTATIONS, 'readonly');
      const store = tx.objectStore(STORE_PRESENTATIONS);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });

    if (!presentation) return null;

    // 2. Get all blobs for this presentation
    interface BlobRecord {
      id: string;
      presId: string;
      clipIndex: number;
      name: string;
      duration: number;
      blob: Blob;
    }

    const allBlobs: BlobRecord[] = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_BLOBS, 'readonly');
      const store = tx.objectStore(STORE_BLOBS);
      const request = store.getAll();
      request.onsuccess = () => {
        const records = (request.result as BlobRecord[]) || [];
        resolve(records.filter((r) => r.presId === id));
      };
      request.onerror = () => reject(request.error);
    });

    // Sort by clipIndex
    allBlobs.sort((a, b) => a.clipIndex - b.clipIndex);

    // Reconstruct VideoClips with fresh object URLs
    const clips: VideoClip[] = allBlobs.map((r) => {
      const url = URL.createObjectURL(r.blob);
      const file = r.blob instanceof File ? r.blob : new File([r.blob], r.name, { type: r.blob.type || 'video/mp4' });
      return {
        id: `clip-${Date.now()}-${r.clipIndex}`,
        name: r.name,
        url,
        duration: r.duration,
        file,
      };
    });

    const videoUrl = clips.length > 0 ? clips[0].url : '';

    return {
      presentation,
      clips,
      videoUrl,
    };
  } catch (err) {
    console.error('Failed to load presentation from IndexedDB:', err);
    return null;
  }
}

/**
 * Delete a presentation and its video blobs
 */
export async function deletePresentationFromStorage(id: string): Promise<void> {
  try {
    const db = await openDB();

    // 1. Delete presentation metadata
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_PRESENTATIONS, 'readwrite');
      const store = tx.objectStore(STORE_PRESENTATIONS);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    // 2. Delete all blobs for this presentation
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_BLOBS, 'readwrite');
      const store = tx.objectStore(STORE_BLOBS);
      const request = store.getAllKeys();
      request.onsuccess = () => {
        const keys = (request.result as string[]) || [];
        keys.forEach((k) => {
          if (k.startsWith(`${id}_clip_`)) {
            store.delete(k);
          }
        });
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to delete presentation from IndexedDB:', err);
  }
}
