# Antigravity Provider

Run Zana threads with your **Google Antigravity subscription** through the **Antigravity CLI** (`agy`) over the Agent Client Protocol (ACP).

---

## Highlights

* **Google Antigravity Subscription**: Access Google's flagship models including **Gemini 4 Argon**, **Gemini 3.8 Flash**, **Claude Opus 5.5**, and **Claude Sonnet 5.5** directly inside Zana threads.
* **Automatic CLI Delegation**: Seamlessly uses your active `agy` authentication and environment.
* **Dynamic Model Discovery & Robust Fallbacks**: Discovers all active models via `agy models` while keeping reliable built-in fallback profiles so your model picker is never blank.
* **Integrated Setup Doctor**: Check `agy` installation, verify connectivity, and inspect model commands directly from **Settings → Plugins → Antigravity Provider**.

---

## Quickstart

1. Ensure the Antigravity CLI (`agy`) is installed and available in your terminal PATH:
   ```bash
   agy --version
   ```
2. Authenticate with your Google account:
   ```bash
   agy
   ```
3. Open Zana, create a new thread, and select **Antigravity** from the model dropdown.

---

## Configuration

In **Settings → Plugins → Antigravity Provider**, you can:
* Verify connection status and installed `agy` version.
* Customize the Antigravity executable command or path (default: `agy`).
