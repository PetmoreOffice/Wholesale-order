import { Router } from 'express';
import { dialect, query } from '../config/db.js';
import { departmentIdsForGroup, departmentTree } from '../catalog/departments.js';
import { catalogFields, productJoins, sellableOnly, sizeRank } from '../catalog/sql.js';

export const productsRouter = Router();

const MAX_TERM = 100;

// Prices are not disclosed to customers; only admins see the reference price.
function forViewer(req, rows) {
  if (req.user.role === 'admin') return rows;
  return rows.map(({ basePrice, units, ...row }) => (units ? { ...row, units: forViewer(req, units) } : row));
}

// Drops the ranking columns the window functions add.
const withoutRanks = ({ sizeRank: _size, skuRank: _sku, unitCount: _count, ...row }) => row;

// A repeated query parameter arrives as an array; read only the first value.
function textParam(value) {
  return String((Array.isArray(value) ? value[0] : value) ?? '').trim();
}

function toPositiveInteger(value, fallback, maximum) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
}

// The shelf lists each SKU once, in its smallest unit (one row per unit size first, see
// sizeRank); unitCount says how many unit sizes the SKU sells in. Nested SELECTs rather than
// WITH, since assertReadOnly accepts statements that begin with SELECT only.
function catalogStatement(groupDepartmentIds) {
  const pagination = dialect === 'mssql'
    ? 'ORDER BY name, goodsId OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY'
    : 'ORDER BY name, goodsId LIMIT @limit OFFSET @offset';
  return `SELECT * FROM (
      SELECT sized.*,
        ROW_NUMBER() OVER (PARTITION BY sized.skuId ORDER BY sized.unitQuantity, sized.goodsId) AS skuRank,
        COUNT(*) OVER (PARTITION BY sized.skuId) AS unitCount
      FROM (SELECT ${catalogFields}, ${sizeRank} ${productJoins} ${catalogWhere(groupDepartmentIds)}) sized
      WHERE sized.sizeRank = 1
    ) ranked
    WHERE ranked.skuRank = 1
    ${pagination}`;
}

// Every unit size each listed SKU sells in, smallest first, for the unit picker.
async function unitsBySku(skuIds) {
  const units = new Map();
  if (!skuIds.length) return units;
  const rows = await query(
    `SELECT * FROM (
       SELECT ${catalogFields}, ${sizeRank} ${productJoins}
       WHERE ${sellableOnly} AND s.SKU_KEY IN (${skuIds.map((_, index) => '@sku' + index).join(', ')})
     ) sized
     WHERE sized.sizeRank = 1
     ORDER BY sized.skuId, sized.unitQuantity, sized.goodsId`,
    Object.fromEntries(skuIds.map((id, index) => ['sku' + index, id]))
  );
  for (const row of rows) {
    const key = Number(row.skuId);
    if (!units.has(key)) units.set(key, []);
    units.get(key).push(withoutRanks(row));
  }
  return units;
}

// groupDepartmentIds: every ICDEPT key in the chosen group, sent as bound parameters.
// A term matches the whole SKU: a hit on one unit's goods code (a case barcode, say) still
// lists the SKU in its smallest unit with all its units to pick from.
function catalogWhere(groupDepartmentIds = []) {
  const like = (column) => dialect === 'mssql' ? `${column} LIKE '%' + @term + '%'` : `${column} LIKE CONCAT('%', @term, '%')`;
  const matching = `${like('s.SKU_CODE')} OR ${like('s.SKU_BARCODE')} OR ${like('s.SKU_NAME')}
       OR EXISTS (SELECT 1 FROM dbo.GOODSMASTER gm WHERE gm.GOODS_SKU = s.SKU_KEY
         AND (${like('gm.GOODS_CODE')} OR ${like('gm.GOODS_ALIAS')}))`;
  return `WHERE ${sellableOnly} AND (@term = '' OR ${matching})
    AND (@categoryId IS NULL OR s.SKU_ICCAT = @categoryId)
    AND (@departmentId IS NULL OR d.ICDEPT_KEY = @departmentId OR d.ICDEPT_PARENT = @departmentId)
    ${groupDepartmentIds.length ? `AND d.ICDEPT_KEY IN (${groupDepartmentIds.map((_, index) => '@groupDept' + index).join(', ')})` : ''}`;
}

