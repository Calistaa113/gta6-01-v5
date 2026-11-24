// Seeded random numbers so screenshots and traffic are reproducible.
export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return function () {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return (s % 1000000) / 1000000;
  };
}

export function pick(r, list) { return list[Math.floor(r() * list.length)]; }
