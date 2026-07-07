import { useEffect } from "react";

/**
 * Adds a scroll-driven reveal effect to all titles/subtitles inside `.landing-scroll-effects`.
 * Repeats every time the element enters/leaves the viewport.
 */
export function useScrollRevealAll() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const root = document.querySelector(".landing-scroll-effects");
    if (!root) return;

    const selector = "h1, h2, h3, h4, h5, p, blockquote, li, [data-reveal]";
    const targets = new Set<Element>();

    const isInViewport = (el: Element) => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      return r.top < vh && r.bottom > 0;
    };

    const scan = () => {
      root.querySelectorAll(selector).forEach((el) => {
        if (el.closest("[data-no-reveal]")) return;
        if (!el.classList.contains("scroll-reveal")) {
          // Pre-mark elements currently visible as in-view to avoid a flash on mount.
          if (isInViewport(el)) el.classList.add("in-view");
          el.classList.add("scroll-reveal");
        }
        if (!targets.has(el)) {
          targets.add(el);
          io.observe(el);
        }
      });
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          entry.target.classList.toggle("in-view", entry.isIntersecting);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );

    scan();

    const mo = new MutationObserver(() => scan());
    mo.observe(root, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
}
