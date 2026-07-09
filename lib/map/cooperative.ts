// Cooperative-gesture settings shared by every maplibre map in the app.
//
// Why: the app is a fixed-viewport shell (h-screen, inner-scrolling <main>), so a
// tall map that captures the mouse wheel makes the page feel "stuck" — scrolling
// over the map zooms it instead of scrolling past it. maplibre's cooperative
// gestures fix that: plain wheel scrolls the page, Ctrl/⌘ + wheel zooms, and on
// touch you need two fingers to pan. An on-map hint tells the user how.
//
// Pass both to `new maplibregl.Map({ ..., ...COOPERATIVE_MAP_OPTIONS })`.

export const MK_MAP_LOCALE = {
  "CooperativeGesturesHandler.WindowsHelpText": "Користи Ctrl + тркало за зумирање",
  "CooperativeGesturesHandler.MacHelpText": "Користи ⌘ + тркало за зумирање",
  "CooperativeGesturesHandler.MobileHelpText": "Придвижи ја мапата со два прста",
} as const;

export const COOPERATIVE_MAP_OPTIONS = {
  cooperativeGestures: true,
  locale: MK_MAP_LOCALE,
} as const;
