export const productFields = `
  g.GOODS_KEY AS goodsId, g.GOODS_CODE AS goodsCode,
  s.SKU_KEY AS skuId, s.SKU_CODE AS sku, NULLIF(s.SKU_BARCODE, '') AS barcode,
  COALESCE(NULLIF(LTRIM(RTRIM(g.GOODS_ALIAS)), ''), NULLIF(LTRIM(RTRIM(s.SKU_NAME)), ''), g.GOODS_CODE) AS name,
  NULLIF(s.SKU_E_NAME, '') AS englishName,
  c.ICCAT_KEY AS categoryId, c.ICCAT_CODE AS categoryCode, c.ICCAT_NAME AS categoryName,
  u.UTQ_KEY AS unitId, u.UTQ_NAME AS unitName, u.UTQ_QTY AS unitQuantity,
  s.SKU_MIN_ORDER AS minimumOrder, s.SKU_MAX_ORDER AS maximumOrder,
  s.SKU_STOCK AS stockTracked, s.SKU_LEAD_TIME AS leadTimeDays,
  s.SKU_SPEC AS specification, s.SKU_USAGE AS usage, s.SKU_REMARK AS remark,
  g.GOODS_PRICE AS basePrice`;

export const orderProductFields = 'g.GOODS_KEY AS goodsId, g.GOODS_CODE AS goodsCode, s.SKU_KEY AS skuId, s.SKU_CODE AS sku, COALESCE(NULLIF(LTRIM(RTRIM(g.GOODS_ALIAS)), \'\'), NULLIF(LTRIM(RTRIM(s.SKU_NAME)), \'\'), g.GOODS_CODE) AS name, u.UTQ_NAME AS unitName, u.UTQ_QTY AS unitQuantity, s.SKU_MIN_ORDER AS minimumOrder';

export const productJoins = `
  FROM dbo.GOODSMASTER g
  INNER JOIN dbo.SKUMASTER s ON s.SKU_KEY = g.GOODS_SKU
  LEFT JOIN dbo.ICCAT c ON c.ICCAT_KEY = s.SKU_ICCAT
  LEFT JOIN dbo.UOFQTY u ON u.UTQ_KEY = g.GOODS_UTQ`;

export const orderProductJoins = 'FROM dbo.GOODSMASTER g INNER JOIN dbo.SKUMASTER s ON s.SKU_KEY = g.GOODS_SKU LEFT JOIN dbo.UOFQTY u ON u.UTQ_KEY = g.GOODS_UTQ';

export const sellableOnly = `
  g.GOODS_ENABLE = 'Y' AND g.GOODS_P_ENABLE = 'Y'
  AND s.SKU_ENABLE = 'Y' AND s.SKU_P_ENABLE = 'Y'
  AND COALESCE(g.GOODS_ALIAS, '') NOT LIKE '%เลิกผลิต%'
  AND COALESCE(s.SKU_NAME, '') NOT LIKE '%เลิกผลิต%'`;
