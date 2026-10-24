# Gemini Provider

Run Zana threads with your **Google AI / Gemini Advanced subscription** through the official **Gemini CLI** (`@google/gemini-cli`) over the Agent Client Protocol (ACP).

---

## Highlights

* **Google Account Delegation**: Sign in via your browser with `gemini` in your terminal. This plugin never sees, stores, or handles your Google credentials.
* **Subscription Models**: Models (including Gemini 2.5 Pro and Gemini 2.5 Flash) are discovered dynamically through ACP from your active Google subscription.
* **Integrated Setup Doctor**: Check CLI installation, verify connectivity, and copy sign-in commands directly from **Settings → Plugins → Gemini Provider**.
* **Zero Configuration Needed**: Point and go. If you have the Gemini CLI installed and logged in, Gemini appears automatically in your Zana thread model picker.

---

## Quickstart

1. Install the official Gemini CLI globally:
   ```bash
   npm install -g @google/gemini-cli
   ```
2. Log in with your Google account:
   ```bash
   gemini
   ```
3. Open Zana, create a new thread, and select **Gemini** from the model dropdown.

---

## Configuration

In **Settings → Plugins → Gemini Provider**, you can:
* Verify connection status and installed CLI version.
* Customize the Gemini executable command or path (default: `gemini`).
