import React, { ButtonHTMLAttributes } from 'react';

export interface FeedbackButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  ariaLabel?: string;
}

export function FeedbackButton({
  position = 'bottom-right',
  ariaLabel = 'Open feedback form',
  className = '',
  style,
  children = 'Feedback',
  ...props
}: FeedbackButtonProps) {
  const positionStyles: Record<string, React.CSSProperties> = {
    'bottom-right': { position: 'fixed', bottom: '20px', right: '20px' },
    'bottom-left': { position: 'fixed', bottom: '20px', left: '20px' },
    'top-right': { position: 'fixed', top: '20px', right: '20px' },
    'top-left': { position: 'fixed', top: '20px', left: '20px' },
  };

  return (
    <button
      type="button"
      className={className}
      style={{ ...positionStyles[position], ...style }}
      aria-label={ariaLabel}
      {...props}
    >
      {children}
    </button>
  );
}
