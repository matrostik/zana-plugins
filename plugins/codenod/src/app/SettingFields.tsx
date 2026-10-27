import type { NumericSetting } from './types.ts';

/** A bounded number field that saves on blur when its value changed. */
export function NumberSetting(props: {
  id: NumericSetting;
  label: string;
  value: number;
  limits: { min: number; max: number };
  disabled?: boolean;
  onSave(value: number): void;
}) {
  const inputId = `cn-setting-${props.id}`;
  return (
    <div className="cn-field">
      <label htmlFor={inputId}>{props.label}</label>
      <input
        key={props.value}
        id={inputId}
        className="cn-input cn-number"
        type="number"
        min={props.limits.min}
        max={props.limits.max}
        step={1}
        disabled={props.disabled}
        defaultValue={props.value}
        onBlur={(event) => {
          const next = Number(event.target.value);
          if (event.target.value.trim() === '' || !Number.isFinite(next)) {
            event.target.value = String(props.value);
            return;
          }
          const clamped = Math.min(props.limits.max, Math.max(props.limits.min, Math.round(next)));
          event.target.value = String(clamped);
          if (clamped !== props.value) props.onSave(clamped);
        }}
      />
      <span className="cn-muted cn-small">
        {props.limits.min}–{props.limits.max}
      </span>
    </div>
  );
}
