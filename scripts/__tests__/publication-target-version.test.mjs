import { it, expect } from 'vitest';
import { publicTargetSlug } from '../lib/library-publisher.mjs';
it('preserves the historical target binding and appends the new unit descriptor', () => {
  const target={name:'eod_close_price_step_over_step_percentage_change',unit:'basis_point'};
  expect(publicTargetSlug(target,6)).toBe('adjusted-end-of-day-close-return');
  expect(publicTargetSlug(target,7)).toBe('adjusted-end-of-day-close-return-basis-points');
});
