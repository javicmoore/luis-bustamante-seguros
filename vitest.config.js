import { defineConfig } from 'vitest/config';

// Pruebas unitarias en Node, sin los plugins del servidor local de Vite.
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.js'],
    environment: 'node',
    restoreMocks: true,
  },
});
