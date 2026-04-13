/**
 * KeeperClient — How an agent talks to its keeper-agent.
 *
 * The keeper holds all real secrets. The agent only has a scoped JWT.
 * Every API call, every git operation, every external request goes
 * through the keeper. The agent NEVER touches raw secrets.
 *
 * Flow:
 *   1. agent --onboard → registers with keeper, gets JWT
 *   2. agent start → validates JWT, refreshes if needed
 *   3. agent work → proxies ALL external calls through keeper
 *   4. agent stop → commits work, throws bottle (optional)
 */

export interface KeeperClientConfig {
  keeperUrl: string;
  agentId: string;
}

export interface KeeperStatus {
  status: string;
  agents: number;
  secrets: number;
  auditEntries: number;
  highRiskEvents: number;
}

export interface TokenResponse {
  token: string;
  expiresAt: string;
  scopes: string[];
  agentId: string;
}

export interface ProxyResult {
  status: number;
  body: unknown;
  responseScanFindings?: number;
}

export class KeeperClient {
  private keeperUrl: string;
  private agentId: string;
  private token: string | null = null;
  private tokenExpiresAt: string | null = null;

  constructor(config: KeeperClientConfig) {
    this.keeperUrl = config.keeperUrl.replace(/\/+$/, '');
    this.agentId = config.agentId;
  }

  /**
   * Register this agent with the keeper.
   * Called during --onboard.
   */
  async register(name: string, githubUser?: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.keeperUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: this.agentId, agentName: name, githubUser }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Request a scoped token from the keeper.
   * Called during --onboard and when token expires.
   */
  async requestToken(scopes: string[], ttlHours?: number): Promise<TokenResponse | null> {
    try {
      const res = await fetch(`${this.keeperUrl}/api/v1/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: this.agentId,
          scopes,
          ttlHours: ttlHours || 24,
        }),
      });
      if (!res.ok) return null;
      const data = await res.json() as TokenResponse;
      this.token = data.token;
      this.tokenExpiresAt = data.expiresAt;
      return data;
    } catch {
      return null;
    }
  }

  /**
   * Set token (e.g. loaded from local config).
   */
  setToken(token: string, expiresAt: string): void {
    this.token = token;
    this.tokenExpiresAt = expiresAt;
  }

  /**
   * Check if current token is valid and not expired.
   */
  async validateToken(): Promise<boolean> {
    if (!this.token) return false;
    try {
      const res = await fetch(`${this.keeperUrl}/api/v1/auth/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: this.token }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Check if we have a usable token.
   */
  hasValidToken(): boolean {
    if (!this.token || !this.tokenExpiresAt) return false;
    return new Date(this.tokenExpiresAt) > new Date();
  }

  /**
   * Proxy an API call through the keeper.
   * This is the ONLY way agents talk to external services.
   *
   * The keeper will:
   *   1. Validate our token
   *   2. Check our scopes
   *   3. Scan our request for accidental secret leakage
   *   4. Inject real credentials
   *   5. Forward to the target API
   *   6. Scan the response
   *   7. Return (with any secrets redacted)
   *   8. Audit log everything
   */
  async proxy(provider: string, method: string, path: string, body?: unknown): Promise<ProxyResult> {
    if (!this.token) {
      throw new Error('No token. Run --onboard first.');
    }

    const res = await fetch(`${this.keeperUrl}/api/v1/proxy/${provider}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: this.token,
        method,
        headers: { 'Content-Type': 'application/json' },
        requestBody: body,
      }),
    });

    const data = await res.json() as ProxyResult;
    if (res.status === 401) {
      throw new Error('Token expired or revoked. Run --onboard again.');
    }
    if (res.status === 403) {
      throw new Error(`Proxy blocked: ${(data as any).error || 'insufficient scope or secret detected'}`);
    }

    return data;
  }

  /**
   * Convenience: Call OpenAI chat through keeper.
   */
  async chat(messages: Array<{ role: string; content: string }>): Promise<unknown> {
    return this.proxy('openai', 'POST', '/v1/chat/completions', {
      model: 'gpt-4o',
      messages,
    });
  }

  /**
   * Convenience: Call GitHub API through keeper.
   */
  async githubApi(method: string, path: string, body?: unknown): Promise<unknown> {
    return this.proxy('github', method, path, body);
  }

  /**
   * Get keeper status.
   */
  async status(): Promise<KeeperStatus> {
    const res = await fetch(`${this.keeperUrl}/api/v1/status`);
    return res.json() as Promise<KeeperStatus>;
  }

  /**
   * Get audit log for this agent.
   */
  async auditLog(): Promise<unknown> {
    if (!this.token) return { entries: [] };
    const res = await fetch(
      `${this.keeperUrl}/api/v1/audit?agentId=${this.agentId}`
    );
    return res.json();
  }

  /**
   * Test the secret scanner.
   */
  async scan(text: string): Promise<unknown> {
    const res = await fetch(`${this.keeperUrl}/api/v1/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, context: 'agent-test' }),
    });
    return res.json();
  }

  get currentToken(): string | null { return this.token; }
  get url(): string { return this.keeperUrl; }
}
