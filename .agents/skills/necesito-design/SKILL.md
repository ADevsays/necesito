---
name: necesito-design
description: Design system and layout guidelines for the Necesito emergency application (brutalist, high-contrast, offline-first).
---

# Necesito Design System (10-Second UI)

This skill dictates the aesthetic and layout rules for the **Necesito** PWA or any similar emergency-focused web application. The core principle is **"10 seconds or less"** — the user must be able to understand the UI instantly in an emergency situation outdoors, potentially offline, under stress.

## 1. Principles
- **No decorative elements:** Every pixel must serve a function. No gradients, no shadows (except subtle button depth), no rounded cards within cards.
- **Extreme Contrast:** White text on near-black backgrounds. 
- **Massive Tap Targets:** Buttons should span the full width of the mobile screen (`width: 100%`) or be large blocks (`grid-2`).
- **Urgency Color Coding:** Only use colors to denote priority or status.

## 2. Color Palette
Always use these CSS variables as the foundation:

```css
:root {
  /* Core */
  --bg: #111111;
  --surface: #1a1a1a;
  --surface-hover: #2a2a2a;
  --text: #ffffff;
  --text-muted: #9ca3af;
  --border: #374151;
  
  /* Priority / Status */
  --critical: #ef4444; /* Red - Rescue/Life threat */
  --urgent: #f97316;   /* Orange - Urgent help needed */
  --needed: #22c55e;   /* Green - Important but not life-threatening / Synced */
  
  /* Primary Actions */
  --primary: #3b82f6;
  --primary-hover: #2563eb;
  
  --radius: 12px;
}
```

## 3. Typography
- **Font Family:** Strictly stick to the native system font stack for maximum performance and readability:
  `font-family: system-ui, -apple-system, sans-serif;`
- **Headings:** Very bold (`font-weight: 800`), tight letter spacing (`letter-spacing: -0.02em;`).
- **Sizes:**
  - `h1`: 2rem
  - `h2`: 1.5rem
  - `p`: 1.125rem

## 4. Layout & Spacing
- **The Shell:** The main container must limit width for readability on desktop but fill the screen on mobile, with ample top padding to avoid mobile status bars and bottom padding for scroll clearance.
  ```css
  .shell {
    max-width: 600px;
    margin: 0 auto;
    padding: 3rem 1rem 6rem 1rem;
  }
  ```
- **Grid:** Use a simple 2-column grid for secondary buttons:
  ```css
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }
  ```

## 5. UI Components

### Massive Buttons
Primary actions must use `.btn-massive`.
```css
.btn-massive {
  display: block;
  width: 100%;
  padding: 1.5rem;
  font-size: 1.5rem;
  font-weight: 800;
  border-radius: var(--radius);
  text-align: left;
}
.btn-massive.accent { background: var(--critical); color: white; }
.btn-massive.secondary { background: var(--surface); border: 2px solid var(--border); }
```

### Status Banners
Always show the offline/online state prominently.
```css
.status-banner {
  padding: 0.75rem;
  border-radius: var(--radius);
  font-weight: 700;
  text-align: center;
  border: 2px solid var(--border);
}
.status-banner.offline {
  color: #fdba74;
  background: #431407;
  border-color: #7c2d12;
}
```

## When to use this skill
Use this skill whenever you need to build, style, or restructure a page for the `Necesito` project, or when the user asks for a "brutalist", "offline-first", or "high-contrast" emergency UI.
