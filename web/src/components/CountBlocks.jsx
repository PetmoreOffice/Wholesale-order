import React from 'react';
import { count } from '@/lib/format';
import { cn } from '@/lib/utils';
import CountUp from '@/components/react-bits/CountUp';
import SpotlightCard from '@/components/react-bits/SpotlightCard';

/**
 * Counts as big numerals that roll up to their value, each on a card with a patch of warm
 * sunlight that follows the pointer. A `turn` block with a value fills kibble orange: it waits on the viewer.
 */
export function CountBlocks({ blocks, className }) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return (
    <dl className={cn('mb-6 grid gap-2 sm:gap-4', className)} style={{ gridTemplateColumns: `repeat(${blocks.length}, minmax(0, 1fr))` }}>
      {blocks.map(block => {
        const loud = block.turn && block.value > 0;
        const card = (
          <SpotlightCard
            key={block.label}
            theme="light"
            // Wake only under the pointer: a proximity halo kept every card measuring and
            // repainting on each mouse move anywhere on the page.
            proximity={0}
            spotlightColor={loud ? '#FFF1B8' : '#FFC94D'}
            intensity={loud ? 0.45 : 0.35}
            className={cn('!flex !rounded-[24px] !p-0 !shadow-[0_10px_28px_-14px_rgb(14_60_58/0.35)]', loud ? '!bg-kibble' : '!bg-panel')}
          >
            <div className={cn('flex w-full flex-col-reverse gap-1 border px-3 py-3 sm:px-5 sm:py-4 rounded-[24px]', loud ? 'border-kibble text-ink' : 'border-white')}>
              <dt className={cn('text-[13px] leading-tight font-semibold sm:text-[16px]', loud ? 'text-ink' : 'text-ink-2')}>{block.label}</dt>
              <dd className="num font-display text-[34px] leading-none font-medium sm:text-[46px]">
                {/* A count is data: without motion it is written out plainly, never left at 0. */}
                {reducedMotion ? count.format(block.value) : <CountUp to={block.value} duration={1.1} trigger="load" separator="," />}
              </dd>
            </div>
          </SpotlightCard>
        );
        // Two glints of sunlight run round the card that waits on the viewer: a turning gradient
        // behind a 3px ring. It turns on transform only, so the compositor runs it (the canvas
        // StarBorder it replaced redrew every frame and was the app's largest idle CPU cost).
        return loud ? (
          <div key={block.label} className="turn-glint relative isolate flex overflow-hidden rounded-[27px] bg-kibble p-[3px] [&>*]:w-full">
            <span aria-hidden="true" className="turn-glint-beam" />
            {card}
          </div>
        ) : card;
      })}
    </dl>
  );
}
