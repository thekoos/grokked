/**
 * @file tests/config.test.ts
 * @version 0.1.1
 * @description Tests for config loading, env var validation, model name defaults, and GROK_MODELS parsing.
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

  // ── GROK_MODELS ────────────────────────────────────────────────────────────

  it('parses GROK_MODELS into a models array', async () => {
    process.env['XAI_API_KEY'] = 'test-key';
    process.env['GROK_MODEL'] = 'grok-3';
    process.env['GROK_MODELS'] = 'grok-3,grok-3-mini,grok-4-0709';
    const { loadConfig } = await import('../src/config');
    const config = loadConfig();
    expect(config.models).toEqual(['grok-3', 'grok-3-mini', 'grok-4-0709']);
  });

  it('prepends the startup model when it is not in GROK_MODELS', async () => {
    process.env['XAI_API_KEY'] = 'test-key';
    process.env['GROK_MODEL'] = 'grok-4-0709';
    process.env['GROK_MODELS'] = 'grok-3,grok-3-mini';
    const { loadConfig } = await import('../src/config');
    const config = loadConfig();
    expect(config.models[0]).toBe('grok-4-0709');
    expect(config.models).toContain('grok-3');
    expect(config.models).toContain('grok-3-mini');
  });

  it('does not duplicate the startup model when it is already in GROK_MODELS', async () => {
    process.env['XAI_API_KEY'] = 'test-key';
    process.env['GROK_MODEL'] = 'grok-3-mini';
    process.env['GROK_MODELS'] = 'grok-3,grok-3-mini,grok-4-0709';
    const { loadConfig } = await import('../src/config');
    const config = loadConfig();
    const count = config.models.filter((m) => m === 'grok-3-mini').length;
    expect(count).toBe(1);
  });

  it('falls back to a single-item models list when GROK_MODELS is not set', async () => {
    process.env['XAI_API_KEY'] = 'test-key';
    process.env['GROK_MODEL'] = 'grok-3';
    delete process.env['GROK_MODELS'];
    const { loadConfig } = await import('../src/config');
    const config = loadConfig();
    expect(config.models).toEqual(['grok-3']);
  });

  it('trims whitespace from entries in GROK_MODELS', async () => {
    process.env['XAI_API_KEY'] = 'test-key';
    process.env['GROK_MODEL'] = 'grok-3';
    process.env['GROK_MODELS'] = ' grok-3 , grok-3-mini , grok-4-0709 ';
    const { loadConfig } = await import('../src/config');
    const config = loadConfig();
    expect(config.models).toEqual(['grok-3', 'grok-3-mini', 'grok-4-0709']);
  });

  it('ignores empty entries in GROK_MODELS', async () => {
    process.env['XAI_API_KEY'] = 'test-key';
    process.env['GROK_MODEL'] = 'grok-3';
    process.env['GROK_MODELS'] = 'grok-3,,grok-3-mini,';
    const { loadConfig } = await import('../src/config');
    const config = loadConfig();
    expect(config.models).toEqual(['grok-3', 'grok-3-mini']);
  });
});
