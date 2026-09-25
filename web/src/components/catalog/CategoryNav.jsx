import React, { useState } from 'react';
import { Popover } from 'radix-ui';
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

const isPhone = () => window.matchMedia('(max-width: 760px)').matches;
// A department column lists this many sub-departments before "อีก n หมวด".
const SUB_PREVIEW = 6;

/**
 * Shelf navigation (shadcn NavigationMenu pattern, opened by click so it works on touch):
 * one row of groups; choosing a group filters to it and opens a panel with every department
 * as a column and its sub-departments beneath. The chosen path then shows as a breadcrumb.
 * Phones get the same tree in a picker sheet instead of the panel.
 */
export function CategoryNav({ groups, value, onChange }) {
  const [openGroup, setOpenGroup] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const { group, department, sub } = findCategory(groups, value);
  const panelGroup = groups.find(item => item.id === openGroup);

  function chooseGroup(item) {
    if (group?.id !== item.id || department) onChange({ g: item.id });
    if (!isPhone()) setOpenGroup(current => current === item.id ? null : item.id);
  }
  function choose(next) {
    onChange(next);
    setOpenGroup(null);
    setPickerOpen(false);
  }

  return (
    <div className="category-nav">
      <Popover.Root open={Boolean(panelGroup)} onOpenChange={open => { if (!open) setOpenGroup(null); }}>
        <Popover.Anchor asChild>
          <div className="category-groups" role="group" aria-label="กลุ่มสินค้า">
            <button type="button" aria-pressed={!group} onClick={() => choose({})}>ทั้งหมด</button>
            {groups.map(item => (
              <button key={item.id} type="button" aria-pressed={group?.id === item.id} aria-expanded={openGroup === item.id} aria-haspopup="true" onClick={() => chooseGroup(item)}>
                {item.name}
                <ChevronDown aria-hidden="true" className="group-chevron" />
              </button>
            ))}
          </div>
        </Popover.Anchor>
        <Popover.Portal>
          <Popover.Content className="category-panel" align="start" sideOffset={6} collisionPadding={16} aria-label={panelGroup ? `หมวดใน${panelGroup.name}` : undefined}
            onInteractOutside={event => { if (event.target.closest?.('.category-groups')) event.preventDefault(); }}>
            {panelGroup && <CategoryPanel key={panelGroup.id} group={panelGroup} value={value} onPick={choose} />}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {group && (
        <nav className="category-trail" aria-label="หมวดที่เลือก">
          <ol>
            <li><button type="button" onClick={() => choose({ g: group.id })} aria-current={!department ? 'page' : undefined}>{group.name}</button></li>
            {department && <li><ChevronRight aria-hidden="true" /><button type="button" onClick={() => choose({ g: group.id, d: String(department.id) })} aria-current={!sub ? 'page' : undefined}>{department.name}</button></li>}
            {sub && <li><ChevronRight aria-hidden="true" /><span aria-current="page">{sub.name}</span></li>}
          </ol>
          <button type="button" className="trail-change" onClick={() => (isPhone() ? setPickerOpen(true) : setOpenGroup(group.id))}>เปลี่ยนหมวด</button>
          <button type="button" className="icon-button" aria-label="ล้างหมวดหมู่" title="ล้างหมวดหมู่" onClick={() => choose({})}><X aria-hidden="true" /></button>
        </nav>
      )}

      {!group && (
        <button type="button" className="category-picker-button" onClick={() => setPickerOpen(true)}>
          <ListTree aria-hidden="true" />
          <span>เลือกหมวดหมู่</span>
          <ChevronDown aria-hidden="true" />
        </button>
      )}

      {pickerOpen && <CategoryPicker groups={group ? [group] : groups} value={value} onPick={choose} onClose={() => setPickerOpen(false)} />}
    </div>
  );
}

function CategoryPanel({ group, value, onPick }) {
  const [expanded, setExpanded] = useState(() => new Set());
  const toggle = (id) => setExpanded(current => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  return (
    <>
      <div className="category-panel-head">
        <button type="button" className="panel-all" aria-pressed={value.g === group.id && !value.d} onClick={() => onPick({ g: group.id })}>
          ดูทุกหมวดใน{group.name} <span className="num">{count.format(group.products)}</span>
        </button>
        <span className="panel-hint"><span className="num">{count.format(group.departments.length)}</span> หมวด</span>
      </div>
      <div className="category-columns">
        {group.departments.map((department, index) => {
          const id = String(department.id);
          const showAll = expanded.has(id);
          const children = showAll ? department.children : department.children.slice(0, SUB_PREVIEW);
          const more = department.children.length - SUB_PREVIEW;
          return (
            <section key={id} className="category-column" style={{ '--stagger': `${Math.min(index, 12) * 18}ms` }}>
              <button type="button" className="column-title" aria-pressed={value.d === id && !value.s} onClick={() => onPick({ g: group.id, d: id })}>
                <span>{department.name}</span><span className="num">{count.format(department.products)}</span>
              </button>
              {department.children.length > 0 && (
                <ul>
                  {children.map(child => (
                    <li key={child.id}>
                      <button type="button" aria-pressed={value.s === String(child.id)} onClick={() => onPick({ g: group.id, d: id, s: String(child.id) })}>
                        <span>{child.name}</span><span className="num">{count.format(child.products)}</span>
                      </button>
                    </li>
                  ))}
                  {more > 0 && (
                    <li><button type="button" className="column-more" onClick={() => toggle(id)}>{showAll ? 'แสดงน้อยลง' : `อีก ${more} หมวด`}</button></li>
                  )}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </>
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
