// Local-file validation only: no SQL/Firebase calls and no writes.
import { readStore } from '../src/orders/store.js';
await readStore();
console.log('Order store schema is valid (or not created yet); no data changed.');
