export function isValidServerMode(mode) {
  return mode === "development" || mode === "production" || mode === "test";
}
