import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

/**
 * Circuit Breaker — prevents cascading failures from external service outages.
 *
 * States: CLOSED (healthy) → OPEN (failing) → HALF_OPEN (testing recovery)
 * Per doc 17 §42.4: open on 5 failures in 30s, half-open after 30s, close after 3 successes.
 */

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface CircuitBreakerOptions {
  failureThreshold: number;     // failures before opening (default 5)
  failureWindowMs: number;      // window for counting failures (default 30_000)
  resetTimeoutMs: number;       // time in OPEN before trying HALF_OPEN (default 30_000)
  halfOpenSuccesses: number;    // successes in HALF_OPEN to close (default 3)
}

const DEFAULTS: CircuitBreakerOptions = {
  failureThreshold: 5,
  failureWindowMs: 30_000,
  resetTimeoutMs: 30_000,
  halfOpenSuccesses: 3,
};

class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failures: number[] = []; // timestamps of recent failures
  private halfOpenSuccessCount = 0;
  private openedAt = 0;
  private opts: CircuitBreakerOptions;

  constructor(
    public readonly name: string,
    opts: Partial<CircuitBreakerOptions> = {}
  ) {
    this.opts = { ...DEFAULTS, ...opts };
  }

  /** Execute a function through the circuit breaker. */
  async exec<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      const elapsed = Date.now() - this.openedAt;
      if (elapsed >= this.opts.resetTimeoutMs) {
        this.state = "HALF_OPEN";
        this.halfOpenSuccessCount = 0;
      } else {
        throw new CircuitOpenError(this.name, this.opts.resetTimeoutMs - elapsed);
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

  private onSuccess(): void {
    if (this.state === "HALF_OPEN") {
      this.halfOpenSuccessCount++;
      if (this.halfOpenSuccessCount >= this.opts.halfOpenSuccesses) {
        this.state = "CLOSED";
        this.failures = [];
        this.halfOpenSuccessCount = 0;
      }
    } else if (this.state === "CLOSED") {
      // Successful call in CLOSED — no action needed
    }
  }

  private onFailure(): void {
    const now = Date.now();

    if (this.state === "HALF_OPEN") {
      // Any failure in HALF_OPEN immediately reopens
      this.state = "OPEN";
      this.openedAt = now;
      this.halfOpenSuccessCount = 0;
      return;
    }

    // CLOSED state — track failure
    this.failures.push(now);
    // Prune failures outside the window
    const windowStart = now - this.opts.failureWindowMs;
    this.failures = this.failures.filter(ts => ts >= windowStart);

    if (this.failures.length >= this.opts.failureThreshold) {
      this.state = "OPEN";
      this.openedAt = now;
    }
  }

  getState(): { name: string; state: CircuitState; recentFailures: number } {
    return {
      name: this.name,
      state: this.state,
      recentFailures: this.failures.length,
    };
  }
}

export class CircuitOpenError extends Error {
  constructor(
    public readonly serviceName: string,
    public readonly retryAfterMs: number
  ) {
    super(`Circuit breaker OPEN for ${serviceName}. Retry in ${Math.ceil(retryAfterMs / 1000)}s.`);
    this.name = "CircuitOpenError";
  }
}

/** Registry of named circuit breakers for external services */
class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();

  get(name: string, opts?: Partial<CircuitBreakerOptions>): CircuitBreaker {
    let breaker = this.breakers.get(name);
    if (!breaker) {
      breaker = new CircuitBreaker(name, opts);
      this.breakers.set(name, breaker);
    }
    return breaker;
  }

  /** Get health status of all breakers */
  getAll(): Array<{ name: string; state: CircuitState; recentFailures: number }> {
    return Array.from(this.breakers.values()).map(b => b.getState());
  }
}

export default fp(async (fastify: FastifyInstance) => {
  const registry = new CircuitBreakerRegistry();

  // Pre-register breakers for known external services
  registry.get("stripe");
  registry.get("twilio");
  registry.get("sendgrid");
  registry.get("weather");
  registry.get("uspa");
  registry.get("expo");
  registry.get("webpush");

  fastify.decorate("circuitBreakers", registry);

  fastify.log.info("[CircuitBreaker] Registry initialized with 7 service breakers");
});

declare module "fastify" {
  interface FastifyInstance {
    circuitBreakers: CircuitBreakerRegistry;
  }
}
