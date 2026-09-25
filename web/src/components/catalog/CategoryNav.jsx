import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, ListTree, X } from 'lucide-react';
import { count } from '../../lib/format.js';
import { Dialog, DialogClose, DialogTitle } from '@/components/ui/dialog';

// value: { g, d, s } = group id, department id, sub-department id (strings, '' when unset).
export function findCategory(groups, { g, d, s }) {
  const group = groups.find(item => item.id === g) || null;
  const pool = group ? group.departments : groups.flatMap(item => item.departments);
  const department = pool.find(item => String(item.id) === d) || null;
  const sub = department?.children.find(item => String(item.id) === s) || null;
  return { group: group || (department ? groups.find(item => item.departments.includes(department)) : null), department, sub };
}

export function categoryPath(groups, value) {
  const { group, department, sub } = findCategory(groups, value);
  return [group?.name, department?.name, sub?.name].filter(Boolean);
}

// Long levels (อุปกรณ์และของใช้ has 27 departments) show the first few plus the current pick.
const COLLAPSED_LIMIT = 8;

// scope: the parent the list belongs to, so "show all" folds up again on a new group or department.
function useCollapsible(items, selectedId, scope) {
  const [expandedScope, setExpandedScope] = useState(null);
  useEffect(() => { setExpandedScope(null); }, [scope]);
  const showAll = expandedScope === scope;
  if (showAll || items.length <= COLLAPSED_LIMIT + 1) return { visible: items, hidden: 0, toggle: showAll ? () => setExpandedScope(null) : null };
  const visible = items.slice(0, COLLAPSED_LIMIT);
  const selected = items.find(item => item.id === selectedId);
  if (selected && !visible.includes(selected)) visible.push(selected);
  return { visible, hidden: items.length - visible.length, toggle: () => setExpandedScope(scope) };
}

function MoreButton({ hidden, toggle }) {
  if (!toggle) return null;
  return <button type="button" className="category-more" onClick={toggle}>{hidden ? `แสดงเพิ่ม ${hidden} หมวด` : 'แสดงน้อยลง'}</button>;
}

function Chip({ selected, onClick, children, products }) {
  return (
    <button type="button" className="category-chip" aria-pressed={selected} onClick={onClick}>
      <span>{children}</span>
      {products !== undefined && <span className="chip-count num">{count.format(products)}</span>}
    </button>
  );
}

/**
 * Shelf navigation: a short row of groups (สุนัข, แมว, …) always visible; the chosen group's
 * departments, then the chosen department's sub-departments, open beneath it. On phones the
 * lower levels move into a picker sheet so nothing needs sideways scrolling.
 */
export function CategoryNav({ groups, value, onChange }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const { group, department, sub } = findCategory(groups, value);
  const total = groups.reduce((sum, item) => sum + item.products, 0);
  const pick = (next) => { onChange(next); setPickerOpen(false); };
  const departments = useCollapsible(group?.departments || [], department?.id, group?.id);
  const subs = useCollapsible(department?.children || [], sub?.id, department?.id);

  return (
    <div className="category-nav">
      <div className="category-groups" role="group" aria-label="กลุ่มสินค้า">
        <button type="button" aria-pressed={!group} onClick={() => onChange({})} title={`${count.format(total)} รายการ`}>ทั้งหมด</button>
        {groups.map(item => (
          <button type="button" key={item.id} aria-pressed={group?.id === item.id} onClick={() => onChange({ g: item.id })} title={`${count.format(item.products)} รายการ`}>{item.name}</button>
        ))}
      </div>

      {group && (
        <div className="category-level" role="group" aria-label={`หมวดใน${group.name}`}>
          <Chip selected={!department} onClick={() => onChange({ g: group.id })}>ทุกหมวดใน{group.name}</Chip>
          {departments.visible.map(item => (
            <Chip key={item.id} selected={department?.id === item.id} products={item.products} onClick={() => onChange({ g: group.id, d: String(item.id) })}>{item.name}</Chip>
          ))}
          <MoreButton {...departments} />
        </div>
      )}

      {department?.children.length > 0 && (
        <div className="category-level sub" role="group" aria-label={`หมวดย่อยของ${department.name}`}>
          <span className="category-level-label">{department.name}</span>
          <Chip selected={!sub} onClick={() => onChange({ g: group.id, d: String(department.id) })}>ทั้งหมด</Chip>
          {subs.visible.map(item => (
            <Chip key={item.id} selected={sub?.id === item.id} products={item.products} onClick={() => onChange({ g: group.id, d: String(department.id), s: String(item.id) })}>{item.name}</Chip>
          ))}
          <MoreButton {...subs} />
        </div>
      )}

      <button type="button" className="category-picker-button" onClick={() => setPickerOpen(true)}>
        <ListTree aria-hidden="true" />
        <span>{department ? [department.name, sub?.name].filter(Boolean).join(' › ') : group ? `ทุกหมวดใน${group.name}` : 'เลือกหมวดหมู่'}</span>
        <ChevronDown aria-hidden="true" />
      </button>

      {pickerOpen && <CategoryPicker groups={group ? [group] : groups} value={value} onPick={pick} onClose={() => setPickerOpen(false)} />}
    </div>
  );
}

function CategoryPicker({ groups, value, onPick, onClose }) {
  const [expanded, setExpanded] = useState(value.d || '');
  return (
    <Dialog className="review category-picker" labelledBy="category-picker-title" onClose={onClose}>
      <DialogClose className="icon-button close" aria-label="ปิด"><X aria-hidden="true" /></DialogClose>
      <DialogTitle id="category-picker-title">เลือกหมวดหมู่</DialogTitle>
      {groups.map(group => (
        <section key={group.id} className="picker-group" aria-label={group.name}>
          <button type="button" className="picker-row group-row" aria-pressed={value.g === group.id && !value.d} onClick={() => onPick({ g: group.id })}>
            <span>ทุกหมวดใน{group.name}</span><span className="num">{count.format(group.products)}</span>
          </button>
          <ul>
            {group.departments.map(department => {
              const id = String(department.id);
              const open = expanded === id;
              return (
                <li key={id}>
                  <div className="picker-row-wrap">
                    <button type="button" className="picker-row" aria-pressed={value.d === id && !value.s} onClick={() => onPick({ g: group.id, d: id })}>
                      <span>{department.name}</span><span className="num">{count.format(department.products)}</span>
                    </button>
                    {department.children.length > 0 ? (
                      <button type="button" className="icon-button" aria-expanded={open} aria-label={`${open ? 'ซ่อน' : 'แสดง'}หมวดย่อยของ ${department.name}`} onClick={() => setExpanded(open ? '' : id)}>
                        {open ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
                      </button>
                    ) : <span className="picker-spacer" aria-hidden="true" />}
                  </div>
                  {open && (
                    <ul className="picker-children">
                      {department.children.map(child => (
                        <li key={child.id}>
                          <button type="button" className="picker-row" aria-pressed={value.s === String(child.id)} onClick={() => onPick({ g: group.id, d: id, s: String(child.id) })}>
                            <span>{child.name}</span><span className="num">{count.format(child.products)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </Dialog>
  );
}
