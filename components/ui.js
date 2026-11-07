const base =
  "inline-flex cursor-pointer touch-manipulation select-none items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50";

export const btn = `${base} border border-line bg-card px-3.5 py-1.5 text-ink shadow-soft hover:border-accent hover:bg-card-2`;

export const btnPrimary = `${base} border border-transparent bg-accent px-3.5 py-1.5 text-accent-ink shadow-soft hover:bg-accent-hover`;

export const btnDanger = `${base} border border-transparent bg-danger px-3.5 py-1.5 text-white shadow-soft hover:brightness-110`;

export const btnGhost = `${base} border border-transparent bg-transparent px-2.5 py-1.5 text-muted hover:bg-card hover:text-ink`;

export const btnSm = `${base} border border-line bg-card px-2.5 py-1 text-[13px] text-ink hover:border-accent hover:bg-card-2`;

export const btnPrimarySm = `${base} border border-transparent bg-accent px-2.5 py-1 text-[13px] text-accent-ink hover:bg-accent-hover`;

export const iconBtn =
  "inline-flex size-8 cursor-pointer touch-manipulation items-center justify-center rounded-lg border-0 bg-transparent text-muted transition-colors hover:bg-bg-2 hover:text-ink pointer-coarse:size-9";

export const field =
  "w-full min-w-0 rounded-lg border border-line bg-card px-3 py-2 text-base text-ink outline-none transition-colors placeholder:text-muted/80 hover:border-accent focus:border-accent focus:ring-2 focus:ring-accent/20 sm:text-[15px]";

export const badge =
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold";
