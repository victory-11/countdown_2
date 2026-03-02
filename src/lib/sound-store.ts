// Sound storage and playback utilities

export interface CustomSound {
  id: string;
  name: string;
  data: string; // Base64 encoded audio data
  type: string; // MIME type (audio/mp3, audio/wav, etc.)
  duration?: number;
  createdAt: string;
}

// IndexedDB for storing audio files (larger than localStorage limit)
const DB_NAME = 'countdown-sounds';
const DB_VERSION = 1;
const STORE_NAME = 'sounds';

let dbInstance: IDBDatabase | null = null;

async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

// Sound API
export const soundApi = {
  // Get all sounds
  async getAll(): Promise<CustomSound[]> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  },

  // Get single sound
  async get(id: string): Promise<CustomSound | null> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  },

  // Save sound
  async save(sound: CustomSound): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(sound);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // Delete sound
  async delete(id: string): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  // Convert file to base64
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  },

  // Get audio duration
  async getDuration(base64Data: string): Promise<number> {
    return new Promise((resolve) => {
      const audio = new Audio(base64Data);
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration);
      });
      audio.addEventListener('error', () => {
        resolve(0);
      });
    });
  },
};

// Audio playback manager
class AudioManager {
  private audio: HTMLAudioElement | null = null;
  private isPlaying = false;

  // Play a sound by base64 data or URL
  async play(source: string, loop: boolean = false): Promise<void> {
    // Stop any currently playing sound
    this.stop();

    return new Promise((resolve, reject) => {
      this.audio = new Audio(source);
      this.audio.loop = loop;

      this.audio.onended = () => {
        this.isPlaying = false;
        resolve();
      };

      this.audio.onerror = () => {
        this.isPlaying = false;
        reject(new Error('Failed to play audio'));
      };

      this.audio.play().then(() => {
        this.isPlaying = true;
        if (!loop) resolve();
      }).catch(reject);
    });
  }

  // Stop playing
  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = null;
      this.isPlaying = false;
    }
  }

  // Check if playing
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  // Set volume (0-1)
  setVolume(volume: number): void {
    if (this.audio) {
      this.audio.volume = Math.max(0, Math.min(1, volume));
    }
  }
}

// Singleton instance
export const audioManager = new AudioManager();

