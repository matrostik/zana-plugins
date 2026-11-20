# Draft Studio (`@zcc-ext/draft-studio`)

Voice dictation, on-device Local Whisper, AI writing refinement, and translation for Zana Command Center. Dictate directly in thread composers, from Zana's Home screen, or inside dedicated global and per-project **Draft Studio** workspaces. Shape spoken, typed, or pasted drafts with tone presets, summarization, technical spec generation, translation, word-level diffs, and searchable activity history — then insert into your composer for review. Nothing is sent automatically.

The defaults use Zana's host services and require no external API key. On-device **Local Whisper** (Windows x64 and Linux x64) and direct **OpenAI**, **Google Gemini**, and **Anthropic** providers are available as optional alternatives.

## Features

- **Voice Dictation Everywhere**: Record from thread composers, the Home screen quick-dictate card, or the Draft Studio canvas with live audio metering, selectable microphone input, optional sound cues, and a personal spelling dictionary.
- **On-Device Local Whisper**: Install a pinned `whisper.cpp` server runtime and download verified multilingual Whisper models directly from **Draft Studio → Settings** for offline transcription.
- **AI Writing & Transformation Workbench**:
  - **Improve writing**: Fix grammar, spelling, punctuation, filler words, and phrasing across five tones (`Standard`, `Casual`, `Conversational`, `Professional`, `Technical`) without padding length.
  - **Summarize**: Condense rough notes into crisp executive bullet points.
  - **Create a technical spec**: Structure rough ideas into `## Goal`, `## Architecture`, and `## Implementation Steps`.
  - **Translate**: Translate drafts naturally into a chosen target language while preserving code blocks, identifiers, URLs, and Markdown.
  - **Custom instructions**: Run freeform transformations on your draft.
- **Diff Review & Multi-Model Selection**: Inspect word-level diffs between input and refined output, switch between dynamically discovered Zana host models (sorted cheapest-first) or direct API providers, and sync automatically with the active composer provider.
- **Activity History & Privacy Controls**: Search, filter, star, and reload past dictations and refinements, with configurable entry/age retention limits and one-click history clearing.

## Surfaces & Placement

Draft Studio integrates into four host surfaces, configurable from **Plugin Settings → Where Draft Studio Appears** (or **Draft Studio → Settings**):

- **Main Home Screen Widget** (`homepageSection`): Quick-dictate directly into a new thread composer, open Draft Studio, or jump to History from Zana's Home screen.
- **Project-Level Draft Studio** (`projectTab`): A per-project **Draft Studio** tab with isolated per-project drafts, pop-out window support (`detachedPlaceholder`), and new-thread compose fallback when no thread composer is active.
- **Global Draft Studio** (`navPanel` & Command Palette): Accessible from the sidebar or via `Draft Studio: Open Canvas`, `Draft Studio: Open History`, and `Draft Studio: Open in This Project`.
- **Composer Mic Pill** (`composer.customize`): Scope-gated dictation button in thread composers (`Everywhere`, `Main screen composers only`, `Project composers only`, or `Hidden`).

## Settings

Configure in Zana's **Draft Studio** plugin settings and inside **Draft Studio → Settings**.

| Setting | Default | Notes |
|---|---|---|
| Show on main Home screen | `true` | Shows or hides the quick-dictate & studio card on Zana's Home screen |
| Show Draft Studio tab in projects | `true` | Enables or hides the per-project **Draft Studio** tab via `registerProjectTabAvailability` |
| Composer mic button placement | `both` | `both`, `main` (main screen only), `projects` (inside projects only), or `off` |
| Speech-to-text provider | `system` | `system` uses Zana host voice transcription. `local-whisper` requires an installed runtime and model. `openai` and `google-gemini` require an API key. |
| Speech-to-text model | empty | OpenAI / Gemini only. System transcription always uses the host-configured model. |
| Cleanup (LLM) provider | `assistant` | `assistant` (Zana assistant inference, no key), `none`, or `openai` / `anthropic` / `google` (require an API key) |
| Cleanup model | empty | OpenAI / Anthropic / Google / discovered Zana host model |
| Tone | `standard` | `standard`, `casual`, `conversational`, `formal` (Professional), `technical`, `custom` |
| Custom instructions | empty | Used when Tone is `custom` |
| Personal dictionary | empty | Names, acronyms, and jargon; one per line or comma-separated |
| Input language | `auto` | BCP-47 tag such as `en` or `de-DE`, or `auto` |
| Microphone input & sound cues | `default`, chimes `on` (`75%`) | Configured in Draft Studio Settings |
| Activity history | `true` | Saves successful dictations and refinements. Turn off to stop adding entries. |
| History retention | 500 entries, 90 days | Applies to unstarred entries. Set either limit to `0` for unlimited entries or indefinite retention. |
| OpenAI / Google AI / Anthropic API key | empty | Secret. Only needed for the matching direct-API provider |

