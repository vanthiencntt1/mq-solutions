// Cầu dao theo cơ sở (C02 mục 5): 5 lỗi liên tiếp → ngắt 2 phút → cho thử 1 request.

interface State {
  failures: number;
  openedAt: number | null;
}

export class CircuitBreaker {
  private readonly states = new Map<string, State>();

  constructor(
    private readonly threshold = 5,
    private readonly openMs = 2 * 60_000,
    private readonly now: () => number = Date.now,
  ) {}

  private state(key: string): State {
    let s = this.states.get(key);
    if (!s) {
      s = { failures: 0, openedAt: null };
      this.states.set(key, s);
    }
    return s;
  }

  /** true = đang ngắt, không gọi HIS. Hết thời gian ngắt thì cho qua 1 lần (half-open). */
  isOpen(key: string): boolean {
    const s = this.state(key);
    if (s.openedAt === null) return false;
    if (this.now() - s.openedAt >= this.openMs) {
      s.openedAt = null;
      s.failures = this.threshold - 1; // lỗi thêm 1 lần là ngắt lại
      return false;
    }
    return true;
  }

  record(key: string, ok: boolean): void {
    const s = this.state(key);
    if (ok) {
      s.failures = 0;
      s.openedAt = null;
      return;
    }
    s.failures += 1;
    if (s.failures >= this.threshold) s.openedAt = this.now();
  }
}
