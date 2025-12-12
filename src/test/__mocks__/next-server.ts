/**
 * Mock for next/server module
 * Provides NextRequest and NextResponse mocks that work in Jest
 * Based on Jest mocking best practices
 */

// Simple Headers implementation
class MockHeaders {
  // Add an index signature to be compatible with Record<string, string>
  [key: string]: any;
  public headers: Map<string, string>;
  private setCookieHeaders: string[];

  constructor(init?: HeadersInit) {
    this.headers = new Map();
    this.setCookieHeaders = [];
    if (init) {
      if (init instanceof Headers) {
        init.forEach((value, key) => {
          this.headers.set(key.toLowerCase(), value);
        });
      } else if (init instanceof MockHeaders) {
        // Copy from another MockHeaders
        init.headers.forEach((value, key) => {
          this.headers.set(key, value);
        });
        this.setCookieHeaders = [...init.setCookieHeaders];
      } else if (Array.isArray(init)) {
        init.forEach(([key, value]) => {
          this.headers.set(key.toLowerCase(), value);
        });
      } else {
        Object.entries(init).forEach(([key, value]) => {
          this.headers.set(key.toLowerCase(), value);
        });
      }
    }
  }

  get(name: string): string | null {
    return this.headers.get(name.toLowerCase()) || null;
  }

  set(name: string, value: string): void {
    this.headers.set(name.toLowerCase(), value);
  }

  append(name: string, value: string): void {
    const lowerName = name.toLowerCase();
    if (lowerName === 'set-cookie') {
      // For Set-Cookie headers, append to the array (multiple Set-Cookie headers are allowed)
      this.setCookieHeaders.push(value);
    } else {
      // For other headers, append the value to existing value or set it
      const existing = this.headers.get(lowerName);
      if (existing) {
        this.headers.set(lowerName, `${existing}, ${value}`);
      } else {
        this.headers.set(lowerName, value);
      }
    }
  }

  has(name: string): boolean {
    return this.headers.has(name.toLowerCase());
  }

  delete(name: string): void {
    const lowerName = name.toLowerCase();
    this.headers.delete(lowerName);
    if (lowerName === 'set-cookie') {
      this.setCookieHeaders = [];
    }
  }

  entries(): IterableIterator<[string, string]> {
    return this.headers.entries();
  }

  forEach(callback: (value: string, key: string) => void): void {
    this.headers.forEach(callback);
  }

  // Next.js 16+ method for getting Set-Cookie headers
  getSetCookie(): string[] {
    return [...this.setCookieHeaders];
  }
}

// Simple Cookies implementation
class MockCookies {
  private cookies: Map<string, string>;

  constructor(cookieHeader?: string) {
    this.cookies = new Map();
    if (cookieHeader) {
      cookieHeader.split(';').forEach(cookie => {
        const trimmed = cookie.trim();
        const equalIndex = trimmed.indexOf('=');
        if (equalIndex > 0) {
          const key = trimmed.substring(0, equalIndex);
          const value = trimmed.substring(equalIndex + 1);
          this.cookies.set(key, value);
        }
      });
    }
  }

  get(name: string): { value: string } | undefined {
    const value = this.cookies.get(name);
    return value ? { value } : undefined;
  }

  set(name: string, value: string, options?: any): void {
    this.cookies.set(name, value);
  }

  has(name: string): boolean {
    return this.cookies.has(name);
  }

  delete(name: string): void {
    this.cookies.delete(name);
  }
}

export class NextRequest {
  url: string;
  method: string;
  headers: MockHeaders;
  private _cookies: MockCookies;
  nextUrl: URL;
  searchParams: URLSearchParams;
  json: jest.Mock = jest.fn();

  constructor(input: Request | string | URL, init?: RequestInit) {
    let url: string;
    let headers: HeadersInit | undefined;
    let method: string;

    if (typeof input === 'string') {
      url = input;
      method = init?.method || 'GET';
      headers = init?.headers;
    } else if (input instanceof URL) {
      url = input.toString();
      method = init?.method || 'GET';
      headers = init?.headers;
    } else {
      // It's a Request object
      url = input.url;
      method = input.method || init?.method || 'GET';
      headers = init?.headers || new MockHeaders(input.headers);
    }

    this.url = url;
    this.nextUrl = new URL(url);
    this.method = method;
    this.searchParams = this.nextUrl.searchParams;
    this.headers = new MockHeaders(headers);

    // Extract cookies from cookie header
    const cookieHeader = this.headers.get('cookie');
    this._cookies = new MockCookies(cookieHeader || undefined);
  }

  get cookies(): MockCookies {
    return this._cookies;
  }
}

export class NextResponse {
  private _body: BodyInit | null;
  private _status: number;
  private _statusText: string;
  private _headers: MockHeaders;
  private _cookies: Map<string, { value: string; options?: any }>;

  constructor(body?: BodyInit | null, init?: ResponseInit) {
    this._body = body || null;
    this._status = init?.status || 200;
    this._statusText = init?.statusText || 'OK';
    this._headers = new MockHeaders(init?.headers);
    this._cookies = new Map();
  }

  static json(data: any, init?: ResponseInit): NextResponse {
    const body = JSON.stringify(data);
    const status = init?.status ?? 200;
    const response = new NextResponse(body, {
      ...init,
      status,
    });
    response._status = status; // Ensure status is set
    response._headers.set('Content-Type', 'application/json');
    return response;
  }

  static redirect(url: string | URL, status = 307): NextResponse {
    const location = typeof url === 'string' ? url : url.toString();
    const response = new NextResponse(null, {
      status,
    });
    response._headers.set('Location', location);
    return response;
  }

  static next(init?: { request?: { headers?: Headers | MockHeaders } }): NextResponse {
    const response = new NextResponse(null, { status: 200 });
    
    // Copy headers from request to response for testing
    // In real Next.js, these headers are available on the request in downstream handlers
    // For testing, we make them available on the response headers
    if (init?.request?.headers) {
      const requestHeaders = init.request.headers;
      if (requestHeaders instanceof MockHeaders) {
        // Copy all headers from request to response
        requestHeaders.headers.forEach((value, key) => {
          response._headers.set(key, value);
        });
      } else if (requestHeaders instanceof Headers) {
        // Handle native Headers object
        requestHeaders.forEach((value, key) => {
          response._headers.set(key, value);
        });
      }
    }
    
    return response;
  }

  get headers(): MockHeaders {
    return this._headers;
  }

  get status(): number {
    return this._status;
  }

  get statusText(): string {
    return this._statusText;
  }

  get cookies() {
    return {
      set: (name: string, value: string, options?: any) => {
        this._cookies.set(name, { value, options });
      },
      delete: (name: string) => {
        this._cookies.delete(name);
      },
      get: (name: string) => {
        return this._cookies.get(name);
      },
    };
  }

  // For compatibility with Response-like usage
  async json(): Promise<any> {
    if (this._body) {
      const bodyStr = typeof this._body === 'string' 
        ? this._body 
        : this._body instanceof Blob
          ? await this._body.text()
          : String(this._body);
      return JSON.parse(bodyStr);
    }
    return null;
  }

  async text(): Promise<string> {
    if (this._body) {
      return typeof this._body === 'string' 
        ? this._body 
        : this._body instanceof Blob
          ? await this._body.text()
          : String(this._body);
    }
    return '';
  }
}
