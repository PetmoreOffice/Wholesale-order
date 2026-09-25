import React from 'react';

/**
 * React Bits AnimatedContent, reduced to a CSS entrance for this operational UI.
 * Content is fully visible at rest: the animation only plays once on mount, never waits
 * for scroll, and is disabled by prefers-reduced-motion (see index.css).
 */
export function AnimatedContent({
  children,
  className = '',
  distance = 18,
  direction = 'vertical',
  reverse = false,
  duration = 0.42,
  delay = 0,
}) {
  const offset = `${reverse ? -distance : distance}px`;
  const style = {
    '--enter-x': direction === 'horizontal' ? offset : '0px',
    '--enter-y': direction === 'horizontal' ? '0px' : offset,
    '--enter-duration': `${duration}s`,
    '--enter-delay': `${delay}s`,
  };
  return <div className={`animated-content ${className}`} style={style}>{children}</div>;
}