> [!NOTE]
> The default providers require no external API key. Keys are only needed if you pick a direct-API provider.

## Behavior

- Recording captures browser microphone audio capped at roughly two minutes (10 MB decoded). Draft Studio stops and transcribes the captured audio when the limit is reached.
- Speech-to-text routes to Zana's host transcription endpoint (`/api/v1/system/voice-transcription`), a managed Local Whisper server (`whisper.cpp`), or direct OpenAI / Google Gemini APIs.
- Refinement and cleanup use Zana's built-in assistant inference (`zcc.sdk.assistant.complete`), dynamically discovered Zana host models, or a direct API provider.
- If automatic cleanup fails during dictation, the raw transcript is returned along with a notice explaining the failure.
- Silence or non-speech audio shows `"No speech detected."` and inserts nothing.
- Visibility setting changes broadcast immediately via `zcc.realtime` (`draftStudio:settingsChanged`) and update active surfaces live.

## Activity History

History stores successful transcripts and refinements for review. You can search and filter entries by type, source, project, or starred status, load past items back into Draft Studio, copy outputs, or delete entries. Disabling history stops new entries from being saved while leaving existing entries accessible until deleted or cleared.

Retention limits apply to unstarred entries when new activity is saved, retention settings change, or History is opened. Starred entries are exempt from automatic pruning and can be deleted manually.

## Known Limits

- **Insertion appends to the end of the draft.** The host composer API exposes no caret position. When inserting from Draft Studio without an active thread composer, it opens a new thread composer (`navigate.toCompose`) or copies to clipboard as a fallback.
- **Click to toggle only.** No hold-to-talk shortcut yet.
- **Local Whisper native binaries** are currently verified on Windows x64 and Linux x64 (macOS and arm64 are not yet enabled).
- **Microphone access** depends on the Zana desktop webview permissions.

## Verification Status

| Check | Status |
|---|---|
| Unit and component tests (`npm test`) | All passing |
| Typecheck (`npm run typecheck`) | Passes without errors |
| Plugin bundle (`npm run build`) | Builds clean `server.mjs` and `app.js` bundles |
| Marketplace & manifest checks | Passes `check-feed.mjs` and `check-plugins.mjs` |

## Development

```bash
cd plugins/draft-studio
npm install
npm test
npm run typecheck
npm run build
```

## Release Notes

### 0.2.0
- **Renamed to Draft Studio (`@zcc-ext/draft-studio`, plugin id `draft-studio`)**: Unified the previous `Prompt Voice` / `Prompt Studio` naming into a single cohesive identity across the plugin manifest, marketplace feed, UI surfaces, RPC methods (`draftStudio.*`), realtime channels (`draftStudio:*`), storage keys, and documentation.
- **Breaking change for existing `prompt-voice` installs**: Install `draft-studio@zana-community` (and uninstall the legacy `prompt-voice` plugin if previously installed). Local settings, browser drafts, history, and Local Whisper runtime paths now live under `draft-studio`.

### 0.1.0
- Initial release (as `Prompt Voice` / `Prompt Studio`): composer and Home voice dictation, managed Local Whisper runtime/models, Improve writing tones, Summarize, Technical Spec, Translate, Custom instructions, word-level diffs, per-project workspaces, and searchable activity history.
