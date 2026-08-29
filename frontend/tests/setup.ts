import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

// jsdom n'implémente pas scrollIntoView, utilisé par le fil de discussion.
window.HTMLElement.prototype.scrollIntoView = () => {};
