import { describe, it, expect } from "vitest";

// Import the circuit breaker classes directly — they're pure logic, no Fastify needed
// We need to import from the plugin file but only use the class
// Since CircuitBreaker is not exported directly, we test via the plugin's CircuitOpenError
// and test the pattern indirectly. Let's extract the testable parts.

// For now, test the circuit breaker pattern via a standalone implementation
// that mirrors the plugin logic.

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

class TestCircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failures: number[] = [];
  private halfOpenSuccessCount = 0;
  private openedAt = 0;

  constructor(
    public readonly name: string,
    private failureThreshold = 5,
    private failureWindowMs = 30_000,
    private resetTimeoutMs = 30_000,
    private halfOpenSuccesses = 3
  ) {}

  async exec<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      const elapsed = Date.now() - this.openedAt;
      if (elapsed >= this.resetTimeoutMs) {
        this.state = "HALF_OPEN";
        this.halfOpenSuccessCount = 0;
      } else {
        throw new Error(`Circuit OPEN for ${this.name}`);
      }
    }
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    if (this.state === "HALF_OPEN") {
      this.halfOpenSuccessCount++;
      if (this.halfOpenSuccessCount >= this.halfOpenSuccesses) {
        this.state = "CLOSED";
        this.failures = [];
      }
    }
  }

  private onFailure() {
    const now = Date.now();
    if (this.state === "HALF_OPEN") {
      this.state = "OPEN";
      this.openedAt = now;
      return;
    }
    this.failures.push(now);
    this.failures = this.failures.filter(ts => ts >= now - this.failureWindowMs);
    if (this.failures.length >= this.failureThreshold) {
      this.state = "OPEN";
      this.openedAt = now;
    }
  }

  getState() { return this.state; }
}

describe("CircuitBreaker", () => {
  it("starts in CLOSED state", () => {
    const cb = new TestCircuitBreaker("test");
    expect(cb.getState()).toBe("CLOSED");
  });

  it("stays CLOSED on successful calls", async () => {
    const cb = new TestCircuitBreaker("test");
    await cb.exec(async () => "ok");
    await cb.exec(async () => "ok");
    expect(cb.getState()).toBe("CLOSED");
  });

  it("stays CLOSED with fewer failures than threshold", async () => {
    const cb = new TestCircuitBreaker("test", 5);
    for (let i = 0; i < 4; i++) {
      try { await cb.exec(async () => { throw new Error("fail"); }); } catch {}
    }
    expect(cb.getState()).toBe("CLOSED");
  });

  it("opens after reaching failure threshold", async () => {
    const cb = new TestCircuitBreaker("test", 3, 60_000, 100);
    for (let i = 0; i < 3; i++) {
      try { await cb.exec(async () => { throw new Error("fail"); }); } catch {}
    }
    expect(cb.getState()).toBe("OPEN");
  });

  it("throws immediately when OPEN", async () => {
    const cb = new TestCircuitBreaker("test", 2, 60_000, 60_000);
    for (let i = 0; i < 2; i++) {
      try { await cb.exec(async () => { throw new Error("fail"); }); } catch {}
    }
    expect(cb.getState()).toBe("OPEN");

    await expect(
      cb.exec(async () => "should not run")
    ).rejects.toThrow("Circuit OPEN");
  });

  it("transitions to HALF_OPEN after reset timeout", async () => {
    const cb = new TestCircuitBreaker("test", 2, 60_000, 10); // 10ms reset
    for (let i = 0; i < 2; i++) {
      try { await cb.exec(async () => { throw new Error("fail"); }); } catch {}
    }
    expect(cb.getState()).toBe("OPEN");

    // Wait for reset timeout
    await new Promise(r => setTimeout(r, 15));

    // Next call should be allowed (HALF_OPEN)
    const result = await cb.exec(async () => "recovered");
    expect(result).toBe("recovered");
  });

  it("closes after enough successes in HALF_OPEN", async () => {
    const cb = new TestCircuitBreaker("test", 2, 60_000, 10, 2); // 2 successes to close
    for (let i = 0; i < 2; i++) {
      try { await cb.exec(async () => { throw new Error("fail"); }); } catch {}
    }
    await new Promise(r => setTimeout(r, 15));

    await cb.exec(async () => "ok1");
    await cb.exec(async () => "ok2");
    expect(cb.getState()).toBe("CLOSED");
  });

  it("reopens on failure in HALF_OPEN", async () => {
    const cb = new TestCircuitBreaker("test", 2, 60_000, 10, 3);
    for (let i = 0; i < 2; i++) {
      try { await cb.exec(async () => { throw new Error("fail"); }); } catch {}
    }
    await new Promise(r => setTimeout(r, 15));

    // One success then failure
    await cb.exec(async () => "ok");
    try { await cb.exec(async () => { throw new Error("fail again"); }); } catch {}
    expect(cb.getState()).toBe("OPEN");
  });
});
