# Prompt Voice (`@zcc-ext/prompt-voice`)

Voice dictation for Zana composers. Click the mic button, speak, click again. The server transcribes the audio using Zana's host speech-to-text service, optionally cleans it up with an existing Zana AI model, and appends the text to your draft. Nothing is sent automatically.

The defaults use Zana's host services and need no external API key. Direct OpenAI, Gemini, and Anthropic providers are available with your own key.

## Settings

Configure in the plugin's settings section in Zana.

| Setting | Default | Notes |
|---|---|---|
| Speech-to-text provider | `system` | `system` (Zana host voice transcription, no key), `openai`, or `google-gemini` (need an API key) |
| Speech-to-text model | empty | OpenAI / Gemini only. System transcription always uses the host-configured model |
| Cleanup (LLM) provider | `assistant` | `assistant` (Zana assistant inference, no key), `none`, or `openai` / `anthropic` / `google` (need an API key) |
| Cleanup model | empty | OpenAI / Anthropic / Google only. The assistant always uses its own model |
| Tone | `conversational` | `formal`, `casual`, `technical`, `conversational`, `custom` |
| Custom instructions | empty | Used when Tone is `custom` |
| Personal dictionary | empty | Names and jargon; one per line or comma-separated |
| Input language | `auto` | BCP-47 tag such as `en` or `de-DE`, or `auto` |
| OpenAI / Google AI / Anthropic API key | empty | Secret. Only needed for the matching direct-API provider |

> [!NOTE]
> The default providers need no external API key. Keys are only needed if you pick a direct-API provider.

## Behavior

- Recording is webm/opus from the browser microphone. Recordings are capped at about two minutes (10 MB decoded).
- Speech-to-text routes directly to Zana's host transcription endpoint (`/api/v1/system/voice-transcription`).
- Transcript refinement (cleanup) uses Zana's built-in assistant inference (`zcc.sdk.assistant.complete`), a bounded text-only call with no agent tools or project access, or a direct API provider. Each cleanup call times out after 30 seconds.
- If cleanup fails, the raw transcript is inserted and a notice explains why. The dictation is never lost.
- Silence or non-speech audio shows "No speech detected." and inserts nothing.

## Known limits

- **Insertion goes to the end of the draft.** The composer API exposes no caret position. Caret-aware insertion needs a Zana host API.
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
