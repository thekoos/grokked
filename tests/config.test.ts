/**
 * @file tests/config.test.ts
 * @version 0.1.0
 * @description Tests for config loading, env var validation, and model name defaults.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('loadConfig', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset env before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  it('throws when XAI_API_KEY is missing', async () => {
    delete process.env['XAI_API_KEY'];
    process.env['GROK_MODEL'] = 'grok-3';
    const { loadConfig } = await import('../src/config');
    expect(() => loadConfig()).toThrow('XAI_API_KEY');
  });

  it('throws when GROK_MODEL is set but empty', async () => {
    process.env['XAI_API_KEY'] = 'test-key';
    process.env['GROK_MODEL'] = '   '; // whitespace-only
    const { loadConfig } = await import('../src/config');
    expect(() => loadConfig()).toThrow('GROK_MODEL');
  });

  it('defaults model to grok-3 when GROK_MODEL is not set', async () => {
    process.env['XAI_API_KEY'] = 'test-key';
    delete process.env['GROK_MODEL'];
    const { loadConfig } = await import('../src/config');
    const config = loadConfig();
    expect(config.model).toBe('grok-3');
  });

  it('uses the provided model name', async () => {
    process.env['XAI_API_KEY'] = 'test-key';
    process.env['GROK_MODEL'] = 'grok-3-mini';
    const { loadConfig } = await import('../src/config');
    const config = loadConfig();
    expect(config.model).toBe('grok-3-mini');
  });

  it('trims whitespace from model name', async () => {
    process.env['XAI_API_KEY'] = 'test-key';
    process.env['GROK_MODEL'] = '  grok-3  ';
    const { loadConfig } = await import('../src/config');
    const config = loadConfig();
    expect(config.model).toBe('grok-3');
  });

  it('returns the api key from env', async () => {
    process.env['XAI_API_KEY'] = 'xai-abc123';
    process.env['GROK_MODEL'] = 'grok-3';
    const { loadConfig } = await import('../src/config');
    const config = loadConfig();
    expect(config.apiKey).toBe('xai-abc123');
  });
});
