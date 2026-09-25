import { Router } from 'express';
import { dialect, query } from '../config/db.js';
import { catalogFields, productJoins, sellableOnly } from '../catalog/sql.js';

export const productsRouter = Router();

function toPositiveInteger(value, fallback, maximum) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
}

function catalogStatement() {
  const pagination = dialect === 'mssql'
    ? 'ORDER BY name, goodsId OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY'
    : 'ORDER BY name, goodsId LIMIT @limit OFFSET @offset';
  return `SELECT ${catalogFields}
    ${productJoins}
    ${catalogWhere()}
    ${pagination}`;
}

function catalogWhere() {
  const matching = dialect === 'mssql'
    ? `g.GOODS_CODE LIKE '%' + @term + '%' OR s.SKU_CODE LIKE '%' + @term + '%'
       OR s.SKU_BARCODE LIKE '%' + @term + '%' OR s.SKU_NAME LIKE '%' + @term + '%'
       OR g.GOODS_ALIAS LIKE '%' + @term + '%'`
    : `g.GOODS_CODE LIKE CONCAT('%', @term, '%') OR s.SKU_CODE LIKE CONCAT('%', @term, '%')
       OR s.SKU_BARCODE LIKE CONCAT('%', @term, '%') OR s.SKU_NAME LIKE CONCAT('%', @term, '%')
       OR g.GOODS_ALIAS LIKE CONCAT('%', @term, '%')`;
  return `WHERE ${sellableOnly} AND (@term = '' OR ${matching})
    AND (@categoryId IS NULL OR s.SKU_ICCAT = @categoryId)
    AND (@departmentId IS NULL OR d.ICDEPT_KEY = @departmentId OR d.ICDEPT_PARENT = @departmentId)`;
}

productsRouter.get('/', async (req, res, next) => {
  try {
    const pageSize = toPositiveInteger(req.query.limit, 50, 50);
    const offset = Math.max(0, Number.parseInt(req.query.offset, 10) || 0);
    const includeTotal = req.query.includeTotal === 'true';
    const categoryId = req.query.categoryId ? Number.parseInt(req.query.categoryId, 10) : null;
    const departmentId = req.query.departmentId ? Number.parseInt(req.query.departmentId, 10) : null;
    const params = {
      term: (req.query.q || '').trim(),
      categoryId: Number.isInteger(categoryId) ? categoryId : null,
      departmentId: Number.isInteger(departmentId) ? departmentId : null,
      limit: pageSize,
      offset
    };
    const [rows, countRows] = await Promise.all([
      query(catalogStatement(), params),
      includeTotal ? query(`SELECT COUNT(*) AS total ${productJoins} ${catalogWhere()}`, params) : Promise.resolve(null)
    ]);
    const total = countRows ? Number(countRows[0]?.total || 0) : undefined;
    res.json({ data: rows, pagination: {
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

productsRouter.get('/departments', async (_req, res, next) => {
  try {
    const rows = await query(
      `SELECT root.ICDEPT_KEY AS id, root.ICDEPT_CODE AS code,
              COALESCE(NULLIF(LTRIM(RTRIM(root.ICDEPT_THAIDESC)), ''), root.ICDEPT_ENGDESC) AS name
       FROM dbo.ICDEPT root
       WHERE root.ICDEPT_LEVEL = 0 AND root.ICDEPT_KEY <> 0
         AND EXISTS (
           SELECT 1
           FROM dbo.GOODSMASTER g
           INNER JOIN dbo.SKUMASTER s ON s.SKU_KEY = g.GOODS_SKU
           LEFT JOIN dbo.ICDEPT d ON d.ICDEPT_KEY = s.SKU_ICDEPT
           WHERE ${sellableOnly} AND (d.ICDEPT_KEY = root.ICDEPT_KEY OR d.ICDEPT_PARENT = root.ICDEPT_KEY)
         )
       ORDER BY root.ICDEPT_CODE`
    );
    res.json({ data: rows });
  } catch (error) { next(error); }
});

productsRouter.get('/barcode/:barcode', async (req, res, next) => {
  try {
    const rows = await query(
      `SELECT ${catalogFields}
       ${productJoins}
       WHERE ${sellableOnly}
         AND (s.SKU_BARCODE = @barcode OR s.SKU_CODE = @barcode OR g.GOODS_CODE = @barcode)
       ORDER BY unitName, goodsId`,
      { barcode: req.params.barcode.trim() }
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'PRODUCT_NOT_FOUND', message: 'ไม่พบสินค้าจากบาร์โค้ดนี้ กรุณาค้นหาด้วย SKU หรือชื่อสินค้า' });
    }
    return res.json({ data: rows, requiresUnitSelection: rows.length > 1 });
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
    return res.json({ data: rows[0] });
  } catch (error) { next(error); }
});
