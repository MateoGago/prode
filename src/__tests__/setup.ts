// Extends Vitest's expect with @testing-library/jest-dom matchers
// (e.g. toBeInTheDocument, toHaveClass, etc.)
import "@testing-library/jest-dom";

// jsdom has no IntersectionObserver; components that detect "stuck" scroll
// state (e.g. ProgressHeader) construct one on mount. Stub it so they render.
class IntersectionObserverStub {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds: ReadonlyArray<number> = [];
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

globalThis.IntersectionObserver =
  IntersectionObserverStub as unknown as typeof IntersectionObserver;
