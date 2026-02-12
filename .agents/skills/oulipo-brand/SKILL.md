---
name: oulipo-brand
description: "Oulipo.xyz brand guidelines and design system. Typography: Standard (body), Terminal Grotesque (h1), Diatype Variable (headings, captions, metadata). Colors: white background, dark text. Use when building or modifying oulipo.xyz pages, components, or related projects."
---

# Oulipo.xyz Brand Guidelines

Design system and brand guidelines for oulipo.xyz — a laboratory of experimental computational poetry by Halim Madi.

## When to Apply

Reference these guidelines when:
- Building new pages for oulipo.xyz
- Modifying existing oulipo components
- Creating related projects that should match the oulipo aesthetic
- Reviewing design consistency across the site

---

## Typography

### Font Stack

| Font | Usage | Weight | Source |
|------|-------|--------|--------|
| **Standard** | Body text, navigation, hero subtitle | Book (400), Bold (700) | Cargo CDN |
| **Terminal Grotesque** | Main h1 headings only | Regular (400) | Cargo CDN |
| **Diatype Variable** | h2 headings | 200-1000 (variable) | Cargo CDN |
| **Diatype Mono Variable** | Captions, work titles, metadata (with `'MONO' 1`) | 200-1000 (variable) | Cargo CDN |

### Font Face Declarations

```css
/* Standard - Body Font */
@font-face {
  font-display: block;
  font-family: "Standard";
  src: url("https://type.cargo.site/files/Standard-Book.woff") format("woff");
  font-style: normal;
  font-weight: normal;
}
@font-face {
  font-display: block;
  font-family: "Standard";
  src: url("https://type.cargo.site/files/Standard-Bold.woff") format("woff");
  font-style: normal;
  font-weight: bold;
}

/* Terminal Grotesque - Display Font for h1 */
@font-face {
  font-display: block;
  font-family: "Terminal Grotesque";
  src: url("https://type.cargo.site/files/TerminalGrotesque.woff") format("woff");
  font-style: normal;
  font-weight: normal;
}

/* Diatype Variable - h2 Headings (proportional) */
@font-face {
  font-display: block;
  font-family: "Diatype Variable";
  src: url("https://type.cargo.site/files/Cargo-DiatypePlusVariable.woff2") format("woff2-variations");
  font-style: normal;
  font-weight: 200 1000;
}

/* Diatype Mono Variable - Captions, Work Titles, Metadata (monospace) */
@font-face {
  font-display: block;
  font-family: "Diatype Mono Variable";
  src: url("https://type.cargo.site/files/Cargo-DiatypePlusVariable.woff2") format("woff2-variations");
  font-style: normal;
  font-weight: 200 1000;
}
```

### Font Variation Settings

The Diatype Plus Variable font supports axis switching between proportional and monospace:

```css
/* Proportional (Diatype Variable) */
font-variation-settings: 'slnt' 0, 'MONO' 0;

/* Monospace (Diatype Mono Variable) - USE THIS FOR CAPTIONS */
font-variation-settings: 'slnt' 0, 'MONO' 1;
```

### Typography Specifications

| Element | Font Family | Size | Weight | Line Height |
|---------|-------------|------|--------|-------------|
| `body` | Standard | 1.3rem | 400 | 1.2 |
| `h1` | Terminal Grotesque | 7rem (desktop), 4.5rem (mobile) | 400 | 0.9 |
| `h2` | Diatype Variable | 2rem | 700 | 1.2 |
| `.caption` | Diatype Variable | 1.2rem | 400 | 1.25 |
| `.work-title` | Diatype Variable | 1.1rem | 400 | — |
| `.work-meta` | Diatype Variable | 0.9rem | 400 | — |
| `.hero-subtitle` | Standard | 1rem | 400 | 1.4 |

---

## Colors

### Core Palette

| Name | Value | Usage |
|------|-------|-------|
| **Background** | `#ffffff` | Page background |
| **Primary Text** | `rgba(0, 0, 0, 0.85)` | Body text, links |
| **Black** | `#000000` | Headings, captions |
| **Muted Text** | `rgba(0, 0, 0, 0.7)` | Descriptions |
| **Subtle Text** | `rgba(0, 0, 0, 0.5)` | Metadata, dates |
| **Subtle Text Alt** | `rgba(0, 0, 0, 0.6)` | Section subtitles |
| **Border/Divider** | `rgba(0, 0, 0, 0.75)` | Horizontal rules |
| **Overlay** | `rgba(0, 0, 0, 0.25)` | Menu overlay |

### CSS Variables (Optional)

```css
:root {
  --oulipo-bg: #ffffff;
  --oulipo-text: rgba(0, 0, 0, 0.85);
  --oulipo-text-black: #000000;
  --oulipo-text-muted: rgba(0, 0, 0, 0.7);
  --oulipo-text-subtle: rgba(0, 0, 0, 0.5);
  --oulipo-border: rgba(0, 0, 0, 0.75);
  --oulipo-overlay: rgba(0, 0, 0, 0.25);
}
```

