# AI Usage Monitor (`@zcc-ext/ai-usage-monitor`)

Cross-provider consumption, spend, subscription quota windows, prepaid credit balances, budget tracking, and usage/error telemetry for **Zana Command Center**.

## Capabilities

- **Zero-config ZCC telemetry**: Indexes token usage (`input`, `cachedInput`, `output`, `reasoningOutput`), context window usage, rate-limit windows, model fallbacks, and provider errors across all Zana threads and subagents.
- **Provider & Model Discovery**: Enumerates every configured provider and model in Zana via `zcc.sdk.providers`, enriched with live quota windows (`/api/v1/system/usage-limits` when exposed by host + `provider/rateLimits/updated` events).
- **Optional Cloud Billing Collectors** (`secret: true` settings):
  - **OpenAI Admin API**: Organization costs & completion usage buckets.
  - **Anthropic Admin API**: Organization cost & message usage reports.
  - **OpenRouter API**: Live prepaid credit balance (`total_credits - total_usage`) & key rate limits.
- **Budgets & ZCC Inbox Alerts**: Configurable spending/token caps across `global`, `provider`, `model`, or `project` scopes (`5h`, `daily`, `weekly`, `monthly`), automatically pushing threshold warnings to ZCC Inbox.
- **CLI & Agent Tools**: `zcc ai-usage summary|quotas|budgets|logs` CLI commands and `ai_usage_summary` / `ai_usage_logs` native agent tools.
