import React, { useEffect, useState } from 'react';
import { DatabaseBackup, History, UsersRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { ActivitySection } from './ActivitySection.jsx';
import { DataSection } from './DataSection.jsx';
import { UsersSection } from './UsersSection.jsx';

const sections = [
  { id: 'users', label: 'ผู้ใช้งาน', icon: UsersRound },
  { id: 'data', label: 'ข้อมูลและการสำรอง', icon: DatabaseBackup },
  { id: 'activity', label: 'บันทึกกิจกรรม', icon: History }
];

/** Which section is on screen, for the nav highlight. */
function useCurrentSection() {
  const [current, setCurrent] = useState(() => sections.find(section => `#${section.id}` === window.location.hash)?.id || sections[0].id);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible) setCurrent(visible.target.id);
    }, { rootMargin: '-80px 0px -55% 0px' });
    sections.forEach(section => { const node = document.getElementById(section.id); if (node) observer.observe(node); });
    return () => observer.disconnect();
  }, []);
  return [current, setCurrent];
}

export default function AdminSettings() {
  const [current, setCurrent] = useCurrentSection();

  function jump(event, id) {
    event.preventDefault();
    setCurrent(id);
    const node = document.getElementById(id);
    node?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${id}`);
    node?.querySelector('h2')?.setAttribute('tabindex', '-1');
    node?.querySelector('h2')?.focus({ preventScroll: true });
  }

  return (
    <>
      <PageHeader title="ตั้งค่า" description="บัญชีผู้ใช้ ข้อมูลคำสั่งซื้อ และบันทึกกิจกรรมของระบบ" />
      <div className="grid items-start gap-5 lg:grid-cols-[208px_minmax(0,1fr)]">
        <nav aria-label="หมวดการตั้งค่า" className="sticky top-14 z-20 -mx-4 overflow-x-auto border-b border-line bg-ground/95 px-4 py-2 backdrop-blur lg:top-20 lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          <ul className="flex gap-1 lg:flex-col">
            {sections.map(section => {
              const active = current === section.id;
              return (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`} onClick={event => jump(event, section.id)} aria-current={active ? 'location' : undefined}
                    className={cn('flex items-center gap-2.5 rounded-md px-3 py-2 text-[15px] whitespace-nowrap transition-colors', active ? 'bg-panel font-bold text-brand-deep shadow-lift lg:shadow-none lg:ring-1 lg:ring-line' : 'font-semibold text-ink-2 hover:bg-panel hover:text-ink')}
                  >
                    <section.icon aria-hidden="true" className={cn('size-[18px]', active ? 'text-brand' : 'text-ink-3')} />
                    {section.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="grid min-w-0 gap-6">
          <UsersSection />
          <DataSection />
          <ActivitySection />
        </div>
      </div>
    </>
  );
}
