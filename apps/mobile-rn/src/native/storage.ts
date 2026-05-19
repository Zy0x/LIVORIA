type StorageMap = Record<string, string>;

const memoryStorage: StorageMap = {};

export const mobileStorageAdapter = {
  async getItem(key: string) {
    return memoryStorage[key] ?? null;
  },
  async removeItem(key: string) {
    delete memoryStorage[key];
  },
  async setItem(key: string, value: string) {
    memoryStorage[key] = value;
  },
};

export const storageAdapterName = 'memory-placeholder';
