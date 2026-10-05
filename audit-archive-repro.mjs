// Read the implementation as text; mock filesystem entirely. No production data access.
import fs from 'node:fs';
import vm from 'node:vm';
import { validateArchive } from './api/src/orders/schema.js';
const source = fs.readFileSync(new URL('./api/src/orders/store.js', import.meta.url), 'utf8');
const code = source.slice(source.indexOf('async function readArchive('), source.indexOf('export async function listArchives'));
for (const input of [{ orders: { unexpected: true } }, { wrongKey: [{ orderId: 123 }] }]) {
  const context = vm.createContext({ validateArchive, fs: { readFile: async () => JSON.stringify(input) } });
  try {
    const result = await vm.runInContext(code + '; readArchive("mock-only")', context);
    console.log(JSON.stringify({ input, result }));
  } catch (error) { console.log(JSON.stringify({ input, rejected: error.message })); }
}
