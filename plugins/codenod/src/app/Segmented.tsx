import { useRef, type KeyboardEvent } from 'react';

export interface SegmentedOption<T extends string> {
  id: T;
  label: string;
}

/**
 * Pill-style single choice. `tabs` switches views (tablist/tab); `radio` picks a value (radiogroup/radio).
 * Arrow keys, Home, and End move the selection with a roving tab stop.
 */
export function Segmented<T extends string>(props: {
  label: string;
  options: Array<SegmentedOption<T>>;
  value: T;
  onChange(value: T): void;
  role?: 'tabs' | 'radio';
  disabled?: boolean;
  className?: string;
}) {
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  const isTabs = (props.role ?? 'tabs') === 'tabs';
  const current = Math.max(0, props.options.findIndex((option) => option.id === props.value));

  const move = (event: KeyboardEvent<HTMLButtonElement>) => {
    const last = props.options.length - 1;
    const next =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? current === last ? 0 : current + 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? current === 0 ? last : current - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    props.onChange(props.options[next].id);
    buttons.current[next]?.focus();
  };

  return (
    <div className={`cn-segmented ${props.className ?? ''}`} role={isTabs ? 'tablist' : 'radiogroup'} aria-label={props.label}>
      {props.options.map((option, index) => {
        const selected = index === current;
        return (
          <button
            key={option.id}
            ref={(element) => {
              buttons.current[index] = element;
            }}
            type="button"
            className="cn-tab"
            role={isTabs ? 'tab' : 'radio'}
            {...(isTabs ? { 'aria-selected': selected } : { 'aria-checked': selected })}
            tabIndex={selected ? 0 : -1}
            disabled={props.disabled}
            onClick={() => props.onChange(option.id)}
            onKeyDown={move}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
