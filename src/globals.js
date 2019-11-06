export const VIEW_PLUGINS = new Map();
export const REVISION = document.currentScript && document.currentScript.getAttribute('revision') || '';
export const PORT = window.port;
export const ENTRY_UNIT = document.currentScript.getAttribute("data-entry-unit") || "master";