import '@testing-library/jest-dom';
import * as matchers from 'vitest-axe/matchers';
import { expect } from 'vitest';

expect.extend(matchers);

// Mock global EventSource for SSE testing in JSDOM
if (typeof window !== 'undefined' && !window.EventSource) {
    class MockEventSource {
        constructor() {
            this.onopen = null;
            this.onmessage = null;
            this.onerror = null;
            setTimeout(() => this.onopen && this.onopen(), 0);
        }
        close() {}
        addEventListener() {}
        removeEventListener() {}
    }
    window.EventSource = MockEventSource;
    global.EventSource = MockEventSource;
}
