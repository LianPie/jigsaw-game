
export type PieceEdges = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

type Point = {
  x: number;
  y: number;
};

function drawEdge(
  ctx: CanvasRenderingContext2D,
  start: Point,
  end: Point,
  normal: Point,
  direction: number,
  depth: number
) {
  const point = (t: number, offset = 0): Point => ({
    x: start.x + (end.x - start.x) * t + normal.x * offset,
    y: start.y + (end.y - start.y) * t + normal.y * offset,
  });

  const p35 = point(0.35);
  const p38 = point(0.38);
  const p50 = point(0.50, direction * depth);
  const p62 = point(0.62);
  const p65 = point(0.65);

  ctx.lineTo(p35.x, p35.y);

  ctx.bezierCurveTo(
    p38.x, p38.y,
    p38.x + normal.x * direction * depth,
    p38.y + normal.y * direction * depth,
    p50.x, p50.y
  );

  ctx.bezierCurveTo(
    p62.x + normal.x * direction * depth,
    p62.y + normal.y * direction * depth,
    p62.x, p62.y,
    p65.x, p65.y
  );

  ctx.lineTo(end.x, end.y);
}

export function drawPieceShape(
  ctx: CanvasRenderingContext2D,
  tileSize: number,
  margin: number,
  edges: PieceEdges
) {
  const size = tileSize + margin * 2;
  const depth = margin * 0.85;

  const topLeft = { x: margin, y: margin };
  const topRight = { x: margin + tileSize, y: margin };
  const bottomRight = {
    x: margin + tileSize,
    y: margin + tileSize,
  };
  const bottomLeft = {
    x: margin,
    y: margin + tileSize,
  };

  ctx.beginPath();
  ctx.moveTo(topLeft.x, topLeft.y);

  // Top
  drawEdge(
    ctx, topLeft, topRight,
    { x: 0, y: -1 }, edges.top, depth
  );

  // Right
  drawEdge(
    ctx, topRight, bottomRight,
    { x: 1, y: 0 }, edges.right, depth
  );

  // Bottom
  drawEdge(
    ctx, bottomRight, bottomLeft,
    { x: 0, y: 1 }, edges.bottom, depth
  );

  // Left
  drawEdge(
    ctx, bottomLeft, topLeft,
    { x: -1, y: 0 }, edges.left, depth
  );

  ctx.closePath();
  ctx.clip();
}
