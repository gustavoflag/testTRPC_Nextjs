/** jsdom has no IntersectionObserver. This fake records instances so tests can simulate scrolling. */
export class FakeIntersectionObserver implements IntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];

  readonly root = null;
  readonly rootMargin: string;
  readonly thresholds: ReadonlyArray<number> = [];
  readonly scrollMargin = "0px";
  readonly elements: Element[] = [];
  disconnected = false;

  constructor(
    private readonly callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit
  ) {
    this.rootMargin = options?.rootMargin ?? "0px";
    FakeIntersectionObserver.instances.push(this);
  }

  observe(element: Element) {
    this.elements.push(element);
  }

  unobserve() {}

  disconnect() {
    this.disconnected = true;
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  /** Simulates the observed elements entering (or leaving) the viewport. */
  trigger(isIntersecting = true) {
    const entries = this.elements.map((target) => ({ isIntersecting, target }) as IntersectionObserverEntry);
    this.callback(entries, this);
  }

  /**
   * The most recent connected observer watching an element that matches `selector`.
   * Filtering by element matters: next/link also uses IntersectionObserver (for prefetching).
   */
  static active(selector = "[data-infinite-scroll-trigger]"): FakeIntersectionObserver | undefined {
    return FakeIntersectionObserver.instances
      .filter((o) => !o.disconnected && o.elements.some((e) => e.matches(selector)))
      .at(-1);
  }
}
