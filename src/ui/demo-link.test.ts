import { describe, expect, it } from 'vitest';
import { demoLink, keepInMemory } from './demo-link.ts';

/** A stand-in for the browser's store, with the same methods on its prototype. */
class Store {
  data = new Map<string, string>();
  get length(): number { return this.data.size; }
  key(i: number): string | null { return [...this.data.keys()][i] ?? null; }
  getItem(k: string): string | null { return this.data.get(k) ?? null; }
  setItem(k: string, v: string): void { this.data.set(k, v); }
  removeItem(k: string): void { this.data.delete(k); }
  clear(): void { this.data.clear(); }
}

describe('the hidden demo link (?demo=1)', () => {
  it('is on only for ?demo=1', () => {
    expect(demoLink('?demo=1')).toBe(true);
    expect(demoLink('?cover=0&demo=1')).toBe(true);
    expect(demoLink('?demo=0')).toBe(false);
    expect(demoLink('')).toBe(false);
  });

  it('keeps every write in memory: the page reads its own writes, the real store never changes', () => {
    const store = new Store();
    store.data.set('rush-hour-rigs:v2', 'saved');
    store.data.set('rush-hour-rigs:log', 'log');
    const mem = keepInMemory(store as unknown as Storage);
    // Reads fall through to what is really stored.
    expect(store.getItem('rush-hour-rigs:v2')).toBe('saved');
    // A write is seen by the page and by nothing else.
    store.setItem('rush-hour-rigs:v2', 'played');
    store.setItem('rush-hour-rigs-audio', 'on');
    expect(store.getItem('rush-hour-rigs:v2')).toBe('played');
    expect(store.getItem('rush-hour-rigs-audio')).toBe('on');
    // A removal and a clear (Reset progress) too.
    store.removeItem('rush-hour-rigs:log');
    expect(store.getItem('rush-hour-rigs:log')).toBeNull();
    store.clear();
    expect(store.getItem('rush-hour-rigs:v2')).toBeNull();
    expect(store.getItem('rush-hour-rigs-audio')).toBeNull();
    expect([...store.data.entries()]).toEqual([['rush-hour-rigs:v2', 'saved'], ['rush-hour-rigs:log', 'log']]);
    expect(mem.size).toBeGreaterThan(0);
    // Another store of the same kind is left alone.
    const other = new Store();
    other.setItem('a', '1');
    expect(other.data.get('a')).toBe('1');
    other.removeItem('a');
    expect(other.data.size).toBe(0);
  });
});
