import { definePluginApp } from '@zana-ai/zcc-plugin-sdk/app';
import { MicButton } from './src/app/MicButton.tsx';
import styles from './styles.css';

const STYLE_ELEMENT_ID = 'zcc-ext-prompt-voice-styles';

function ensureStylesInjected(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ELEMENT_ID)) return;
  const styleEl = document.createElement('style');
  styleEl.id = STYLE_ELEMENT_ID;
  styleEl.textContent = styles;
  document.head.appendChild(styleEl);
}

/** Registers the dictation button as a composer action in every thread composer. */
export default definePluginApp((app) => {
  ensureStylesInjected();
  app.composer.customize({
    id: 'prompt-voice-mic',
    actions: [{ id: 'prompt-voice-mic', component: MicButton }]
  });
});
