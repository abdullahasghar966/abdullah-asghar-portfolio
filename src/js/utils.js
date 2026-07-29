export const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const FINE_POINTER = window.matchMedia('(pointer: fine)').matches;

export const qs = (sel, scope = document) => scope.querySelector(sel);
export const qsa = (sel, scope = document) => [...scope.querySelectorAll(sel)];
