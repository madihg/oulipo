# experimental/ - Machine Dreaming layer

This folder contains a sandboxed test environment for an optional, generative
extension of votivepatina. Nothing in here is part of the artwork.

---

## What this is

`generative.html` lets you feed a prayer line to the Anthropic Messages API
and see a machine-dreamt alternative expansion side by side with Halim's
authored text. The difference between the two is the point: the machine
approximates the voice but cannot inhabit it.

The generative path is architecturally isolated:

- `GENERATIVE_ENABLED = false` is the exported constant in
  `lib/generative-expansion.js`. It is never flipped to `true` in the
  shipped build.
- `lib/generative-expansion.js` is **never imported** by `index.html` or
  `main.js`. It does not exist in the shipped dependency graph at all.
- `experimental/generative.html` calls `dreamExpansion` with
  `config.force = true`, which is the only bypass of the guard - scoped
  to this file only.
- The main piece has no `VOTIVE_FLAGS.generativeExpansion` pathway wired
  to this module (the flag exists in main.js as documentation of the
  boundary, not as a runtime toggle).

---

## Why this breaks the offline/no-surveillance principle

The shipped artwork (sections 3 and 10.3 of DESIGN.md) makes zero network
calls. It runs from `file://` with no analytics, no third-party scripts,
no tracking, nothing broadcast. The patina is buried in the device, not
sent anywhere.

The generative layer violates that principle by design - it must call an
external API to produce text. Enabling it in the main piece would mean:

- A network request leaves the device on every "+" click.
- The request payload includes the prayer line the visitor is reading,
  which is personal devotional context sent to a third-party server.
- Offline / flight-mode use breaks.
- The "buried, not broadcast" thesis collapses.

This is why the layer is off by default and isolated here. The machine
dreaming is for the artist's eye, not the visitor's experience.

---

## Why few-shot beats fine-tuning here (DESIGN.md section 14 reasoning)

At the scale of five prayer lines, fine-tuning is unjustifiable - it
requires hundreds to thousands of training examples, a training run, a
deployed fine-tuned endpoint, and ongoing version management. Few-shot
prompting with the five authored expansions as exemplars achieves the
same voice approximation in a single API call with no additional
infrastructure. The system prompt is cached (Anthropic prompt caching,
`cache_control: ephemeral`), so the voice brief and all five exemplars
are warm across calls within a session - only the per-line user turn is
billed at full input tokens.

---

## How to test locally

1. Start the static dev server from the project root:

   ```
   npm run serve
   ```

   This serves the whole `votive-patina/` tree. The default port is
   whatever `package.json` configures (typically 8080 or 3000).

2. Open in your browser:

   ```
   http://localhost:PORT/experimental/generative.html
   ```

3. In the "Configuration" panel:
   - Paste your Anthropic API key into the "API key" field for direct
     calls (local testing only - the key is held in memory and sent
     directly to `api.anthropic.com`).
   - Or enter a proxy URL if you have a server-side relay that holds the
     key. The proxy receives the same request body and forwards it with
     the key attached server-side.

4. Select one of the five prayer lines from the dropdown.

5. Click "Dream". The authored expansion appears on the left in blue; the
   machine's dreamt expansion appears on the right in green when the call
   returns.

6. Click "Abort" to cancel an in-flight request.

---

## Security note on API keys

Pasting an Anthropic API key into a browser field is only safe in a
local, private session (no screen sharing, no browser extensions that
read form fields, localhost only). The key travels from the browser
directly to `api.anthropic.com` over TLS - it does not touch any
intermediate server unless you configure a proxy URL.

For any non-local use, run a thin proxy endpoint that holds the key in
an environment variable and accepts the same request shape. Set the
proxy URL in the field and leave the API key field blank.

---

## Files

```
experimental/
  generative.html   - this sandbox
  README.md         - this file

lib/
  generative-expansion.js   - the module; GENERATIVE_ENABLED = false
```

The module lives in `lib/` rather than `experimental/` because the DESIGN.md
contract places it there, and the path must match the import in `generative.html`.
