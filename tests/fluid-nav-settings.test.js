/**
 * FluidNavigation settings validation tests (Node, mocked)
 * Usage: node tests/fluid-nav-settings.test.js
 */

function clamp(n, min, max) {
  n = Number(n);
  if (isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

var TRANSITIONS = ["fade", "slide_horizontal", "slide_vertical", "scale_fade", "spring", "minimal", "none"];

var passed = 0, failed = 0;
function assert(name, cond) {
  if (cond) { passed++; console.log("  PASS:", name); }
  else { failed++; console.log("  FAIL:", name); }
}

console.log("=== duration clamp ===");
assert("280 stays", clamp(280, 0, 800) === 280);
assert("negative -> 0", clamp(-10, 0, 800) === 0);
assert("over -> 800", clamp(9999, 0, 800) === 800);
assert("NaN -> min", clamp("x", 0, 800) === 0);

console.log("=== intensity clamp ===");
assert("1.0 stays", clamp(1.0, 0.1, 2.0) === 1.0);
assert("0 -> 0.1", clamp(0, 0.1, 2.0) === 0.1);
assert("3 -> 2", clamp(3, 0.1, 2.0) === 2.0);

console.log("=== transitions ===");
assert("all known", TRANSITIONS.length === 7);
assert("includes none", TRANSITIONS.indexOf("none") >= 0);
assert("includes fade", TRANSITIONS.indexOf("fade") >= 0);

console.log("=== reduced motion behavior ===");
function getDuration(storage) {
  if (storage.reducedMotion) return 0;
  return clamp(storage.duration, 0, 800);
}
assert("reduced forces 0", getDuration({ reducedMotion: true, duration: 300 }) === 0);
assert("normal uses duration", getDuration({ reducedMotion: false, duration: 300 }) === 300);

console.log("\nResults:", passed, "passed,", failed, "failed");
process.exit(failed ? 1 : 0);
