---
name: Midnight Protocol
colors:
  surface: '#111417'
  surface-dim: '#111417'
  surface-bright: '#37393d'
  surface-container-lowest: '#0c0e12'
  surface-container-low: '#191c1f'
  surface-container: '#1d2023'
  surface-container-high: '#282a2e'
  surface-container-highest: '#323539'
  on-surface: '#e1e2e7'
  on-surface-variant: '#b9cacb'
  inverse-surface: '#e1e2e7'
  inverse-on-surface: '#2e3134'
  outline: '#849495'
  outline-variant: '#3a494b'
  surface-tint: '#00dbe7'
  primary: '#e1fdff'
  on-primary: '#00363a'
  primary-container: '#00f2ff'
  on-primary-container: '#006a71'
  inverse-primary: '#00696f'
  secondary: '#dcb8ff'
  on-secondary: '#480081'
  secondary-container: '#7701d0'
  on-secondary-container: '#dcb7ff'
  tertiary: '#efffbb'
  on-tertiary: '#283500'
  tertiary-container: '#bdec00'
  on-tertiary-container: '#516800'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#74f5ff'
  primary-fixed-dim: '#00dbe7'
  on-primary-fixed: '#002022'
  on-primary-fixed-variant: '#004f54'
  secondary-fixed: '#efdbff'
  secondary-fixed-dim: '#dcb8ff'
  on-secondary-fixed: '#2c0051'
  on-secondary-fixed-variant: '#6700b5'
  tertiary-fixed: '#c3f400'
  tertiary-fixed-dim: '#abd600'
  on-tertiary-fixed: '#161e00'
  on-tertiary-fixed-variant: '#3c4d00'
  background: '#111417'
  on-background: '#e1e2e7'
  surface-variant: '#323539'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 72px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

This design system establishes a high-fidelity, futuristic atmosphere for the Business Security Alliance. The aesthetic balances the gravity of institutional security with the agility of high-tech innovation. It utilizes a **Glass-Futurism** style—characterized by deep spatial depth, luminous accents, and high-precision typography.

The interface must evoke a sense of "secure transparency," where information feels layered and protected yet instantly accessible. By utilizing deep blacks and vibrant, neon-inflected accents, the UI moves away from stale corporate blue and toward a sophisticated "cyber-intelligence" aesthetic.

## Colors

The palette is optimized for OLED displays and high-contrast readability in low-light environments.

- **Deepest Midnight (#05070A):** The foundational void. Use for the primary background to maximize the impact of glowing elements.
- **Dark Obsidian (#0D1117):** The secondary surface. Use for containers and cards to create a subtle separation from the background.
- **Electric Cyan (#00F2FF):** The primary signal. Use for critical actions, active states, and focus indicators.
- **Royal Amethyst (#8A2BE2):** The sophisticated secondary. Use for decorative gradients, brand moments, and differentiating categories.
- **Cyber Lime (#CCFF00):** The high-tension accent. Use sparingly for success states, trend indicators, or to draw attention to high-priority highlights.
- **Slate Grey (#8B949E):** The functional neutral. Use for secondary text, borders, and inactive icons to maintain visual hierarchy.

## Typography

The typography system relies on **Inter** for its systematic, clean, and legible characteristics. 

- **Display Hierarchy:** Headlines use tight tracking and aggressive weights to feel impactful. Large H1s should be used as rhythmic anchors on the page.
- **Body Content:** Generous line-height (1.6) is mandatory to ensure technical content remains scannable and comfortable.
- **Micro-copy:** Labels and captions should utilize uppercase styling with increased letter spacing to evoke a technical, "readout" feel common in advanced interfaces.

## Layout & Spacing

The design system employs a **12-column fluid grid** for desktop and a **4-column grid** for mobile. 

- **The 8px Rhythm:** All padding, margins, and component heights must be multiples of 8px to maintain mathematical harmony.
- **Negative Space:** Use significant vertical padding (80px+) between major sections to prevent the dark UI from feeling cramped.
- **Alignment:** Content should predominantly be left-aligned to maintain a structured, professional "dossier" feel. Use center alignment only for hero headlines or marketing-focused callouts.

## Elevation & Depth

Depth is not communicated through traditional shadows, but through **light and opacity.**

- **Z-Index 0 (Base):** Deepest Midnight (#05070A). No transparency.
- **Z-Index 1 (Cards/Panels):** Dark Obsidian (#0D1117) with a 60% opacity backdrop-blur (20px). Use a 1px border of Slate Grey at 20% opacity.
- **Z-Index 2 (Popovers/Modals):** Dark Obsidian (#0D1117) with a 1px border using a linear gradient of Electric Cyan to Royal Amethyst at 40% opacity.
- **Glow Effects:** Use "Atmospheric Glows"—large, low-opacity (10-15%) radial gradients of Electric Cyan or Royal Amethyst placed behind primary containers to simulate light emission.

## Shapes

The shape language is **Technical-Precision.** 

- **Radius:** Small, tight radii (4px to 8px) are preferred over large rounded corners to maintain a professional and serious tone. 
- **Borders:** Every container should feature a subtle 1px "inner-glow" border rather than a drop shadow.
- **Interactive States:** Buttons and chips may use a slightly higher radius (rounded-lg) to distinguish them as touchpoints against the more rigid layout containers.

## Components

### Buttons & CTAs
- **Primary:** Electric Cyan background with black text. Apply a subtle outer glow (0px 0px 15px) of the same color. On hover, the glow intensity increases.
- **Secondary:** Ghost style. Transparent background with a Royal Amethyst 1px border. 
- **Tertiary:** Slate Grey text with no background; turns Electric Cyan on hover.

### Glassmorphic Cards
- Surfaces use Dark Obsidian with a `backdrop-filter: blur(12px)`.
- Borders are 1px solid, using a top-down gradient from Slate Grey (30% opacity) to Transparent.
- For "Active" or "Featured" cards, use a thin border gradient of Electric Cyan.

### Sleek Inputs
- Fields are Dark Obsidian with a bottom-only 2px border of Slate Grey.
- On focus, the border animates to Electric Cyan and a faint cyan glow appears behind the input text.
- Labels are always `label-sm` (uppercase) positioned above the field.

### Profile & Event Cards
- Use a vertical layout with an Electric Cyan accent line on the left edge.
- Avatars should be hexagonal or square with a subtle 2px radius to avoid the "social media" circle cliché.
- Event status tags use Cyber Lime for "Live" and Royal Amethyst for "Upcoming."

### Interactive Data Points
- Small charts or data visualizations should use Cyber Lime for positive trends and Electric Cyan for steady states, avoiding red unless indicating a critical security breach.