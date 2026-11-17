# Prompt Voice (`@zcc-ext/prompt-voice`)

Voice dictation and Prompt Studio for Zana. Dictate directly in thread composers, from Zana's Home screen, or inside dedicated global and per-project Prompt Studio workspaces. Audio is transcribed using Zana's host speech-to-text service (or Local Whisper / direct OpenAI / Gemini), optionally refined with any configured Zana AI model, and added to your draft for review. Nothing is sent automatically.

The defaults use Zana's host services and need no external API key. Direct OpenAI, Gemini, and Anthropic providers are available with your own key.

## Surfaces & Placement

Prompt Voice integrates into four host surfaces, configurable from **Plugin Settings → Where Prompt Voice Appears**:

- **Main Home Screen Widget** (`homepageSection`): Quick-dictate directly into a new thread composer or launch Prompt Studio from Zana's main screen.
- **Project-Level Prompt Studio** (`projectTab`): A per-project **Prompt Studio** tab with isolated per-project drafts, pop-out window support (`detachedPlaceholder`), and new-thread compose fallback when no thread composer is active.
- **Global Prompt Studio** (`navPanel` & Command Palette): Accessible from the sidebar or `Prompt Studio: Open Canvas` / `Prompt Studio: Open in This Project` command palette actions.
- **Composer Mic Pill** (`composer.customize`): Scope-gated dictation button in thread composers (`Everywhere`, `Main screen composers only`, `Project composers only`, or `Hidden`).

## Settings

Configure in the plugin's settings section in Zana (and via **Prompt Studio → Settings**).

| Setting | Default | Notes |
|---|---|---|
| Show on main Home screen | `true` | Shows or hides the quick-dictate & studio card on Zana's Home screen |
| Show Prompt Studio in projects | `true` | Enables or hides the per-project **Prompt Studio** tab via `registerProjectTabAvailability` |
| Composer mic button | `both` | `both`, `main` (main screen only), `projects` (inside projects only), or `off` |
| Speech-to-text provider | `system` | `system` (Zana host voice transcription, no key), `local-whisper`, `openai`, or `google-gemini` (need an API key) |
| Speech-to-text model | empty | OpenAI / Gemini only. System transcription always uses the host-configured model |
| Cleanup (LLM) provider | `assistant` | `assistant` (Zana assistant inference, no key), `none`, or `openai` / `anthropic` / `google` (need an API key) |
| Cleanup model | empty | OpenAI / Anthropic / Google / Zana host model |
| Tone | `conversational` | `formal`, `casual`, `technical`, `conversational`, `custom` |
| Custom instructions | empty | Used when Tone is `custom` |
| Personal dictionary | empty | Names and jargon; one per line or comma-separated |
| Input language | `auto` | BCP-47 tag such as `en` or `de-DE`, or `auto` |
| Microphone input & sound cues | `default`, chimes `on` (`75%`) | Configured in Prompt Studio Settings |
| OpenAI / Google AI / Anthropic API key | empty | Secret. Only needed for the matching direct-API provider |

> [!NOTE]
> The default providers need no external API key. Keys are only needed if you pick a direct-API provider.

## Behavior

- Recording captures browser microphone audio. Recordings are capped at about two minutes (10 MB decoded).
- Speech-to-text routes to Zana's host transcription endpoint (`/api/v1/system/voice-transcription`), Local Whisper on-device server, or OpenAI / Google Gemini.
- Transcript refinement (cleanup) uses Zana's built-in assistant inference (`zcc.sdk.assistant.complete`), dynamically discovered Zana host models, or a direct API provider.
- If cleanup fails, the raw transcript is inserted and a notice explains why. The dictation is never lost.
- Silence or non-speech audio shows "No speech detected." and inserts nothing.
- Visibility setting changes broadcast immediately via `zcc.realtime` (`promptVoice:settingsChanged`) and update active surfaces live.

## Known limits

- **Insertion goes to the end of the draft.** The composer API exposes no caret position. Caret-aware insertion needs a Zana host API. When inserting from Prompt Studio without an active thread composer, it opens a new thread composer (`navigate.toCompose`) or copies to clipboard as a fallback.
- **Click to toggle only.** No hold-to-talk.
- **Microphone access depends on the Zana webview.**

## Verification status

| Check | Status |
|---|---|
| Unit and component tests (`npm test`) | All passing |
| Typecheck (`npm run typecheck`) | Passes without errors |
| Plugin bundle (`npm run build`) | Builds clean `server.mjs` and `app.js` bundles |

## Development

```bash
cd plugins/prompt-voice
npm install
npm test
npm run typecheck
npm run build
```
