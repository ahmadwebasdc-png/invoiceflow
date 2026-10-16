const test = require('node:test');
const assert = require('node:assert/strict');
const { createStorage } = require('../server/services/storageService');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

test('JSON storage persists data across storage instances', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(),'invoice-flow-test-'));
  try {
    const first = createStorage(dir); await first.ensure(); await first.write('invoices',[{id:'test',total:12}]);
    const second = createStorage(dir); assert.deepEqual(await second.read('invoices'),[{id:'test',total:12}]);
  } finally { await fs.rm(dir,{recursive:true,force:true}); }
});
