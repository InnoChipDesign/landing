import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

/**
 * Island 2 of 2 (01-architecture.md §4, 04-media.md §A4). Adding a third needs justification.
 *
 * ── What this component does NOT render ──────────────────────────────────────────────────────
 * It does not render the gallery. The thumbnails stay server-rendered Astro: real <a> elements
 * pointing at the committed originals, which work with JavaScript off. This island renders one
 * <dialog> and attaches a delegated click handler to those links. Two consequences worth stating:
 *
 *   · Hydration cost is independent of gallery size. Twelve thumbnails cost the same as one,
 *     because none of them is a Preact component.
 *   · The no-JS path is not a fallback that has to be maintained separately — it is the DOM this
 *     island enhances. If hydration never happens, every link still opens its original file.
 *
 * ── Why `client:idle` and not `client:visible` ───────────────────────────────────────────────
 * The plan specifies `client:visible`. It cannot work here: the island's only output is a closed
 * <dialog>, which has no box, and Astro's island wrapper is `display: contents` — so the
 * IntersectionObserver has nothing to observe and would never fire. The lightbox would silently
 * never activate, leaving the plain-link fallback permanently in place. That is the worst class of
 * bug, because the page still appears to work. `client:idle` is the deviation.
 */

export type LightboxItem = {
  /** ~2000px optimized variant, generated at build by `getImage`. */
  full: string;
  width: number;
  height: number;
  alt: string;
  caption?: string;
  /** The committed original: a permanent, shareable URL to an actual file (D28). */
  original: { href: string; label: string };
};

type Props = {
  slug: string;
  items: LightboxItem[];
};

export default function Lightbox({ slug, items }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  const [index, setIndex] = useState<number | null>(null);

  // Bound to a local so TypeScript can narrow it inside the JSX below — `index` is state, and a
  // narrowing on it does not survive into the closures the markup creates.
  const at = index;
  const open = at !== null;
  const item = at === null ? undefined : items[at];

  const close = useCallback(() => {
    dialog.current?.close();
  }, []);

  const go = useCallback(
    (delta: number) => {
      setIndex((current) =>
        current === null ? current : (current + delta + items.length) % items.length,
      );
    },
    [items.length],
  );

  // Intercept the server-rendered links. Modified clicks fall through to the real href, so
  // ⌘-click still opens the original in a new tab and "Save link as" still saves the full file.
  useEffect(() => {
    const list = document.querySelector<HTMLElement>(`[data-gallery="${CSS.escape(slug)}"]`);
    if (!list) return;

    const onClick = (event: MouseEvent) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>(
        '[data-gallery-item]',
      );
      if (!link || !list.contains(link)) return;
      const at = Number(link.dataset.index);
      if (!Number.isInteger(at) || at < 0 || at >= items.length) return;

      event.preventDefault();
      opener.current = link;
      setIndex(at);
    };

    list.addEventListener('click', onClick);
    return () => list.removeEventListener('click', onClick);
  }, [slug, items.length]);

  // showModal() is what buys the focus trap and Esc-to-close for free; there is no hand-rolled
  // trap here because a native one is always more correct than a hand-rolled one.
  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  // Body scroll lock. `showModal()` puts the dialog in the top layer but does not reliably stop
  // the page behind it from scrolling, so this is explicit.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        go(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        go(-1);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, go]);

  if (items.length === 0) return null;

  const many = items.length > 1;

  return (
    <dialog
      ref={dialog}
      aria-label="Gallery"
      class="m-auto w-[min(92vw,80rem)] max-w-none rounded-(--radius-lg) bg-(--color-bg) p-0 text-(--color-text) backdrop:bg-black/70 backdrop:backdrop-blur-sm"
      onClose={() => {
        setIndex(null);
        // Focus goes back to the thumbnail that opened it. Browsers usually restore focus to the
        // previously focused element, but a click does not always focus an <a> — so this is
        // explicit rather than inherited.
        opener.current?.focus();
        opener.current = null;
      }}
      onClick={(event) => {
        // Clicking the backdrop closes. The backdrop is not a child element, so a click that
        // lands on the <dialog> itself rather than on its content is the signal.
        if (event.target === dialog.current) close();
      }}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const from = touchStartX.current;
        const to = event.changedTouches[0]?.clientX;
        touchStartX.current = null;
        if (from === null || to === undefined || !many) return;
        if (Math.abs(to - from) > 48) go(to < from ? 1 : -1);
      }}
    >
      {item && at !== null && (
        <div class="flex flex-col">
          <div class="relative flex items-center justify-center bg-(--color-surface-2)">
            <img
              src={item.full}
              alt={item.alt}
              width={item.width}
              height={item.height}
              class="max-h-[72vh] w-auto max-w-full object-contain"
            />

            {many && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Previous image"
                  class="absolute left-2 flex size-11 items-center justify-center rounded-full bg-(--color-bg)/90 text-xl shadow-(--shadow-md) hover:bg-(--color-bg)"
                >
                  <span aria-hidden="true">←</span>
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Next image"
                  class="absolute right-2 flex size-11 items-center justify-center rounded-full bg-(--color-bg)/90 text-xl shadow-(--shadow-md) hover:bg-(--color-bg)"
                >
                  <span aria-hidden="true">→</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={close}
              aria-label="Close gallery"
              class="absolute top-2 right-2 flex size-11 items-center justify-center rounded-full bg-(--color-bg)/90 text-xl shadow-(--shadow-md) hover:bg-(--color-bg)"
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>

          <div class="flex flex-col gap-2 p-4 text-(length:--text-meta) sm:flex-row sm:items-center sm:justify-between">
            <p class="min-w-0 text-(--color-muted)">
              {item.caption ?? item.alt}
              {many && (
                <span class="whitespace-nowrap">
                  {' · '}
                  {at + 1} of {items.length}
                </span>
              )}
            </p>
            {/* The permanent, shareable URL for one image — which is why `?image=n` is not synced
                to the address bar (D28). It is a link to an actual file, and it says what the file
                costs before the tap. */}
            <a
              href={item.original.href}
              target="_blank"
              rel="noopener noreferrer"
              class="shrink-0 text-(--color-accent) hover:underline"
            >
              View original ({item.original.label})
            </a>
          </div>
        </div>
      )}
    </dialog>
  );
}
