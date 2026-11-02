const clamp = (value, min, max) => Math.max(min, Math.min(value, Math.max(min, max)));

export function workspaceGuidePosition(target, card, viewport) {
  const gap = 20, edge = 12;
  const topEdge = viewport.top ?? edge;
  let width = Math.min(card.width, viewport.width - edge * 2);
  let height = Math.min(card.height, viewport.height - edge * 2);
  const left = clamp(target.left - 6, edge, viewport.width - edge);
  const top = clamp(target.top - 6, topEdge, viewport.height - edge);
  const highlight = { left, top,
    width: Math.max(0, Math.min(target.right + 6, viewport.width - edge) - left),
    height: Math.max(0, Math.min(target.bottom + 6, viewport.height - edge) - top) };
  const right = highlight.left + highlight.width, bottom = highlight.top + highlight.height;
  let placement, x, y, maxHeight;
  if (right + gap + width <= viewport.width - edge) {
    placement = 'right'; x = right + gap; y = highlight.top;
  } else if (highlight.left - gap - width >= edge) {
    placement = 'left'; x = highlight.left - gap - width; y = highlight.top;
  } else if (bottom + gap + height <= viewport.height - edge) {
    placement = 'bottom'; x = highlight.left; y = bottom + gap;
  } else if (highlight.top - gap - height >= topEdge) {
    placement = 'top'; x = highlight.left; y = highlight.top - gap - height;
  } else if (Math.max(viewport.width - edge - right - gap, highlight.left - gap - edge) >= 240) {
    const rightSpace = viewport.width - edge - right - gap;
    const leftSpace = highlight.left - gap - edge;
    placement = rightSpace >= leftSpace ? 'right' : 'left';
    width = Math.min(350, Math.max(rightSpace, leftSpace));
    x = placement === 'right' ? right + gap : highlight.left - gap - width;
    y = highlight.top;
  } else {
    const belowSpace = viewport.height - edge - bottom - gap;
    const aboveSpace = highlight.top - gap - topEdge;
    if (Math.max(belowSpace, aboveSpace) >= 120 && highlight.height <= 180) {
      // Keep compact controls fully highlighted; scroll the explanation instead of cropping the target.
      placement = belowSpace >= aboveSpace ? 'bottom' : 'top';
      maxHeight = placement === 'bottom' ? belowSpace : aboveSpace;
      height = Math.min(height, maxHeight);
      x = highlight.left;
      y = placement === 'bottom' ? bottom + gap : highlight.top - gap - height;
    } else {
      // Large sections keep their full outline. Float the explanation inside when no side fits.
      placement = 'inset';
      x = right - width - 16;
      y = highlight.top + 16;
    }
  }
  if (placement === 'bottom' && maxHeight === undefined) maxHeight = viewport.height - edge - y;
  if (placement === 'top' && maxHeight === undefined) maxHeight = highlight.top - gap - y;
  x = clamp(x, edge, viewport.width - width - edge);
  y = clamp(y, edge, viewport.height - height - edge);
  let start, end;
  if (placement === 'right' || placement === 'left') {
    const lineY = clamp(y + 40, highlight.top + 8, highlight.top + highlight.height - 8);
    start = { x: placement === 'right' ? x : x + width, y: clamp(lineY, y + 16, y + height - 16) };
    end = { x: placement === 'right' ? highlight.left + highlight.width + 3 : highlight.left - 3, y: lineY };
  } else if (placement === 'inset') {
    start = { x: x + width / 2, y: y + height };
    end = { x: x + width / 2, y: Math.max(y + height + 8, bottom - 8) };
    end.y = Math.min(end.y, viewport.height - edge);
  } else {
    const lineX = clamp(x + width / 2, highlight.left + 8, highlight.left + highlight.width - 8);
    start = { x: clamp(lineX, x + 16, x + width - 16), y: placement === 'bottom' ? y : y + height };
    end = { x: lineX, y: placement === 'bottom' ? highlight.top + highlight.height + 3 : highlight.top - 3 };
  }
  return { highlight, card: { left: x, top: y, width, ...(maxHeight > 0 ? { maxHeight } : {}) }, start, end };
}
