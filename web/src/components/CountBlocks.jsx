import React from 'react';
import { count } from '@/lib/format';
import { cn } from '@/lib/utils';
import CountUp from '@/components/react-bits/CountUp';
import SpotlightCard from '@/components/react-bits/SpotlightCard';
import StarBorder from '@/components/react-bits/StarBorder';

/**
 * Counts as big numerals that roll up to their value, each on a card with a soft spotlight
 * that follows the pointer. A `turn` block with a value fills kibble orange: it waits on the viewer.
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
            spotlightColor={loud ? '#ffffff' : '#F07A3A'}
            intensity={loud ? 0.35 : 0.22}
            className={cn('!flex !rounded-[20px] !p-0 !shadow-none', loud ? '!bg-kibble' : '!bg-panel')}
          >
            <div className={cn('flex w-full flex-col-reverse gap-1 border px-3 py-3 sm:px-5 sm:py-4 rounded-[20px]', loud ? 'border-kibble text-ink' : 'border-line')}>
              <dt className={cn('text-[13px] leading-tight font-semibold sm:text-[16px]', loud ? 'text-ink' : 'text-ink-2')}>{block.label}</dt>
              <dd className="num font-display text-[34px] leading-none font-medium sm:text-[46px]">
                {/* A count is data: without motion it is written out plainly, never left at 0. */}
                {reducedMotion ? count.format(block.value) : <CountUp to={block.value} duration={1.1} trigger="load" separator="," />}
              </dd>
            </div>
          </SpotlightCard>
        );
        // A star runs round the card that waits on the viewer; the card is a plain rounded
        // rectangle, so the star's path matches its edge exactly.
        return loud ? (
          <StarBorder key={block.label} as="div" theme="light" radius={20} thickness={2} stars={2} glow={0.8} sparkle color="#ffffff" backgroundColor="transparent" textColor="var(--ink)" borderColor="transparent" hover="none" clickPulse={false} className="!flex !w-full !p-0 [&>div]:w-full">
            {card}
          </StarBorder>
        ) : card;
      })}
    </dl>
  );
}
