import assert from 'node:assert/strict';
import { assertReadOnly } from '../src/config/db.js';
import { catalogFields, orderItemFields, orderItemJoins, productJoins, sellableOnly } from '../src/catalog/sql.js';

const allowed = [
  'SELECT 1',
  `SELECT ${catalogFields} ${productJoins} WHERE ${sellableOnly}`,
  `SELECT ${orderItemFields} ${orderItemJoins} WHERE ${sellableOnly} AND g.GOODS_KEY = @goodsId`,
  `SELECT COUNT(*) AS total ${productJoins} WHERE ${sellableOnly}`,
  // SQL Server catalog paging (products.js) must keep working.
  `SELECT ${catalogFields} ${productJoins} WHERE ${sellableOnly} ORDER BY name, goodsId OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
  "SELECT 'DELETE' AS label",
  'SELECT u.UPDATE_DATE, s.SKU_USAGE AS usage FROM dbo.SKUMASTER s'
];
const refused = [
  'DELETE FROM x',
  'SELECT 1; DELETE FROM x',
  'SELECT * INTO x FROM y',
  'SELECT NEXT VALUE FOR seq',
  "SELECT * FROM OPENQUERY(remote, 'anything')",
  // T-SQL batches without a semicolon
  "SELECT 1 WAITFOR DELAY '00:00:05'",
  'SELECT 1 DISABLE TRIGGER t ON dbo.GOODSMASTER',
  'SELECT 1 ENABLE TRIGGER t ON dbo.GOODSMASTER',
  'SELECT 1 UPDATETEXT dbo.t.c @p 0 NULL',
  'SELECT 1 WRITETEXT dbo.t.c @p 0x00',
  'SELECT 1 DBCC FREEPROCCACHE',
  'SELECT 1 SHUTDOWN',
  'SELECT 1 KILL 55',
  'SELECT 1 USE master',
  'SELECT 1 DECLARE @x INT SET @x = 1',
  "SELECT 1 BULK INSERT t FROM 'c:\\x'",
  'SELECT 1 RECONFIGURE',
  "SELECT 1 EXEC sp_executesql N'x'"
];
for (const sql of allowed) assert.doesNotThrow(() => assertReadOnly(sql), sql);
for (const sql of refused) assert.throws(() => assertReadOnly(sql), undefined, sql);
console.log(`Read-only guard checks passed (${allowed.length} allowed, ${refused.length} refused); no database connection used.`);
