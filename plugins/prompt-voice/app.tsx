import { definePluginApp } from '@zana-ai/zcc-plugin-sdk/app';
import { MicButton, ensureStylesInjected } from './src/app/MicButton.tsx';
import { PromptStudio } from './src/app/PromptStudio.tsx';

export const PROMPT_STUDIO_PANEL_PATH = 'prompt-studio';

/**
 * Registers Prompt Voice's composer mic button and Prompt Studio screen.
 */
export default definePluginApp((app) => {
  ensureStylesInjected();

  // Thread Composer mic action
  app.composer.customize({
    id: 'prompt-voice-mic',
    actions: [{ id: 'prompt-voice-mic', component: MicButton }]
  });

  // Dedicated Prompt Studio global navigation screen
  app.slots.navPanel?.({
    id: 'prompt-studio',
    title: 'Prompt Studio',
    icon: 'Sparkles',
    path: PROMPT_STUDIO_PANEL_PATH,
    component: PromptStudio
  });

  // Command palette quick open
  app.slots.commandPaletteAction?.({
    id: 'open-prompt-studio',
    title: 'Prompt Studio: Open Canvas',
    run: (ctx: { navigate?: (path: string) => void }) => {
      ctx.navigate?.(`/${PROMPT_STUDIO_PANEL_PATH}`);
    }
  });
});
