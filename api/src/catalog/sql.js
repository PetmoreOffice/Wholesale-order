export const catalogFields = `
  g.GOODS_KEY AS goodsId, g.GOODS_CODE AS goodsCode,
  s.SKU_KEY AS skuId, s.SKU_CODE AS sku, NULLIF(s.SKU_BARCODE, '') AS barcode,
  COALESCE(NULLIF(LTRIM(RTRIM(g.GOODS_ALIAS)), ''), NULLIF(LTRIM(RTRIM(s.SKU_NAME)), ''), g.GOODS_CODE) AS name,
  NULLIF(s.SKU_E_NAME, '') AS englishName,
  c.ICCAT_KEY AS categoryId, c.ICCAT_CODE AS categoryCode, c.ICCAT_NAME AS categoryName,
  d.ICDEPT_KEY AS departmentId, d.ICDEPT_CODE AS departmentCode,
  COALESCE(NULLIF(LTRIM(RTRIM(d.ICDEPT_THAIDESC)), ''), NULLIF(LTRIM(RTRIM(d.ICDEPT_ENGDESC)), '')) AS departmentName,
  u.UTQ_KEY AS unitId, u.UTQ_NAME AS unitName, u.UTQ_QTY AS unitQuantity,
  s.SKU_MIN_ORDER AS minimumOrder, s.SKU_MAX_ORDER AS maximumOrder,
  s.SKU_STOCK AS stockTracked, s.SKU_LEAD_TIME AS leadTimeDays,
  s.SKU_SPEC AS specification, s.SKU_USAGE AS usage, s.SKU_REMARK AS remark,
  g.GOODS_PRICE AS basePrice`;

export const orderItemFields = `g.GOODS_KEY AS goodsId, g.GOODS_CODE AS goodsCode, s.SKU_KEY AS skuId, s.SKU_CODE AS sku, COALESCE(NULLIF(LTRIM(RTRIM(g.GOODS_ALIAS)), ''), NULLIF(LTRIM(RTRIM(s.SKU_NAME)), ''), g.GOODS_CODE) AS name, u.UTQ_NAME AS unitName, u.UTQ_QTY AS unitQuantity, s.SKU_MIN_ORDER AS minimumOrder, s.SKU_MAX_ORDER AS maximumOrder`;

export const orderItemJoins = 'FROM dbo.GOODSMASTER g INNER JOIN dbo.SKUMASTER s ON s.SKU_KEY = g.GOODS_SKU LEFT JOIN dbo.UOFQTY u ON u.UTQ_KEY = g.GOODS_UTQ';

export const productJoins = `
  FROM dbo.GOODSMASTER g
  INNER JOIN dbo.SKUMASTER s ON s.SKU_KEY = g.GOODS_SKU
  LEFT JOIN dbo.ICCAT c ON c.ICCAT_KEY = s.SKU_ICCAT
  LEFT JOIN dbo.ICDEPT d ON d.ICDEPT_KEY = s.SKU_ICDEPT
  LEFT JOIN dbo.UOFQTY u ON u.UTQ_KEY = g.GOODS_UTQ`;

// Numbers each goods row within its SKU and unit size. Several goods rows often share both
// (alternate barcodes) at the same price, so rank 1 is the row coded like the SKU, then the
// oldest. L-prefixed rows never get here: sellableOnly drops them. Keep `sizeRank = 1` to list each unit size once.
export const sizeRank = `ROW_NUMBER() OVER (
  PARTITION BY s.SKU_KEY, u.UTQ_QTY
  ORDER BY CASE WHEN g.GOODS_CODE = s.SKU_CODE THEN 0 ELSE 1 END, g.GOODS_KEY) AS sizeRank`;

// Product categories (ICCAT codes) kept off the web entirely: KK is "แคมเปญคละ KK", mixed
// campaign bundles sold another way. Matched by code so it needs no join in any query.
export const hiddenCategoryCodes = ['KK'];

// Goods codes starting with L are the ERP's dozen-price rows (12 or more of one item key in at
// the cheaper L code). The web never orders on them: customers pick the normal row and the
// admin switches to L in the ERP when the quantity qualifies.
export const sellableOnly = `
  g.GOODS_ENABLE = 'Y' AND g.GOODS_P_ENABLE = 'Y'
  AND g.GOODS_CODE NOT LIKE 'L%'
  AND s.SKU_ENABLE = 'Y' AND s.SKU_P_ENABLE = 'Y'
  AND COALESCE(g.GOODS_ALIAS, '') NOT LIKE '%เลิกผลิต%'
  AND COALESCE(s.SKU_NAME, '') NOT LIKE '%เลิกผลิต%'
  AND NOT EXISTS (SELECT 1 FROM dbo.ICCAT hidden WHERE hidden.ICCAT_KEY = s.SKU_ICCAT
    AND hidden.ICCAT_CODE IN (${hiddenCategoryCodes.map((code) => `'${code}'`).join(', ')}))`;
