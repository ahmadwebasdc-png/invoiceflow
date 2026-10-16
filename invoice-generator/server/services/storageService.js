const fs = require('node:fs/promises');
const path = require('node:path');

function createStorage(dataDir) {
  const queue = new Map();
  const files = {
    invoices: path.join(dataDir, 'invoices.json'),
    clients: path.join(dataDir, 'clients.json'),
    settings: path.join(dataDir, 'settings.json')
  };

  async function ensure() {
    await fs.mkdir(dataDir, { recursive: true });
    for (const [key, file] of Object.entries(files)) {
      try { await fs.access(file); }
      catch { await fs.writeFile(file, JSON.stringify(key === 'settings' ? {} : [], null, 2)); }
    }
  }

  async function read(key) {
    if (!files[key]) throw new Error('Unknown storage collection');
    await ensure();
    try {
      const raw = await fs.readFile(files[key], 'utf8');
      return JSON.parse(raw);
    } catch (error) {
      if (error instanceof SyntaxError) throw new Error(`Stored ${key} data is malformed. Back up and repair ${files[key]}.`);
      throw error;
    }
  }

  async function write(key, data) {
    if (!files[key]) throw new Error('Unknown storage collection');
    const previous = queue.get(key) || Promise.resolve();
    const operation = previous.catch(() => {}).then(async () => {
      await ensure();
      const target = files[key];
      const temp = `${target}.${process.pid}.tmp`;
      await fs.writeFile(temp, JSON.stringify(data, null, 2), 'utf8');
      await fs.rename(temp, target);
    });
    queue.set(key, operation);
    try { await operation; } finally { if (queue.get(key) === operation) queue.delete(key); }
  }

  return { ensure, read, write };
}

module.exports = { createStorage };