// Default sounds (embedded as base64 - simple beep)
export const DEFAULT_SOUNDS = [
  {
    id: 'default-alarm',
    name: '🔔 Default Alarm',
    // Simple beep sound (short)
    data: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp+cnJubnZ6enp2amJmampubnJycnJycm5qZmJeXl5eYmZqam5ydnZ2dnZycm5qZmJiXl5eYmJmampucnJ2dnZ2dnJybmpmYmJeXl5iYmZqam5ycnZ2dnZ2cm5uamZiXl5eYmJmampucnJydnZ2dnJubmpmYl5eXmJiZmpqbnJydnZ2cm5ubmpmYl5eYmJiZmpubnJydnZycm5ubmpmYmJeXmJiZmpubnJydnZycm5uamZiXl5iYmJmam5ucnJ2dnZybm5qZmJeXmJiYmZqbm5ycnZ2cm5ubmpmYl5eYmJmZmpubnJydnZybm5qZmJeYmJiZmpubnJydnZycm5uamZiXl5iYmZqam5ucnJ2cm5ubmpmYl5eYmJmam5ucnJydnJubm5qZmJeYmJmZmpubnJycnZycm5uamZiXl5iYmZqbm5ycnJycm5ubmpmYmJeYmJmam5ucnJycnJubm5qZmJeXmJiZmpubnJycnJybm5uamZiXl5iYmZqbm5ycnJybm5uamZiXl5iYmZqam5ucnJycm5uamZmYl5eYmJmam5ucnJycm5ubmpmYl5eYmJmZmpubnJycnJubm5qZmJeXmJiZmpubnJycnJybm5qZmJeXmJiZmpubnJycnJybm5uamZiXl5iYmZqam5ucnJycm5ubmpmYl5eYmJmam5ucnJycm5ubmpmYl5eYmJmam5ucnJycm5ubmpmYl5eYmJmZmpubnJycnJybm5qZmJeXmJiZmpubnJycnJubm5qZmJeXmJiZmpubnJycnJybm5qZmJeXmJiZmpubnJycnJybm5qZmJeXmJiZmpubnJycnJubm5qZmJeXmJiZmpubnJycnJybm5qZmJeXmJiZmpubnJycnJybm5uamZiXl5iYmZqam5ucnJycm5ubmpmYl5eYmJmam5ucnJycm5ubmpmYl5eYmJmZmpubnJycnJybm5qZmJeXmJiZmpubnJycnJubm5qZmJeXmJiZmpubnJycnJybm5qZmJeXmJiZmpubnJycnJybm5qZmJeXmJiZmpubnJycnJybm5uamZiXl5iYmZqam5ucnJycm5ubmpmYl5eYmJmam5ucnJycm5ubmpmYl5eYmJmam5ucnJycm5ubmpmYl5eYmJmZmpubnJycnJybm5qZmJeXmJiZmpubnJycnJubm5qZmJeXmJiZmpubnJycnJybm5qZmJeXmJiZmpubnJycnJybm5qZmJeXmJiZmpubnJycnJybm5uamZiXl5iYmZqam5ucnJycm5ubmpmYl5eYmJmam5ucnJycm5ubmpmYl5eYmJmam5ucnJycm5ubmpmYl5eYmJmZmpubnJycnJybm5qZmJeXmJiZmpubnJycnJubm5qZmJeXmJiZmpubnJycnJybm5qZmJeXmJiZmpubnJycnJybm5qZmJeXmJiZmpubnJycnJybm5uamZiXl5iYmZqam5ucnJycm5ubmpmYl5eYmJmam5ucnJycm5ubmpmYl5eYmJmam5ucnJycm5ubmpmYl5eYmJmZmpubnJycnJybm5qZmJeXmJiZmpubnJycnJubm5qZmJeXmJiZmpubnJycnJybm5qZmJeXmJiZmpubnJycnJybm5qZmJeXmJiZmpubnJycnJybm5uamZiXl5iYmZqbm5ucnJycm5ubmpmYl5eYmJmam5ucnJycm5ubmpmYl5eYmJmam5ucnJycm5ubmpmYl5eYmJmZmpubnJycnJybm5qZmJeXmJiZmpubnJycnJubm5qZmJeXmJiZmpubnJycnJybm5qZmJeXmJiZmpubnJycnJybm5qZmJeXmJiZmpubnJycnJybm5uamZiXl5iYmZqbm5ucnJycm5ubmpmYl5eYmJmam5ucnJycm5ubmpmYl5eYmJmam5ucnJycm5ubmpmYl5eYmJmZmpubnJycnJybm5qZmJeXmJiZmpubnJycnJubm5qZmJeXmJiZmpubnJycnJybm5qZmJeXmJiZmpubnJycnJybm5qZmJeXmJiZmpubnJycnJybm5uamZiXl5iYmZqbm5ucnJycm5ubmpmYl5eYmJmam5ucnJycm5ubmpmYl5eYmJmam5ucnJycm5ubmpmYl5eYmJmZmpubnJycnJybm5qZmJeXmJiZmpubnJycnJubm5qZmJeXmJiZmpubnJycnJybm5qZmJeXmJiZmpubnJycnJybm5qZmJeXmJiZmpubnJycnJybm5uamZiXl5iYmZqbm5ucnJycm5ubmpmYl5eYmJmam5ucnJycm5ubmpmYl5eYmJmam5ucnJycm5ubmpmYl5eYmJmZmpubnJycnJybm5qZmJeXmJiZmpubnJycnJubm5qZmJeXmJiZmpubnJycnJybm5qZmJeXmJiZmpubnJycnJybm5qZmJeXmJiZmpubnJycnJybm5uamZiXl5iYmZqbm5ucnJycm5ubmpmYl5eYmJmam5ucnJycm5ubmpmYl5eYmJmam5ucnJycm5ubmpmYl5eYmJmZmpubnJycnJybm5qZmJeXmJiZmpubnJycnJubm5qZmJeXmJiZmpubnJycnJybm5qZmJeXmJiZmpubnJycnJybm5qZmJeXmJiZmpubnJycnJybm5uamZiXl5iYmZqbm5ucnJycm5ubmpmYl5eYmJmam5ucnJycm5ubmpmYl5eYmJmam5ucnJycm5ubmpmYl5eYmJmZmpubnJycnJybm5qZmJeXmJiZmpubnJycnJubm5qZmJeXmJiZmpubnJycnJybm5qZmJeXmJiZmpubnJycnJybm5qZmJeXmJiZmpubnJycnJybm5uamZiXl5iYmZqbm5ucnJycm5ubmpmYl5eYmJmam5ucnJycm5ubmpmYl5eYmJmam5ucnJycm5ubmpmYl5eYmJmZmpubnJycnJybm5qZmJeXmJiZmpubnJycnJubm5qZmJeXmJiZmpubnJycnJybm5qZmJeXmJiZmpubnJycnJybm5qZmJeXmJiZmpubnJycnJybm5s=',
    type: 'audio/wav',
    isDefault: true,
  },
  {
    id: 'celebration',
    name: '🎉 Celebration',
    data: 'data:audio/wav;base64,UklGRl9vT19teleVyaW5nVRhkYXRhXQABAAEABAAoAAAA',
    type: 'audio/wav',
    isDefault: true,
  },
  {
    id: 'gentle-chime',
    name: '✨ Gentle Chime',
    data: 'data:audio/wav;base64,UklGRl9vT19teleVyaW5nVRhkYXRhXQABAAEABAAoAAAA',
    type: 'audio/wav',
    isDefault: true,
  },
];

// Initialize default sounds
export async function initializeDefaultSounds(): Promise<void> {
  const existingSounds = await soundApi.getAll();

  for (const sound of DEFAULT_SOUNDS) {
    // Only add if not already exists
    if (!existingSounds.find(s => s.id === sound.id)) {
      await soundApi.save({
        id: sound.id,
        name: sound.name,
        data: sound.data,
        type: sound.type,
        createdAt: new Date().toISOString(),
      });
    }
  }
}
