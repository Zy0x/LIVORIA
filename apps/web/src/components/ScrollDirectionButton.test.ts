import { describe, expect, it } from 'vitest';
import { resolveScrollButtonDirection } from './ScrollDirectionButton';

describe('resolveScrollButtonDirection', () => {
  it('shows down while user scrolls down in the middle of the page', () => {
    expect(
      resolveScrollButtonDirection({
        currentY: 720,
        previousY: 640,
        scrollMax: 1600,
        previousDirection: 'up',
        minDelta: 2,
      }),
    ).toBe('down');
  });

  it('shows up while user scrolls up in the middle of the page', () => {
    expect(
      resolveScrollButtonDirection({
        currentY: 640,
        previousY: 720,
        scrollMax: 1600,
        previousDirection: 'down',
        minDelta: 2,
      }),
    ).toBe('up');
  });

  it('keeps previous direction for tiny layout jitter', () => {
    expect(
      resolveScrollButtonDirection({
        currentY: 641,
        previousY: 640,
        scrollMax: 1600,
        previousDirection: 'up',
        minDelta: 2,
      }),
    ).toBe('up');
  });

  it('uses boundary-safe direction at page edges', () => {
    expect(
      resolveScrollButtonDirection({
        currentY: 0,
        previousY: 80,
        scrollMax: 1600,
        previousDirection: 'up',
        minDelta: 2,
      }),
    ).toBe('down');

    expect(
      resolveScrollButtonDirection({
        currentY: 1590,
        previousY: 1500,
        scrollMax: 1600,
        previousDirection: 'down',
        minDelta: 2,
      }),
    ).toBe('up');
  });
});
