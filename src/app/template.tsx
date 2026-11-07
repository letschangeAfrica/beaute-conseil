/**
 * Re-mounts on every navigation: a short fade (≈250 ms) between pages, off under reduced motion.
 * Opacity only, on purpose: a transform here would make every fixed bar inside a page
 * (save bar, action bar, sticky summary) jump during the transition. See globals.css .page-transition.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-transition">{children}</div>;
}
