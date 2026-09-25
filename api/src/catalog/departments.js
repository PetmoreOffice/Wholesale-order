import { query } from '../config/db.js';
import { productJoins, sellableOnly } from './sql.js';

// ICDEPT has two real levels (department → sub-department) but no row above its level-0
// departments. The company codes them by leading digit, so the top shelf is derived from
// the code here. Edit this list if the coding convention changes; unmatched codes fall
// into "อื่นๆ".
const departmentGroups = [
  { id: 'dog', name: 'สุนัข', match: (code) => /^0\d\d$/.test(code) && code !== '000' },
  { id: 'cat', name: 'แมว', match: (code) => /^1\d\d$/.test(code) },
  { id: 'other-pets', name: 'สัตว์อื่น & สุขภาพ', match: (code) => /^2\d\d$/.test(code) },
  { id: 'supplies', name: 'อุปกรณ์และของใช้', match: (code) => /^3\d\d$/.test(code) },
];
const otherGroup = { id: 'other', name: 'อื่นๆ' };

const CACHE_MS = 10 * 60 * 1000;
let cache = null;

// Some names carry a shelf location such as "A-06-2" or a leading "-"; neither means anything to a buyer.
const shelfCode = /[A-Z]-\d+(?:-\d+)*/.source;
const cleanName = (name) => String(name || '')
  .replace(new RegExp(`\\s+${shelfCode}\\s*$`), '')
  .replace(new RegExp(`^${shelfCode}\\s+`), '')
  .replace(/^[-–\s]+/, '')
  .trim();

// "อาหารสุนัขชนิดเม็ด แบบถุง" under "อาหารสุนัข ชนิดเม็ด" reads better as "แบบถุง".
function shortChildName(child, parent) {
  const squash = (value) => value.replace(/\s+/g, '');
  const target = squash(parent);
  if (!target || !squash(child).startsWith(target)) return child;
  let seen = 0;
  let index = 0;
  while (index < child.length && seen < target.length) {
    if (!/\s/.test(child[index])) seen += 1;
    index += 1;
  }
  return cleanName(child.slice(index)) || child;
}

async function buildTree() {
  // Read-only: both statements go through query(), which only accepts SELECT.
  const [rows, counts] = await Promise.all([
    query(`SELECT d.ICDEPT_KEY AS id, LTRIM(RTRIM(d.ICDEPT_CODE)) AS code, d.ICDEPT_LEVEL AS level, d.ICDEPT_PARENT AS parentId,
             COALESCE(NULLIF(LTRIM(RTRIM(d.ICDEPT_THAIDESC)), ''), LTRIM(RTRIM(d.ICDEPT_ENGDESC))) AS name
           FROM dbo.ICDEPT d`),
    query(`SELECT d.ICDEPT_KEY AS id, COUNT(*) AS products ${productJoins} WHERE ${sellableOnly} AND d.ICDEPT_KEY IS NOT NULL GROUP BY d.ICDEPT_KEY`)
  ]);
  const byId = new Map(rows.map((row) => [row.id, { ...row, name: cleanName(row.name), products: 0, children: [] }]));

  // Every product counts toward its own department and each ancestor above it.
  for (const { id, products } of counts) {
    for (let node = byId.get(id), guard = 0; node && guard < 10; node = byId.get(node.parentId), guard += 1) {
      node.products += Number(products) || 0;
    }
  }

  const roots = [];
  for (const node of byId.values()) {
    if (!node.products) continue;
    if (node.level === 0) roots.push(node);
    else if (node.level === 1) byId.get(node.parentId)?.children.push(node);
  }
  const byCode = (a, b) => a.code.localeCompare(b.code);
  const groups = [...departmentGroups, otherGroup].map((group) => ({ id: group.id, name: group.name, products: 0, departments: [], departmentIds: [] }));
  for (const root of roots.sort(byCode)) {
    const group = groups[departmentGroups.findIndex((candidate) => candidate.match(root.code))] || groups[groups.length - 1];
    const children = root.children.sort(byCode).map((child) => ({ id: child.id, code: child.code, name: shortChildName(child.name, root.name), fullName: child.name, products: child.products }));
    group.departments.push({ id: root.id, code: root.code, name: root.name, products: root.products, children });
    group.products += root.products;
    // Every ICDEPT key in this group (including any deeper test rows), for the group filter.
    for (const node of byId.values()) {
      for (let walk = node, guard = 0; walk && guard < 10; walk = byId.get(walk.parentId), guard += 1) {
        if (walk.id === root.id) { group.departmentIds.push(node.id); break; }
      }
    }
  }
  return groups.filter((group) => group.departments.length);
}

export async function departmentTree() {
  if (!cache || Date.now() - cache.at > CACHE_MS) cache = { at: Date.now(), groups: await buildTree() };
  return cache.groups;
}

export async function departmentIdsForGroup(groupId) {
  const group = (await departmentTree()).find((candidate) => candidate.id === groupId);
  return group ? group.departmentIds : null;
}