---

## Layout

### Spacing

| Element | Value |
|---------|-------|
| Page padding | 4rem (desktop), 2rem (mobile) |
| Max content width | 1200px |
| Section margin | 3rem bottom |
| Grid gap | 2rem |

### Grid System

```css
/* 3-column grid on desktop */
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
}

/* 2-column on tablet (≤900px) */
@media (max-width: 900px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* 1-column on mobile (≤600px) */
@media (max-width: 600px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
```

### Featured Work Layout

```css
/* Image 2/3, Description 1/3 */
.work-featured-body {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
}

@media (max-width: 900px) {
  .work-featured-body {
    grid-template-columns: 1fr;
  }
}
```

---

## Components

### Links

```css
a {
  color: rgba(0, 0, 0, 0.85);
  text-decoration: underline;
}

a:hover {
  opacity: 0.7;
}
```

### Horizontal Rule

```css
hr {
  background: rgba(0, 0, 0, 0.75);
  border: 0;
  height: 1px;
  margin: 2rem 0;
}
```

### Side Menu

- Width: 420px (desktop), 100% (mobile)
- Background: white
- Slide in from right
- Line height for links: 1.15

---

## Site Structure

### Current Sections

1. **Featured Works** (max 3 items) — Highlighted projects with image + description
2. **Selected Works** — Additional notable works
3. **Non Human Poets** — AI/machine poetry experiments
4. **Border/line** — Immigration-themed interactive series
5. **Somatic Poetry Sandbox** — Experimental interactive pieces

### Navigation

- Top-left: "Halim Madi" link (hides on scroll)
- Top-right: Hamburger menu (hides on scroll)
- Side drawer with links to halimmadi.com sections

---

## File Organization

```
oulipo/
├── index.html              # Main landing page
├── Assets/
│   ├── screenshots/        # Work screenshots
│   └── curl-screenshot.png
├── borderline/             # Border/line series
├── somatic-poetry-sandbox/ # Interactive experiments
├── curl/                   # Curl project
├── becoming-borders/       # Becoming Borders project
├── case-against-the-son/   # Case Against the Son
└── unlisted/               # Unlisted/archived works
```

---

## Quick Copy-Paste

### Minimal HTML Head

```html
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Title — oulipo.xyz</title>
  <style>
    @font-face {
      font-family: "Standard";
      src: url("https://type.cargo.site/files/Standard-Book.woff") format("woff");
    }
    @font-face {
      font-family: "Terminal Grotesque";
      src: url("https://type.cargo.site/files/TerminalGrotesque.woff") format("woff");
    }
    @font-face {
      font-family: "Diatype Variable";
      src: url("https://type.cargo.site/files/Cargo-DiatypePlusVariable.woff2") format("woff2-variations");
      font-weight: 200 1000;
    }
    body {
      margin: 0;
      padding: 4rem;
      background: #ffffff;
      color: rgba(0, 0, 0, 0.85);
      font-family: Standard, sans-serif;
      font-size: 1.3rem;
      line-height: 1.2;
    }
    h1 {
      font-family: "Terminal Grotesque", sans-serif;
      font-size: 7rem;
      line-height: 0.9;
    }
    h2 {
      font-family: "Diatype Variable", sans-serif;
      font-size: 2rem;
      font-weight: 700;
    }
  </style>
</head>
```

---

## Screenshots

### IMPORTANT: Screenshot Border Requirements

**All screenshots on oulipo.xyz MUST have a thin 1px black border.**

When adding or updating screenshots:

1. **Take the screenshot** of the work/page
2. **Add a 1px black border** around the entire image
3. **Save to** `Assets/screenshots/` with a descriptive name (e.g., `project-name.png`)

### Adding Borders with Python (Pillow)

```python
from PIL import Image

def add_border(image_path, output_path=None, border_width=1, border_color=(0, 0, 0)):
    """Add a thin black border to a screenshot"""
    if output_path is None:
        output_path = image_path
    
    img = Image.open(image_path)
    new_width = img.width + 2 * border_width
    new_height = img.height + 2 * border_width
    
    bordered_img = Image.new('RGB', (new_width, new_height), border_color)
    bordered_img.paste(img, (border_width, border_width))
    bordered_img.save(output_path, quality=95)

# Usage
add_border("Assets/screenshots/my-project.png")
```

### Screenshot Naming Convention

- Use lowercase with hyphens: `project-name.png`
- Match the work title where possible
- Store in `Assets/screenshots/`

---

## Brand Voice

Oulipo.xyz is described as:
> "A kitchen laboratory of experimental computational poetry. Non-human poets, anti-gravitational word interfaces, somatic semantics. This is where I break and mend things."

Key themes:
- Experimental and playful
- Code meets poetry
- Human-machine interaction
- Border/migration/identity exploration
- Somatic (body-based) interactions
