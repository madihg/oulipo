/**
 * src/layout.js - the five layouts + smooth FLIP transitions (DOM).
 *
 * Each layout (L1..L5) is a CSS grid arrangement of the three component boxes
 * (me / words / illus), selected via `data-layout` on the stage. Changing
 * `data-layout` would snap the boxes to new positions, so we FLIP: measure each
 * box First, change the layout (Last), Invert with a transform, then Play the
 * transform away. Honors prefers-reduced-motion by snapping.
 */

const FLIP_MS = 620;

export function createLayout(stageEl, boxes, { reduced = false } = {}) {
  // boxes: { me, words, illus }
  const items = Object.values(boxes);

  let anims = [];

  function set(layoutName) {
    // cancel any in-flight transition so positions never get stuck mid-FLIP
    for (const a of anims) a.cancel();
    anims = [];

    if (reduced || typeof items[0].animate !== "function") {
      stageEl.setAttribute("data-layout", layoutName);
      return;
    }

    const first = items.map((el) => el.getBoundingClientRect());
    stageEl.setAttribute("data-layout", layoutName);
    const last = items.map((el) => el.getBoundingClientRect());

    items.forEach((el, i) => {
      const f = first[i];
      const l = last[i];
      if (!f.width || !l.width) return; // box was hidden; nothing to invert
      const dx = f.left - l.left;
      const dy = f.top - l.top;
      const sx = f.width / l.width;
      const sy = f.height / l.height;
      if (
        Math.abs(dx) < 0.5 &&
        Math.abs(dy) < 0.5 &&
        Math.abs(sx - 1) < 0.01 &&
        Math.abs(sy - 1) < 0.01
      )
        return;
      // Web Animations API: fill defaults to "none", so nothing persists after
      // the tween - the box settles into its real grid position by itself.
      anims.push(
        el.animate(
          [
            {
              transformOrigin: "top left",
              transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
            },
            { transformOrigin: "top left", transform: "none" },
          ],
          { duration: FLIP_MS, easing: "cubic-bezier(0.65, 0, 0.35, 1)" },
        ),
      );
    });
  }

  return { set };
}
