<div align="center">

# HTML / Vanilla JS Guide

**Add NB Feedback Kit to any website with a single `<script>` tag — no React, no bundler.**

</div>

---

## When to Use This Guide

This guide is for projects that don't use React:

- Static sites (Eleventy, Astro, Hugo, Jekyll)
- Server-rendered pages (Django, Laravel, Express)
- Plain HTML files
- Non-React frameworks (Vue, Svelte, Angular)

If you're using React or React Native, use the [React SDK](react.md) instead — it gives you provider, hooks, and pre-built components.

> **How it works:** The Core SDK ships as a pre-built IIFE bundle (`dist/index.global.js`). Load it with a `<script>` tag and access the global `window.NbFeedbackKit`. You build the UI (button + modal) in vanilla JS; the SDK handles the API communication.

---

## Installation

### Option 1: Script tag (recommended for static sites)

Download `dist/index.global.js` from the [`@nb-feedback-kit/core-sdk`](https://www.npmjs.com/package/@nb-feedback-kit/core-sdk) package and host it on your server:

```html
<script src="/assets/js/nb-feedback-kit.global.js"></script>
```

### Option 2: npm

```bash
npm install @nb-feedback-kit/core-sdk
```

If you have a build step, import the ESM build:

```js
import { createFeedbackClient } from '@nb-feedback-kit/core-sdk'
```

---

## Quick Start

### 1. Load the SDK

Add the script tag to your page `<head>` or before your closing `</body>`:

```html
<head>
  <!-- ... -->
  <script src="/assets/js/nb-feedback-kit.global.js"></script>
</head>
```

### 2. Create the client

In a separate script (loaded **after** the SDK), initialize the client:

```js
// feedback-widget.js
const client = NbFeedbackKit.createFeedbackClient({
  applicationName: 'My Website',
  version: '1.0.0',
  apiEndpoint: 'https://nb-feedback-api-prod.your-subdomain.workers.dev',
  apiKey: 'your-raw-api-key',
})
```

### 3. Add a feedback button

```html
<button id="feedback-button">Feedback</button>
<script src="/assets/js/feedback-widget.js"></script>
```

### 4. Submit feedback

```js
const btn = document.getElementById('feedback-button')
btn.addEventListener('click', async () => {
  const result = await client.submitFeedback({
    type: 'bug',
    title: 'Login button doesn't work',
    description: 'When I click login, nothing happens.',
  })

  if (result.success) {
    alert('Thanks! Issue #' + result.issueNumber + ' created.')
  }
})
```

---

## Complete Widget Example

Here's a complete, self-contained feedback widget with modal, form, and error handling:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Website</title>

  <!-- 1. Load the Core SDK -->
  <script src="/assets/js/nb-feedback-kit.global.js"></script>

  <style>
    #nb-feedback-overlay {
      display: none;
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.5); z-index: 9999;
    }
    #nb-feedback-modal {
      position: fixed; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      background: #fff; padding: 24px; border-radius: 8px;
      max-width: 500px; width: 90%; z-index: 10000;
    }
  </style>
</head>
<body>
  <!-- Your site content -->
  <button id="nb-feedback-trigger">Feedback</button>

  <!-- Feedback modal -->
  <div id="nb-feedback-overlay">
    <div id="nb-feedback-modal">
      <h2>Send Feedback</h2>
      <form id="nb-feedback-form">
        <select name="type">
          <option value="bug">Bug Report</option>
          <option value="feature">Feature Request</option>
          <option value="feedback">General Feedback</option>
        </select>
        <input type="text" name="title" placeholder="Title" required>
        <textarea name="description" placeholder="Describe your feedback..." required></textarea>
        <button type="submit">Submit</button>
        <button type="button" id="nb-feedback-close">Cancel</button>
      </form>
    </div>
  </div>

  <!-- 2. Your widget script (after the SDK) -->
  <script src="/assets/js/feedback-widget.js"></script>
</body>
</html>
```

### feedback-widget.js

```js
// Initialize the client
const client = NbFeedbackKit.createFeedbackClient({
  applicationName: 'My Website',
  version: '1.0.0',
  apiEndpoint: 'https://nb-feedback-api-prod.your-subdomain.workers.dev',
  apiKey: 'your-raw-api-key',
})

const trigger = document.getElementById('nb-feedback-trigger')
const overlay = document.getElementById('nb-feedback-overlay')
const form = document.getElementById('nb-feedback-form')
const closeBtn = document.getElementById('nb-feedback-close')

// Open modal
trigger.addEventListener('click', () => {
  overlay.style.display = 'block'
})

// Close modal
closeBtn.addEventListener('click', () => {
  overlay.style.display = 'none'
})

