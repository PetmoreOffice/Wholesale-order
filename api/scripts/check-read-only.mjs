import assert from 'node:assert/strict';
import { assertReadOnly } from '../src/config/db.js';
import { catalogFields, productJoins, sellableOnly } from '../src/catalog/sql.js';
for (const sql of ['SELECT 1', `SELECT ${catalogFields} ${productJoins} WHERE ${sellableOnly}`, "SELECT 'DELETE' AS label"]) assert.doesNotThrow(() => assertReadOnly(sql));
for (const sql of ['DELETE FROM x', 'SELECT 1; DELETE FROM x', 'SELECT * INTO x FROM y', 'SELECT NEXT VALUE FOR seq', "SELECT * FROM OPENQUERY(remote, 'anything')"]) assert.throws(() => assertReadOnly(sql));
console.log('Read-only guard checks passed; no database connection used.');
