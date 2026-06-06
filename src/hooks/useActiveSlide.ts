import { useState, useEffect, useCallback } from "react";

export function useActiveSlide(totalSlides: number) {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const container = document.getElementById("snap-container");
    if (!container) return;

    const handleScroll = () => {
      const viewCenter = container.scrollTop + container.clientHeight / 2;
      const slides = container.querySelectorAll<HTMLElement>("[data-slide-index]");
      let closest = 0;
      let closestDist = Infinity;
      let closestEl: HTMLElement | null = null;

      slides.forEach((slide) => {
        const idx = Number(slide.dataset.slideIndex);
        const slideCenter = slide.offsetTop + slide.offsetHeight / 2;
        const dist = Math.abs(viewCenter - slideCenter);
        if (dist < closestDist) {
          closestDist = dist;
          closest = idx;
          closestEl = slide;
        }
      });

      setActiveSlide(Math.min(closest, totalSlides - 1));

      if (closestEl) {
        const rect = (closestEl as HTMLElement).getBoundingClientRect();
        document.documentElement.style.setProperty(
          "--header-top",
          `${Math.max(0, rect.top)}px`
        );
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => container.removeEventListener("scroll", handleScroll);
  }, [totalSlides]);

  const goToSlide = useCallback((index: number) => {
    const container = document.getElementById("snap-container");
    if (!container) return;
    const slide = container.querySelector<HTMLElement>(
      `[data-slide-index="${index}"]`
    );
    if (!slide) return;
    const slideCenter = slide.offsetTop + slide.offsetHeight / 2;
    const viewCenter = container.clientHeight / 2;
    container.scrollTo({ top: slideCenter - viewCenter, behavior: "smooth" });
  }, []);

  return { activeSlide, goToSlide };
}
