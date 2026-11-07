# Motion in Belle

Motion explains what changed. It never decorates, and it never blocks. No dependency is used for this: everything is CSS keyframes, the Web Animations API and `IntersectionObserver`.

## Tokens

The timing tokens are in `src/app/globals.css`, in `:root`:

| Token             | Value                                               | Use                                                 |
| ----------------- | --------------------------------------------------- | --------------------------------------------------- |
| `--duration-fast` | 150 ms                                              | Press feedback, small colour or icon changes        |
| `--duration-base` | 280 ms                                              | Most transitions, fades, cross-fades                |
| `--duration-slow` | 600 ms                                              | Entrances, the nav pill, the hero image             |
| `--ease-out-soft` | `cubic-bezier(0.22, 1, 0.36, 1)`                    | Default easing for anything that arrives            |
| `--ease-spring`   | `linear()` spring, `cubic-bezier` back-out fallback | Things that land: the nav pill, swatches, the heart |

In Tailwind: `duration-(--duration-base) ease-(--ease-spring)`.

The animations are in `@theme` and are used as `motion-safe:animate-*`:

| Utility              | What it does                                      |
| -------------------- | ------------------------------------------------- |
| `animate-fade-in`    | Opacity in (page transition, result cross-fade)   |
| `animate-rise`       | Fade and rise by 10 px (list items, chat)         |
| `animate-scale-in`   | Fade and grow from 94% (product image)            |
| `animate-pop`        | Small spring pop (verdict pill, checks)           |
| `animate-float`      | Slow vertical drift (showcase tiles, infinite)    |
| `animate-marquee`    | Horizontal loop (`--marquee-duration`)            |
| `animate-shimmer`    | Skeleton sweep (use the `skeleton-shimmer` class) |
| `animate-heart-pop`  | Favourite heart                                   |
| `animate-burst`      | Particle flying out (`--bx`, `--by`)              |
| `animate-glow-pulse` | One glow on an alert, plays once                  |
| `animate-sweep`      | One light sweep across a highlight                |
| `animate-aurora`     | Hero backdrop blobs (infinite)                    |
| `animate-ring-out`   | Success ring (scanner)                            |

## Rules

1. **Animate only `transform`, `opacity` and `filter`.** The one exception is the score ring arc (`stroke-dashoffset`, an SVG paint property that doesn't cause layout).
2. **Always use `motion-safe:`.** With "reduce motion" turned on, every non-essential animation is removed and the content is shown in its final state. Loading states stay readable without movement.
3. **Anything that moves for more than 5 seconds** (marquee, floating tiles, hero backdrop, demo loop) must:
   - show a visible pause button (at least 44 × 44 px, with a French label),
   - pause on hover and on keyboard focus,
   - pause when it is off-screen or the tab is hidden (`useActiveWhenVisible`).
     Put the `pausable` class on infinite animations and set `data-paused="true"` on an ancestor to stop them.
4. **No layout shift.** Anything that animates in reserves its space first (fixed heights for skeletons and empty states). CLS must stay at 0.
5. **Don't delay content.** Entrances are under 700 ms, the LCP element (the home H1) never animates, and nothing waits for an animation before it can be used.
6. **No external files.** No Lottie, no CDN, no stock video. The CSP (`media-src 'self' blob:`) stays as it is.

## Components (`src/components/motion/`)

### `Reveal`

Fades and rises a block as it scrolls into view. It uses CSS scroll-driven animations where supported, and an `IntersectionObserver` otherwise. Anything already on screen at load is never hidden.

```tsx
<Reveal as="section" className="…">…</Reveal>
<Reveal as="ul" stagger>{items}</Reveal> {/* children enter one after another (max 8 steps) */}
```

Use it for sections below the fold. Don't use it for the first screen, for forms, or for content the user is waiting for.

### `CountUp`

Counts a number from 0 to its value when it becomes visible (a CSS `@property` counter: no re-render and no layout shift). Screen readers get the final value at once.

```tsx
<CountUp value={82} duration={800} />
```

Use it for real computed figures only (scores). Never use it for prices.

### `Marquee`

A horizontal loop of a list, with an edge fade and a pause button. The duplicate copy is `aria-hidden` and `inert`, so every item is reachable once. Under reduced motion it becomes a scrollable row.

```tsx
<Marquee label="Produits notés" seconds={40}>
  {tiles}
</Marquee>
```

Use it only with at least 4 real items.

### `HeroBackdrop`

The living background of the home hero: soft colour blobs, grain, and an optional video. It has a pause button, and it stops off-screen and when the tab is hidden.

The video is **off by default** (see below).

### `Tilt`

A slight 3D tilt following the pointer, only on devices with a precise pointer (mouse) and only without reduced motion. Use it for one or two hero cards, not for lists.

### Hooks (`useMotion.ts`)

- `useReducedMotion()` gives the live `prefers-reduced-motion` value.
- `useActiveWhenVisible(ref)` is `true` while the element is on screen and the tab is visible.
- `useSeenOnce(ref, margin)` becomes `true` the first time the element comes near the viewport (for lazy work).

## Page transitions

`src/app/template.tsx` fades each new page in (opacity only, 250 ms). A transform would make the fixed bottom bars position against the wrapper, so it isn't used.

## Adding the hero video

1. Put a muted clip at `public/media/hero.mp4`:
   - at most about 1.5 MB, 6–10 seconds, looping cleanly,
   - 720p, H.264, no audio track,
   - your own footage, or footage you are licensed to use (no stock from other sites).
2. Put a poster image at `public/media/hero-poster.jpg` (the first frame, under 80 KB).
3. Set `NEXT_PUBLIC_HERO_VIDEO=1` in the environment and rebuild.

The video is shown at low opacity over the backdrop. It is never loaded under reduced motion or Data Saver. It is muted, has `playsInline`, pauses when off-screen or when the tab is hidden, and follows the backdrop's pause button. Both files are served from the site itself, so the CSP doesn't change.

## Checking

- Turn on "reduce motion" (system setting, or in Chrome DevTools > Rendering > Emulate CSS `prefers-reduced-motion`). Every screen should look complete and nothing should move except loading indicators.
- Use Lighthouse or the Performance panel to check that CLS stays at 0 and LCP doesn't change.