// Submit feedback
form.addEventListener('submit', async (e) => {
  e.preventDefault()

  const formData = new FormData(form)
  const submitBtn = form.querySelector('button[type="submit"]')
  submitBtn.disabled = true
  submitBtn.textContent = 'Submitting...'

  try {
    const result = await client.submitFeedback({
      type: formData.get('type'),
      title: formData.get('title'),
      description: formData.get('description'),
    })

    if (result.success) {
      alert('Thanks! Issue #' + result.issueNumber + ' created.')
      form.reset()
      overlay.style.display = 'none'
    }
  } catch (err) {
    alert('Failed to submit feedback: ' + err.message)
  } finally {
    submitBtn.disabled = false
    submitBtn.textContent = 'Submit'
  }
})
```

---

## API Reference

### `NbFeedbackKit.createFeedbackClient(config)`

Creates a feedback client instance.

**Parameters:**

| Field | Type | Required | Description |
|---|---|:--:|---|
| `applicationName` | `string` | ✓ | Name shown in the GitHub issue. |
| `version` | `string` | ✓ | App version captured in metadata. |
| `apiEndpoint` | `string` | ✓ | Base URL of your deployed Worker. |
| `apiKey` | `string` | ✓ | The raw API key you registered in KV. |
| `userId` | `string` | | Optional identifier for tracing. |

**Returns:** A `FeedbackClient` instance.

### `client.submitFeedback(payload)`

Submits feedback to your Worker, which creates a GitHub Issue.

**Parameters:**

| Field | Type | Required | Description |
|---|---|:--:|---|
| `type` | `'bug' \| 'feature' \| 'feedback'` | ✓ | The feedback type. |
| `title` | `string` | ✓ | Short title for the issue. |
| `description` | `string` | ✓ | Detailed description. |

**Returns:** `Promise<{ success: boolean, issueUrl: string, issueNumber: number }>`

**Throws:** On network errors, auth failures, or validation errors.

---

## Framework Integrations

### Eleventy (11ty)

Add the script tags to your base layout:

```html
<!-- src/_includes/layouts/base.njk -->
<script src="/assets/js/nb-feedback-kit.global.js" defer></script>
<script src="/assets/js/feedback-widget.js" defer></script>
```

Reference the scripts in your `.eleventy.js` passthrough copy config:

```js
// .eleventy.js
config.addPassthroughCopy('src/assets/js')
```

### Astro

```astro
---
// src/layouts/Base.astro
---
<script src="/assets/js/nb-feedback-kit.global.js"></script>
<script src="/assets/js/feedback-widget.js"></script>
```

### Hugo

```html
<!-- layouts/_default/baseof.html -->
<script src="/assets/js/nb-feedback-kit.global.js"></script>
<script src="/assets/js/feedback-widget.js"></script>
```

Place the JS files in your `static/` directory so Hugo copies them as-is.

---

## Script Loading Order

**Critical:** Your widget script must load **after** the Core SDK, since it depends on `window.NbFeedbackKit`:

```html
<!-- ✅ Correct order -->
<script src="/assets/js/nb-feedback-kit.global.js"></script>
<script src="/assets/js/feedback-widget.js"></script>

<!-- ❌ Wrong order — NbFeedbackKit is undefined -->
<script src="/assets/js/feedback-widget.js"></script>
<script src="/assets/js/nb-feedback-kit.global.js"></script>
```

If using `defer`, scripts execute in document order, so this is also safe:

```html
<script src="/assets/js/nb-feedback-kit.global.js" defer></script>
<script src="/assets/js/feedback-widget.js" defer></script>
```

---

## Browser Support

The Core SDK targets ES2020+ and works in all modern browsers:

| Browser | Minimum version |
|---|---|
| Chrome / Edge | 80+ |
| Firefox | 80+ |
| Safari | 14+ |

No polyfills required.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `NbFeedbackKit is not defined` | SDK script not loaded, or loaded after your widget script | Ensure the `<script src="...global.js">` tag appears **before** your widget script. |
| `401 Unauthorized` | API key not registered in KV | Re-register the key's SHA-256 hash in the `API_KEYS` namespace. |
| `TypeError: client.submitFeedback is not a function` | Client not initialized, or using wrong global name | Ensure you called `NbFeedbackKit.createFeedbackClient(config)` and stored the return value. |
| `Failed to fetch` | Worker not deployed, or CORS not configured | Verify your Worker URL is correct and the Worker sends `Access-Control-Allow-Origin` headers. |
| Modal doesn't appear | CSS conflict or z-index issue | Ensure your modal `z-index` is higher than other page elements. |

---

## Next Steps

- <img src="../assets/icons/rocket.svg" width="16" /> &nbsp;**[Getting Started](getting-started.md)** — Full backend deployment walkthrough.
- <img src="../assets/icons/download.svg" width="16" /> &nbsp;**[Installation](installation.md)** — Package details and module formats.
- <img src="../assets/icons/database.svg" width="16" /> &nbsp;**[Storage Providers](storage-providers.md)** — Add screenshot uploads.
- <img src="../assets/icons/lock.svg" width="16" /> &nbsp;**[Security](security.md)** — Threat model and hardening guide.

---

<p align="center">
  <sub>Question not covered here? <a href="https://github.com/Nealsch/NB-Feedback-Kit/issues">Open an issue</a>.</sub>
</p>