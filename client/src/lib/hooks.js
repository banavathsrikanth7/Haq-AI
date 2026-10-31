// Small UI hooks: theme, scroll reveal, count-up numbers, toasts.
import { useCallback, useEffect, useRef, useState } from 'react';

const THEME_KEY = 'haq.theme';

/** Light is the default. The choice is remembered in this browser only. */
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // storage blocked: the theme still works for this visit
    }
  }, [theme]);
  return [theme, () => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))];
}

/** Adds the class "is-in" when the element scrolls into view (fade-up effect). */
export function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (!('IntersectionObserver' in window)) {
      el.classList.add('is-in');
      return undefined;
    }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        el.classList.add('is-in');
        io.disconnect();
      }
    }, { threshold: 0.08 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Animates a number from its previous value to `target`. */
export function useCountUp(target, duration = 700) {
  const [value, setValue] = useState(target ?? 0);
  const from = useRef(0);
  useEffect(() => {
    if (typeof target !== 'number' || reduceMotion()) {
      setValue(target);
      return undefined;
    }
    const start = performance.now();
    const begin = from.current;
    let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - p) ** 3;
      setValue(Math.round(begin + (target - begin) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

/** Toast notifications that disappear after a few seconds. */
export function useToasts() {
  const [toasts, setToasts] = useState([]);
  const dismiss = useCallback((id) => setToasts((list) => list.filter((x) => x.id !== id)), []);
  const push = useCallback((message, tone = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((list) => [...list.slice(-2), { id, message, tone }]);
    setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);
  return { toasts, push, dismiss };
}

/** Cycles through `count` stages while `active` is true (for the "reading" animation). */
export function useStages(active, count, every = 1600) {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    if (!active) {
      setStage(0);
      return undefined;
    }
    const id = setInterval(() => setStage((s) => Math.min(count - 1, s + 1)), every);
    return () => clearInterval(id);
  }, [active, count, every]);
  return stage;
}
