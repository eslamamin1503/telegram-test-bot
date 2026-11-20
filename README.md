# Health Education Telegram test bot

JavaScript Telegram webhook bot deployed on Cloudflare Workers.

## Features

- Egyptian Arabic interface for adults aged 18+.
- Four example topics: diabetes, high blood pressure, anemia and asthma.
- Twenty ready-made questions and answers per topic, eighty total.
- Five questions per page, with Previous/Next and return-to-diseases buttons.
- Free-text general health education using Gemini, then Cloudflare Workers AI if Gemini fails or reaches its limit.
- Educational-only and privacy notices. Users should not enter identifying or personal health information.
- Telegram webhook requests are checked against a secret header derived from the bot token.

The medical examples are placeholders, not reviewed patient guidance. Replace them with approved content before use beyond a test.

## Deployment

Worker: health-edu-bot
Live health check: https://health-edu-bot.eslam-amin1503.workers.dev/health
Bot: @Testforinstinctbot

Bindings:

- BOT_TOKEN: encrypted secret. Never put it in source control.
- GEMINI_API_KEY: encrypted secret. Never put it in source control.
- AI: Cloudflare Workers AI binding.

The Telegram webhook was configured during deployment. The temporary setup and diagnostic routes have been removed from the shipped code. If you change the bot token or hostname, reconfigure Telegram's webhook with a matching secret_token. The webhook secret is the SHA-256 hex digest of the string "telegram-webhook:" followed by BOT_TOKEN. Do not log either value.

Current models:

- Gemini: gemini-3.5-flash-lite.
- Cloudflare fallback: @cf/meta/llama-3.3-70b-instruct-fp8-fast.

Model availability and free quotas can change. This deployment has no paid-plan upgrade or payment card added. AI calls stop working when all available free quotas are exhausted, and the bot shows a retry message. Multiple keys do not remove a provider's account/project limits.

## Tests

Run: node test-worker.mjs

Tests use mock Telegram/AI responses. They check webhook authentication, the four menus, all eighty ready answers, pagination covering all twenty questions per topic, the privacy notice, the free-text answer flow and fallback after a primary-provider HTTP 429. These tests do not replace a real Telegram conversation check.

## Medical sources for the example Q&A

The source-grounded examples are not a clinician-reviewed protocol. WHO blood-pressure thresholds are attributed, not individual treatment targets. Emergency answers direct users to urgent help without assuming a local emergency number.

- WHO diabetes: https://www.who.int/en/news-room/fact-sheets/detail/diabetes/
- WHO hypertension: https://www.who.int/news-room/fact-sheets/detail/hypertension
- WHO anaemia: https://www.who.int/news-room/fact-sheets/detail/anaemia
- WHO asthma: https://www.who.int/en/news-room/fact-sheets/detail/asthma
- CDC low blood sugar: https://www.cdc.gov/diabetes/about/low-blood-sugar-hypoglycemia.html
- NHS iron-deficiency anaemia: https://www.nhs.uk/conditions/iron-deficiency-anaemia/
- NHS asthma: https://www.nhs.uk/conditions/asthma/

## Test-version limits

- Disease selection is kept in memory and can reset across restarts or be inconsistent across distributed instances. Add persistent storage before relying on per-user context.
- No durable update deduplication, queue or persistent rate limiter is included.
- AI output is not a diagnosis, prescription or substitute for a clinician. Do not use for emergencies.
- This is a test, not a production healthcare system. Before broader release, review medical content, privacy handling, consent, retention and access controls.