productsRouter.get('/', async (req, res, next) => {
  try {
    const pageSize = toPositiveInteger(req.query.limit, 50, 50);
    const offset = Math.max(0, Number.parseInt(req.query.offset, 10) || 0);
    const includeTotal = req.query.includeTotal === 'true';
    const categoryId = req.query.categoryId ? Number.parseInt(req.query.categoryId, 10) : null;
    const departmentId = req.query.departmentId ? Number.parseInt(req.query.departmentId, 10) : null;
    // A department narrows further than a group, so the group only applies on its own.
    const groupId = !Number.isInteger(departmentId) && textParam(req.query.groupId) ? textParam(req.query.groupId) : null;
    const groupDepartmentIds = groupId ? await departmentIdsForGroup(groupId) : [];
    if (groupId && !groupDepartmentIds) return res.status(400).json({ error: 'INVALID_GROUP', message: 'ไม่พบกลุ่มสินค้านี้' });
    const params = {
      term: textParam(req.query.q).slice(0, MAX_TERM),
      categoryId: Number.isInteger(categoryId) ? categoryId : null,
      departmentId: Number.isInteger(departmentId) ? departmentId : null,
      limit: pageSize,
      offset,
      ...Object.fromEntries(groupDepartmentIds.map((id, index) => ['groupDept' + index, id]))
    };
    const [rows, countRows] = await Promise.all([
      query(catalogStatement(groupDepartmentIds), params),
      includeTotal ? query(`SELECT COUNT(DISTINCT s.SKU_KEY) AS total ${productJoins} ${catalogWhere(groupDepartmentIds)}`, params) : Promise.resolve(null)
    ]);
    const total = countRows ? Number(countRows[0]?.total || 0) : undefined;
    const multiUnit = rows.filter((row) => Number(row.unitCount) > 1).map((row) => Number(row.skuId));
    const units = await unitsBySku(multiUnit);
    const data = rows.map((row) => ({ ...withoutRanks(row), units: units.get(Number(row.skuId)) || [withoutRanks(row)] }));
    res.json({ data: forViewer(req, data), pagination: {
      limit: pageSize,
      offset,
      hasMore: Number.isFinite(total) ? offset + rows.length < total : rows.length === pageSize,
      ...(Number.isFinite(total) ? { total, totalPages: Math.ceil(total / pageSize) } : {})
    } });
  } catch (error) { next(error); }
});

productsRouter.get('/categories', async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT DISTINCT c.ICCAT_KEY AS id, c.ICCAT_CODE AS code, c.ICCAT_NAME AS name
       ${productJoins}
       WHERE ${sellableOnly} AND c.ICCAT_KEY IS NOT NULL
       ORDER BY name`
    );
    res.json({ data: rows });
  } catch (error) { next(error); }
});

// Three-level shelf for the catalog: group (สุนัข, แมว, …) → department → sub-department,
// each with its count of sellable products. Nodes without products are left out.
productsRouter.get('/departments', async (_req, res, next) => {
  try {
    const groups = await departmentTree();
    res.json({ data: groups.map(({ departmentIds, ...group }) => group) });
  } catch (error) { next(error); }
});

productsRouter.get('/barcode/:barcode', async (req, res, next) => {
  try {
    // One row per unit size, smallest first: duplicate goods rows of a size are not choices.
    const rows = (await query(
      `SELECT * FROM (
         SELECT ${catalogFields}, ${sizeRank} ${productJoins}
         WHERE ${sellableOnly}
           AND (s.SKU_BARCODE = @barcode OR s.SKU_CODE = @barcode OR g.GOODS_CODE = @barcode)
       ) sized
       WHERE sized.sizeRank = 1
       ORDER BY sized.skuId, sized.unitQuantity, sized.goodsId`,
      { barcode: req.params.barcode.trim().slice(0, 64) }
    )).map(withoutRanks);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'PRODUCT_NOT_FOUND', message: 'ไม่พบสินค้าจากบาร์โค้ดนี้ กรุณาค้นหาด้วย SKU หรือชื่อสินค้า' });
    }
    return res.json({ data: forViewer(req, rows), requiresUnitSelection: rows.length > 1 });
  } catch (error) { return next(error); }
});

productsRouter.get('/:goodsId', async (req, res, next) => {
  try {
    const goodsId = Number.parseInt(req.params.goodsId, 10);
    if (!Number.isInteger(goodsId)) return res.status(400).json({ error: 'INVALID_GOODS_ID', message: 'goodsId ต้องเป็นตัวเลข' });
    const rows = await query(
      `SELECT ${catalogFields} ${productJoins}
       WHERE ${sellableOnly} AND g.GOODS_KEY = @goodsId`,
      { goodsId }
    );
    if (!rows[0]) return res.status(404).json({ error: 'PRODUCT_NOT_FOUND', message: 'ไม่พบสินค้า' });
    return res.json({ data: forViewer(req, rows)[0] });
  } catch (error) { next(error); }
});
