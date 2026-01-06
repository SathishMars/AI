require('@testing-library/jest-dom');

// Polyfill for Next.js server-side APIs (Request, Response, Headers, etc.)
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Polyfill for TransformStream (required by AI SDK)
if (typeof global.TransformStream === 'undefined') {
  const { TransformStream } = require('stream/web');
  global.TransformStream = TransformStream;
}

// Polyfill for URL and URLSearchParams if needed
if (typeof global.URL === 'undefined') {
  global.URL = require('url').URL;
  global.URLSearchParams = require('url').URLSearchParams;
}

// Polyfill for window.matchMedia (required by Radix UI components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Minimal Request/Response mocks for Node.js environment
// The actual NextRequest/NextResponse are mocked in __mocks__/next-server.ts
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init = {}) {
      this.url = typeof input === 'string' ? input : input.url || input;
      this.method = init.method || 'GET';
      this.headers = new Headers(init.headers);
    }
  };
}

if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.statusText = init.statusText || 'OK';
      this.headers = new Headers(init.headers);
    }
  };
}

if (typeof global.Headers === 'undefined') {
  global.Headers = class Headers {
    constructor(init) {
      this.headers = {};
      if (init) {
        if (Array.isArray(init)) {
          init.forEach(([key, value]) => {
            this.headers[key.toLowerCase()] = value;
          });
        } else if (typeof init === 'object') {
          Object.entries(init).forEach(([key, value]) => {
            this.headers[key.toLowerCase()] = value;
          });
        }
      }
    }
    get(name) {
      return this.headers[name.toLowerCase()] || null;
    }
    set(name, value) {
      this.headers[name.toLowerCase()] = value;
    }
    has(name) {
      return name.toLowerCase() in this.headers;
    }
    delete(name) {
      delete this.headers[name.toLowerCase()];
    }
    entries() {
      return Object.entries(this.headers);
    }
    forEach(callback) {
      Object.entries(this.headers).forEach(([key, value]) => {
        callback(value, key);
      });
    }
  };
}

// Mock fetch for standalone mode tests
if (typeof global.fetch === 'undefined') {
  global.fetch = jest.fn();
}