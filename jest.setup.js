require('@testing-library/jest-dom');

// Polyfill for Next.js server-side APIs (Request, Response, Headers, etc.)
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock Request and Response for Next.js API routes
if (typeof global.Request === 'undefined') {
  global.Request = class Request {};
}

if (typeof global.Response === 'undefined') {
  global.Response = class Response {};
}

if (typeof global.Headers === 'undefined') {
  global.Headers = class Headers {
    constructor() {
      this.headers = {};
    }
    get(name) {
      return this.headers[name.toLowerCase()];
    }
    set(name, value) {
      this.headers[name.toLowerCase()] = value;
    }
    has(name) {
      return name.toLowerCase() in this.headers;
    }
  };
}