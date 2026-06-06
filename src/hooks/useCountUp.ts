import { useState, useEffect, useRef } from "react";

export function useCountUp(target: number, duration = 1200, inView = false) {
  const isPrint =
    typeof window !== "undefined" && window.matchMedia("print").matches;
  const [count, setCount] = useState(isPrint ? target : 0);
  const started = useRef(false);

  if (isPrint) return target;

  useEffect(() => {
    if (!inView) {
      started.current = false;
      setCount(0);
      return;
    }
    if (started.current) return;
    started.current = true;

    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
      else setCount(target);
    };
    requestAnimationFrame(step);
  }, [inView, target, duration]);

  return count;
}
