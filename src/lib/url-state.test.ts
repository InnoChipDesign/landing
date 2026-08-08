import { describe, expect, it } from 'vitest';

import {
  EMPTY_STATE,
  isDefault,
  parse,
  serialize,
  toggle,
  type ExplorerState,
  type Vocabulary,
} from './url-state';

const vocabulary: Vocabulary = {
  tags: new Set(['fpga', 'riscv', 'cpu', 'memory', 'verification', 'dsp']),
  year: new Set(['2023', '2025']),
  status: new Set(['in-progress', 'completed']),
};

const state = (over: Partial<ExplorerState> = {}): ExplorerState => ({ ...EMPTY_STATE, ...over });

describe('serialize', () => {
  it('produces nothing for the default state, so /club/projects stays clean', () => {
    expect(serialize(EMPTY_STATE)).toBe('');
  });

  it('omits keys at their default rather than emitting empty ones', () => {
    expect(serialize(state({ q: 'riscv' }))).toBe('?q=riscv');
    expect(serialize(state({ sort: 'newest' }))).toBe('');
    expect(serialize(state({ sort: 'oldest' }))).toBe('?sort=oldest');
  });

  it('sorts multi-value keys so click order cannot change the URL', () => {
    const a = serialize(state({ tags: ['riscv', 'cpu', 'fpga'] }));
    const b = serialize(state({ tags: ['fpga', 'riscv', 'cpu'] }));
    expect(a).toBe(b);
    expect(a).toBe('?tags=cpu%2Cfpga%2Criscv');
  });
});

describe('parse', () => {
  it('drops values outside the vocabulary instead of erroring', () => {
    // A link shared before a tag was renamed should still render the rest of the view.
    const parsed = parse('?tags=fpga,nonexistent&year=1066&status=completed', vocabulary);
    expect(parsed.tags).toEqual(['fpga']);
    expect(parsed.year).toEqual([]);
    expect(parsed.status).toEqual(['completed']);
  });

  it('falls back to the default sort for an unknown value', () => {
    expect(parse('?sort=chaotic', vocabulary).sort).toBe('newest');
  });

  it('ignores the parameters removed by D7, D22 and D28', () => {
    const parsed = parse('?team=someone&page=3&image=2', vocabulary);
    expect(parsed).toEqual(EMPTY_STATE);
  });

  it('deduplicates and trims', () => {
    expect(parse('?tags=fpga, fpga ,riscv', vocabulary).tags).toEqual(['fpga', 'riscv']);
  });
});

describe('round trip', () => {
  const valid: ExplorerState[] = [
    EMPTY_STATE,
    state({ q: 'riscv' }),
    state({ tags: ['cpu', 'fpga'] }),
    state({ year: ['2025'] }),
    state({ status: ['completed'] }),
    state({ sort: 'title' }),
    state({ q: 'memory bandwidth', tags: ['memory', 'verification'], sort: 'oldest' }),
    state({
      q: 'a',
      tags: ['cpu', 'dsp', 'fpga', 'memory', 'riscv', 'verification'],
      year: ['2023', '2025'],
      status: ['completed', 'in-progress'],
      sort: 'relevance',
    }),
  ];

  it.each(valid)('parse(serialize(s)) === s for %j', (s) => {
    expect(parse(serialize(s), vocabulary)).toEqual(s);
  });

  it('serialize(parse(x)) is stable for every string the app produces', () => {
    for (const s of valid) {
      const once = serialize(s);
      expect(serialize(parse(once, vocabulary))).toBe(once);
    }
  });
});

describe('toggle', () => {
  it('adds, removes, and keeps the result sorted', () => {
    expect(toggle([], 'fpga')).toEqual(['fpga']);
    expect(toggle(['riscv'], 'cpu')).toEqual(['cpu', 'riscv']);
    expect(toggle(['cpu', 'riscv'], 'cpu')).toEqual(['riscv']);
  });
});

describe('isDefault', () => {
  it('is true only when nothing at all is set', () => {
    expect(isDefault(EMPTY_STATE)).toBe(true);
    expect(isDefault(state({ q: '' , sort: 'newest' }))).toBe(true);
    expect(isDefault(state({ tags: ['fpga'] }))).toBe(false);
    expect(isDefault(state({ sort: 'title' }))).toBe(false);
  });
});
