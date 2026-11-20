import styles from '../../styles.css';

const STYLE_ELEMENT_ID = 'zcc-ext-draft-studio-styles';

/** Ensures the plugin stylesheet is injected once into the document head. */
export function ensureStylesInjected(): void {
  if (typeof document === 'undefined') return;
  let styleEl = document.getElementById(STYLE_ELEMENT_ID);
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = STYLE_ELEMENT_ID;
    document.head.appendChild(styleEl);
  }
  if (styleEl.textContent !== styles) {
    styleEl.textContent = styles;
  }
}
