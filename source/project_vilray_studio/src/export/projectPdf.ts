import type { ProjectCalculation } from '../calculation/calculateProject';
import { generateRectLayout, type LayoutTilePiece } from '../layout/layoutEngine';
import { getBoundingBox, segmentLength } from '../project/geometry';
import type { FinishZone, PointMm, RoomArea, TileMaterial, TileProject } from '../types/project';

const PAGE_WIDTH = 1240;
const PAGE_HEIGHT = 1754;
const PAGE_MARGIN = 72;
const HEADER_BOTTOM = 168;
const FOOTER_SPACE = 56;
const CONTENT_BOTTOM = PAGE_HEIGHT - FOOTER_SPACE;
const MINOR_GRID_MM = 250;
const MAJOR_GRID_MM = 1000;

export interface PdfSchemeOptions {
  includeFloor: boolean;
  includeWalls: boolean;
  surfaceIds?: Iterable<string>;
}

export function exportProjectPdf(
  project: TileProject,
  calculation: ProjectCalculation,
  options: PdfSchemeOptions = { includeFloor: true, includeWalls: true },
) {
  const pages = drawReportPages(project, calculation, {
    includeFloor: options.includeFloor,
    includeWalls: options.includeWalls,
    surfaceIds: options.surfaceIds,
  });
  const blob = buildImagePdf(pages.map((page) => page.toDataURL('image/jpeg', 0.92)));
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `raschet-plitki-${new Date().toISOString().slice(0, 10)}.pdf`;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1500);
}

function drawReportPages(
  project: TileProject,
  calculation: ProjectCalculation,
  options: PdfSchemeOptions,
) {
  const pages: HTMLCanvasElement[] = [];
  let page = createPage();
  pages.push(page.canvas);
  drawHeader(page.context, project.name);
  let y = HEADER_BOTTOM + 28;

  const selectedIds = new Set(options.surfaceIds ?? calculation.zones.map((zone) => zone.surfaceId));
  const includeFloor = options.includeFloor && hasSelectedFloors(project, selectedIds);
  const includeWalls = options.includeWalls && hasSelectedWalls(project, selectedIds);

  const calcHeight = estimateCalculationHeight(calculation);
  const schemeBudget = Math.max(320, CONTENT_BOTTOM - y - calcHeight - 36);

  if (includeFloor) {
    let height = Math.max(300, includeWalls ? Math.round(schemeBudget * 0.52) : schemeBudget);
    if (y + height > CONTENT_BOTTOM) {
      page = createPage();
      pages.push(page.canvas);
      y = PAGE_MARGIN;
      height = CONTENT_BOTTOM - y;
    }
    y = drawFloorScheme(page.context, project, selectedIds, y, height) + 18;
  }

  if (includeWalls) {
    let height = Math.max(260, includeFloor ? Math.max(280, schemeBudget - Math.round(schemeBudget * 0.52) - 18) : schemeBudget);
    if (y + height > CONTENT_BOTTOM) {
      page = createPage();
      pages.push(page.canvas);
      y = PAGE_MARGIN;
      height = CONTENT_BOTTOM - y;
    }
    y = drawWallsScheme(page.context, project, selectedIds, y, height) + 24;
  }

  if (y + calcHeight > CONTENT_BOTTOM) {
    page = createPage();
    pages.push(page.canvas);
    y = PAGE_MARGIN;
  }
  drawCalculation(page.context, calculation, y);
  drawFooter(pages[pages.length - 1].getContext('2d')!);
  return pages;
}

function createPage() {
  const canvas = document.createElement('canvas');
  canvas.width = PAGE_WIDTH;
  canvas.height = PAGE_HEIGHT;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#FFFFFF';
  context.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  return { canvas, context };
}

function drawHeader(context: CanvasRenderingContext2D, projectName: string) {
  context.fillStyle = '#FAF8FC';
  context.fillRect(0, 0, PAGE_WIDTH, HEADER_BOTTOM);
  drawLogoMark(context, 72, 48);
  context.fillStyle = '#2E2A3A';
  context.font = '700 34px Arial, sans-serif';
  context.fillText('Посчитай плитку', 148, 78);
  context.fillStyle = '#7A7690';
  context.font = '400 18px Arial, sans-serif';
  context.fillText('vilraystudio.ru', 148, 108);
  context.fillStyle = '#5B3F7A';
  context.font = '600 18px Arial, sans-serif';
  context.fillText(projectName || 'Проект', 148, 136);
  context.strokeStyle = '#E8DFF3';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(72, HEADER_BOTTOM);
  context.lineTo(PAGE_WIDTH - 72, HEADER_BOTTOM);
  context.stroke();
}

function drawFooter(context: CanvasRenderingContext2D) {
  context.fillStyle = '#9A96A8';
  context.font = '400 13px Arial, sans-serif';
  context.textAlign = 'center';
  context.fillText('Разработано VilrayStudio', PAGE_WIDTH / 2, PAGE_HEIGHT - 24);
  context.textAlign = 'start';
}

function drawLogoMark(context: CanvasRenderingContext2D, x: number, y: number) {
  context.fillStyle = '#A385C4';
  roundRect(context, x, y, 28, 22, 5);
  context.fill();
  context.fillStyle = '#8F6BB8';
  roundRect(context, x + 18, y + 10, 28, 22, 5);
  context.fill();
  context.fillStyle = '#C0A0DC';
  roundRect(context, x + 8, y + 18, 28, 22, 5);
  context.fill();
}

function drawFloorScheme(context: CanvasRenderingContext2D, project: TileProject, selectedIds: Set<string>, top: number, height: number) {
  const areas = getAreas(project).filter((area, areaIndex) => selectedIds.has(floorSurfaceId(area, areaIndex)));
  if (!areas.length) return top;
  const allPoints = areas.flatMap((area) => area.contour);
  const box = getBoundingBox(allPoints);
  const frame = { x: PAGE_MARGIN, y: top, w: PAGE_WIDTH - PAGE_MARGIN * 2, h: height };
  beginSchemeFrame(context, frame, 'Схема пола');

  const padding = 56;
  const scale = Math.min((frame.w - padding * 2) / Math.max(1, box.width), (frame.h - padding * 2 - 8) / Math.max(1, box.height));
  const originX = frame.x + (frame.w - box.width * scale) / 2 - box.minX * scale;
  const originY = frame.y + 18 + (frame.h - 18 - box.height * scale) / 2 - box.minY * scale;
  const toPage = (point: PointMm) => ({ x: originX + point.x * scale, y: originY + point.y * scale });

  clipSchemeFrame(context, frame, () => {
    drawSchemeGrid(context, frame, originX, originY, scale);
    const materialsById = new Map(project.materials.map((material) => [material.id, material]));
    areas.forEach((area) => {
      const floorId = floorSurfaceId(area, getAreas(project).findIndex((item) => item.id === area.id));
      const floor = project.surfaces.find((surface) => surface.id === floorId);
      const contour = area.contour.map(toPage);
      const bounds = getBoundingBox(area.contour);
      const material = floor?.zones[0]?.materialId ? materialsById.get(floor.zones[0].materialId) ?? null : null;

      context.save();
      tracePolygon(context, contour);
      context.clip();
      context.fillStyle = '#FFFFFF';
      context.fill();
      if (material && floor?.zones[0]) {
        drawTiles(context, floor.zones[0], material, originX + bounds.minX * scale, originY + bounds.minY * scale, scale, 'floor', bounds.width, bounds.height);
      }
      for (const object of project.objects.filter((item) => item.areaId === area.id && item.excludeFloorTile)) {
        drawObjectFootprint(context, object, toPage, '#FFFFFF');
      }
      context.restore();

      for (const zone of floor?.zones.slice(1) ?? []) {
        const zoneMaterial = zone.materialId ? materialsById.get(zone.materialId) : null;
        if (!zoneMaterial) continue;
        const zoneContour = zoneContourPoints(zone, bounds).map(toPage);
        context.save();
        tracePolygon(context, zoneContour);
        context.clip();
        const zoneBox = getBoundingBox(zoneContourPoints(zone, bounds));
        drawTiles(context, zone, zoneMaterial, originX + zoneBox.minX * scale, originY + zoneBox.minY * scale, scale, 'floor', zoneBox.width, zoneBox.height);
        context.restore();
      }

      context.save();
      tracePolygon(context, contour);
      context.strokeStyle = '#8F6BB8';
      context.lineWidth = 3.5;
      context.stroke();
      context.restore();

      for (const object of project.objects.filter((item) => item.areaId === area.id && !item.excludeFloorTile)) {
        drawObjectFootprint(context, object, toPage, 'rgba(143, 107, 184, 0.28)');
      }

      context.fillStyle = '#2E2A3A';
      context.font = '600 13px Arial, sans-serif';
      context.fillText(area.name, Math.min(...contour.map((item) => item.x)) + 10, Math.min(...contour.map((item) => item.y)) + 18);

      const center = {
        x: contour.reduce((sum, item) => sum + item.x, 0) / contour.length,
        y: contour.reduce((sum, item) => sum + item.y, 0) / contour.length,
      };
      area.contour.forEach((start, index) => {
        const end = area.contour[(index + 1) % area.contour.length];
        drawDimensionTag(context, `${Math.round(segmentLength(start, end))} мм`, toPage(start), toPage(end), center);
      });
    });

    for (const partition of project.room.partitions ?? []) {
      if (!areas.some((area) => area.id === (partition.areaId ?? areas[0]?.id))) continue;
      const a = toPage(partition.start);
      const b = toPage(partition.end);
      context.strokeStyle = '#6F4F93';
      context.lineWidth = Math.max(2, partition.thicknessMm * scale);
      context.beginPath();
      context.moveTo(a.x, a.y);
      context.lineTo(b.x, b.y);
      context.stroke();
    }
  });

  return frame.y + frame.h;
}

function drawWallsScheme(context: CanvasRenderingContext2D, project: TileProject, selectedIds: Set<string>, top: number, height: number) {
  const frame = { x: PAGE_MARGIN, y: top, w: PAGE_WIDTH - PAGE_MARGIN * 2, h: height };
  beginSchemeFrame(context, frame, 'Схема стен');
  const areas = getAreas(project);
  const walls = project.surfaces.filter((surface) => surface.type === 'wall' && selectedIds.has(surface.id));
  const wallsByArea = new Map<string, TileProject['surfaces']>();
  for (const wall of walls) {
    const parts = wall.sourceRef?.split(':') ?? [];
    const partition = parts[0] === 'partition' ? project.room.partitions?.find((item) => item.id === parts[1]) : null;
    const areaId = parts[0] === 'wall' ? parts[1] : partition?.areaId ?? areas[0]?.id ?? 'room-1';
    const bucket = wallsByArea.get(areaId) ?? [];
    bucket.push(wall);
    wallsByArea.set(areaId, bucket);
  }

  const gap = 28;
  const labelSpace = 36;
  const inner = { x: frame.x + 18, y: frame.y + 38, w: frame.w - 36, h: frame.h - 52 };
  const rows = areas.map((area) => {
    const areaWalls = wallsByArea.get(area.id) ?? [];
    return { area, walls: areaWalls, widthMm: areaWalls.reduce((sum, wall) => sum + wall.widthMm, 0), heightMm: Math.max(area.heightMm ?? project.room.heightMm, ...areaWalls.map((wall) => wall.heightMm), 1) };
  }).filter((row) => row.walls.length);
  if (!rows.length) {
    context.fillStyle = '#7A7690';
    context.font = '400 16px Arial, sans-serif';
    context.fillText('Нет стен для схемы', frame.x + 22, frame.y + 56);
    return frame.y + frame.h;
  }
  const totalWidthMm = Math.max(1, ...rows.map((row) => row.widthMm + Math.max(0, row.walls.length - 1) * 400));
  const totalHeightMm = rows.reduce((sum, row) => sum + row.heightMm, 0) + Math.max(0, rows.length - 1) * 700;
  const scale = Math.min(
    (inner.w - gap * Math.max(0, Math.max(...rows.map((row) => row.walls.length)) - 1)) / Math.max(1, totalWidthMm),
    (inner.h - labelSpace * rows.length - 22 * Math.max(0, rows.length - 1)) / Math.max(1, totalHeightMm),
  );

  clipSchemeFrame(context, frame, () => {
    drawSchemeGrid(context, frame, inner.x, inner.y, scale);
    const materialsById = new Map(project.materials.map((material) => [material.id, material]));
    let rowY = inner.y;
    for (const row of rows) {
      context.fillStyle = '#4E4458';
      context.font = '600 13px Arial, sans-serif';
      context.fillText(row.area.name, inner.x, rowY + 12);
      let x = inner.x;
      const wallHeight = row.heightMm * scale;
      for (const wall of row.walls) {
        const wallWidth = wall.widthMm * scale;
        const wallTop = rowY + 18;
        context.fillStyle = '#FFFFFF';
        context.fillRect(x, wallTop, wallWidth, wallHeight);
        const material = wall.zones[0]?.materialId ? materialsById.get(wall.zones[0].materialId) ?? null : null;
        context.save();
        context.beginPath();
        context.rect(x, wallTop, wallWidth, wallHeight);
        context.clip();
        if (material && wall.zones[0]) {
          drawTiles(context, wall.zones[0], material, x, wallTop, scale, 'wall', wall.widthMm, wall.heightMm);
        }
        for (const zone of wall.zones.slice(1)) {
          if (zone.shape.type !== 'rect') continue;
          const zoneMaterial = zone.materialId ? materialsById.get(zone.materialId) : null;
          if (!zoneMaterial) continue;
          context.save();
          context.beginPath();
          context.rect(x + zone.shape.xMm * scale, wallTop + zone.shape.yMm * scale, zone.shape.widthMm * scale, zone.shape.heightMm * scale);
          context.clip();
          drawTiles(context, zone, zoneMaterial, x + zone.shape.xMm * scale, wallTop + zone.shape.yMm * scale, scale, 'wall', zone.shape.widthMm, zone.shape.heightMm);
          context.restore();
        }
        for (const opening of wall.openings) {
          context.fillStyle = '#F4F1F7';
          context.strokeStyle = '#C4B0D6';
          context.lineWidth = 1;
          context.fillRect(x + opening.xMm * scale, wallTop + opening.yMm * scale, opening.widthMm * scale, opening.heightMm * scale);
          context.strokeRect(x + opening.xMm * scale, wallTop + opening.yMm * scale, opening.widthMm * scale, opening.heightMm * scale);
        }
        context.restore();
        context.strokeStyle = '#8F6BB8';
        context.lineWidth = 2;
        context.strokeRect(x, wallTop, wallWidth, wallHeight);
        context.fillStyle = '#6B6B80';
        context.font = '500 11px Arial, sans-serif';
        context.textAlign = 'center';
        context.fillText(wall.name, x + wallWidth / 2, wallTop - 4);
        drawTinyTag(context, `${Math.round(wall.widthMm)} мм`, x + wallWidth / 2, wallTop + wallHeight + 12);
        context.textAlign = 'start';
        x += wallWidth + gap;
      }
      rowY += 18 + wallHeight + labelSpace;
    }
  });

  return frame.y + frame.h;
}

function drawTiles(
  context: CanvasRenderingContext2D,
  zone: FinishZone,
  material: TileMaterial,
  originX: number,
  originY: number,
  scale: number,
  variant: 'floor' | 'wall',
  widthMm: number,
  heightMm: number,
) {
  const result = generateRectLayout({
    heightMm,
    layout: zone.layout,
    tileHeightMm: material.heightMm,
    tileWidthMm: material.widthMm,
    widthMm,
  });
  for (const kind of ['full', 'cut', 'critical'] as const) {
    context.fillStyle = variant === 'floor' ? floorPieceFill(kind, material.swatch.value) : wallPieceFill(kind, material.swatch.value);
    context.strokeStyle = pieceStroke(kind);
    context.lineWidth = 0.8;
    for (const piece of result.pieces) {
      if (piece.kind !== kind) continue;
      drawPiece(context, piece, originX, originY, scale);
    }
  }
}

function drawPiece(context: CanvasRenderingContext2D, piece: LayoutTilePiece, originX: number, originY: number, scale: number) {
  context.beginPath();
  if (piece.polygon?.length) {
    context.moveTo(originX + piece.polygon[0].x * scale, originY + piece.polygon[0].y * scale);
    for (const point of piece.polygon.slice(1)) context.lineTo(originX + point.x * scale, originY + point.y * scale);
    context.closePath();
  } else {
    context.rect(originX + piece.xMm * scale, originY + piece.yMm * scale, Math.max(0.8, piece.widthMm * scale), Math.max(0.8, piece.heightMm * scale));
  }
  context.fill();
  context.stroke();
}

function drawObjectFootprint(
  context: CanvasRenderingContext2D,
  object: TileProject['objects'][number],
  toPage: (point: PointMm) => PointMm,
  fill: string,
) {
  const rotation = ((object.rotationDeg ?? 0) * Math.PI) / 180;
  const cx = object.xMm + object.lengthMm / 2;
  const cy = object.yMm + object.widthMm / 2;
  const corners = [
    { x: -object.lengthMm / 2, y: -object.widthMm / 2 },
    { x: object.lengthMm / 2, y: -object.widthMm / 2 },
    { x: object.lengthMm / 2, y: object.widthMm / 2 },
    { x: -object.lengthMm / 2, y: object.widthMm / 2 },
  ].map((point) => toPage({
    x: cx + point.x * Math.cos(rotation) - point.y * Math.sin(rotation),
    y: cy + point.x * Math.sin(rotation) + point.y * Math.cos(rotation),
  }));
  context.fillStyle = fill;
  context.strokeStyle = 'rgba(111, 79, 147, 0.45)';
  context.lineWidth = 1;
  tracePolygon(context, corners);
  context.fill();
  context.stroke();
}

function beginSchemeFrame(context: CanvasRenderingContext2D, frame: { x: number; y: number; w: number; h: number }, title: string) {
  context.fillStyle = '#F7F5FA';
  roundRect(context, frame.x, frame.y, frame.w, frame.h, 18);
  context.fill();
  context.strokeStyle = '#E8DFF3';
  context.lineWidth = 2;
  context.stroke();
  context.fillStyle = '#5B3F7A';
  context.font = '600 16px Arial, sans-serif';
  context.fillText(title, frame.x + 20, frame.y + 24);
}

function clipSchemeFrame(context: CanvasRenderingContext2D, frame: { x: number; y: number; w: number; h: number }, draw: () => void) {
  context.save();
  roundRect(context, frame.x, frame.y, frame.w, frame.h, 18);
  context.clip();
  draw();
  context.restore();
}

function drawSchemeGrid(
  context: CanvasRenderingContext2D,
  frame: { x: number; y: number; w: number; h: number },
  originX: number,
  originY: number,
  scale: number,
) {
  const step = MINOR_GRID_MM * scale;
  if (step < 6) return;
  const majorEvery = MAJOR_GRID_MM / MINOR_GRID_MM;
  const startX = originX - Math.ceil((originX - frame.x) / step) * step;
  const startY = originY - Math.ceil((originY - frame.y) / step) * step;
  for (const major of [false, true]) {
    context.strokeStyle = major ? 'rgba(168, 168, 184, 0.42)' : 'rgba(196, 196, 209, 0.28)';
    context.lineWidth = major ? 1.1 : 0.8;
    context.beginPath();
    let index = Math.round((startX - originX) / step);
    for (let x = startX; x <= frame.x + frame.w + 1; x += step, index += 1) {
      if ((index % majorEvery === 0) !== major) continue;
      context.moveTo(Math.round(x) + 0.5, frame.y);
      context.lineTo(Math.round(x) + 0.5, frame.y + frame.h);
    }
    index = Math.round((startY - originY) / step);
    for (let y = startY; y <= frame.y + frame.h + 1; y += step, index += 1) {
      if ((index % majorEvery === 0) !== major) continue;
      context.moveTo(frame.x, Math.round(y) + 0.5);
      context.lineTo(frame.x + frame.w, Math.round(y) + 0.5);
    }
    context.stroke();
  }
}

function drawDimensionTag(
  context: CanvasRenderingContext2D,
  text: string,
  start: PointMm,
  end: PointMm,
  center: PointMm,
) {
  const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  let nx = -dy / length;
  let ny = dx / length;
  if (nx * (center.x - mid.x) + ny * (center.y - mid.y) > 0) {
    nx = -nx;
    ny = -ny;
  }
  drawTinyTag(context, text, mid.x + nx * 11, mid.y + ny * 11);
}

function drawTinyTag(context: CanvasRenderingContext2D, text: string, x: number, y: number) {
  context.font = '500 10px Arial, sans-serif';
  const width = context.measureText(text).width + 10;
  const left = x - width / 2;
  const top = y - 7;
  context.fillStyle = 'rgba(255, 255, 255, 0.92)';
  roundRect(context, left, top, width, 14, 3);
  context.fill();
  context.strokeStyle = '#DCCEEC';
  context.lineWidth = 0.8;
  context.stroke();
  context.fillStyle = '#2E2A3A';
  context.textAlign = 'center';
  context.fillText(text, x, y + 3);
  context.textAlign = 'start';
}

function drawCalculation(context: CanvasRenderingContext2D, calculation: ProjectCalculation, top: number) {
  let y = top;
  context.fillStyle = '#2E2A3A';
  context.font = '700 26px Arial, sans-serif';
  context.fillText('Расчёт', PAGE_MARGIN, y + 8);
  y += 28;
  drawMetricStrip(context, PAGE_MARGIN, y, [
    [`${calculation.roomCount}`, 'помещений'],
    [`${calculation.floorCount}`, 'полов'],
    [`${calculation.wallCount}`, 'стен'],
    [`${calculation.totalAreaM2.toFixed(2)} м²`, 'плитки'],
  ]);
  y += 102;
  context.fillStyle = '#4A2F6A';
  context.font = '650 20px Arial, sans-serif';
  context.fillText('Использованная плитка', PAGE_MARGIN, y);
  y += 18;
  for (const item of calculation.materials) {
    if (y > CONTENT_BOTTOM - 120) break;
    y = drawMaterialRow(context, PAGE_MARGIN, y, item.material.swatch.value, item.material.name, `${item.areaM2.toFixed(2)} м²`);
  }
  y = Math.min(y + 16, CONTENT_BOTTOM - 108);
  context.fillStyle = '#F0E7F8';
  roundRect(context, PAGE_MARGIN, y, PAGE_WIDTH - PAGE_MARGIN * 2, 88, 16);
  context.fill();
  context.fillStyle = '#2E2A3A';
  context.font = '600 20px Arial, sans-serif';
  context.fillText('Итого', PAGE_MARGIN + 24, y + 36);
  context.fillStyle = '#4A2F6A';
  context.font = '700 28px Arial, sans-serif';
  context.fillText(`${calculation.totalAreaM2.toFixed(2)} м²`, PAGE_MARGIN + 24, y + 70);
}

function estimateCalculationHeight(calculation: ProjectCalculation) {
  return 28 + 102 + 18 + calculation.materials.length * 68 + 120;
}

function drawMetricStrip(context: CanvasRenderingContext2D, x: number, y: number, items: Array<[string, string]>) {
  const width = (PAGE_WIDTH - PAGE_MARGIN * 2 - 12 * (items.length - 1)) / items.length;
  items.forEach(([value, label], index) => {
    const left = x + index * (width + 12);
    context.fillStyle = '#F5F0FA';
    roundRect(context, left, y, width, 78, 14);
    context.fill();
    context.fillStyle = '#2E2A3A';
    context.font = '700 24px Arial, sans-serif';
    context.fillText(value, left + 16, y + 36);
    context.fillStyle = '#7A7690';
    context.font = '400 15px Arial, sans-serif';
    context.fillText(label, left + 16, y + 60);
  });
}

function drawMaterialRow(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  title: string,
  detail: string,
) {
  context.fillStyle = '#FFFFFF';
  roundRect(context, x, y, PAGE_WIDTH - PAGE_MARGIN * 2, 58, 12);
  context.fill();
  context.strokeStyle = '#E8DFF3';
  context.lineWidth = 1.5;
  context.stroke();
  context.fillStyle = color;
  roundRect(context, x + 14, y + 14, 30, 30, 8);
  context.fill();
  context.strokeStyle = 'rgba(82, 70, 94, 0.18)';
  context.stroke();
  context.fillStyle = '#2E2A3A';
  context.font = '650 18px Arial, sans-serif';
  context.fillText(title, x + 56, y + 26);
  context.fillStyle = '#6A6A80';
  context.font = '400 16px Arial, sans-serif';
  context.fillText(detail, x + 56, y + 48);
  return y + 68;
}

function zoneContourPoints(zone: FinishZone, areaBox: ReturnType<typeof getBoundingBox>): PointMm[] {
  if (zone.shape.type === 'polygon') return zone.shape.points;
  return [
    { x: areaBox.minX + zone.shape.xMm, y: areaBox.minY + zone.shape.yMm },
    { x: areaBox.minX + zone.shape.xMm + zone.shape.widthMm, y: areaBox.minY + zone.shape.yMm },
    { x: areaBox.minX + zone.shape.xMm + zone.shape.widthMm, y: areaBox.minY + zone.shape.yMm + zone.shape.heightMm },
    { x: areaBox.minX + zone.shape.xMm, y: areaBox.minY + zone.shape.yMm + zone.shape.heightMm },
  ];
}

function getAreas(project: TileProject): RoomArea[] {
  return project.room.areas ?? [{ id: 'room-1', name: 'Помещение 1', contour: project.room.contour, heightMm: project.room.heightMm }];
}

function floorSurfaceId(area: RoomArea, areaIndex: number) {
  return areaIndex === 0 ? 'surface-floor' : `surface-floor-${area.id}`;
}

function hasSelectedFloors(project: TileProject, selectedIds: Set<string>) {
  return getAreas(project).some((area, index) => selectedIds.has(floorSurfaceId(area, index)));
}

function hasSelectedWalls(project: TileProject, selectedIds: Set<string>) {
  return project.surfaces.some((surface) => surface.type === 'wall' && selectedIds.has(surface.id));
}

function tracePolygon(context: CanvasRenderingContext2D, points: PointMm[]) {
  context.beginPath();
  points.forEach((point, index) => (index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y)));
  context.closePath();
}

function floorPieceFill(kind: LayoutTilePiece['kind'], color: string) {
  if (kind === 'critical') return mixHex(color, '#6F4F93', 0.32);
  if (kind === 'cut') return mixHex(color, '#FFFFFF', 0.3);
  return color;
}

function wallPieceFill(kind: LayoutTilePiece['kind'], color: string) {
  if (kind === 'critical') return mixHex(color, '#6F4F93', 0.34);
  if (kind === 'cut') return mixHex(color, '#A385C4', 0.2);
  return color;
}

function pieceStroke(kind: LayoutTilePiece['kind']) {
  if (kind === 'critical') return '#6F4F93';
  if (kind === 'cut') return '#A385C4';
  return '#B9A2CF';
}

function mixHex(first: string, second: string, ratio: number) {
  const parse = (value: string) => (/^#[0-9a-f]{6}$/i.test(value) ? [1, 3, 5].map((index) => Number.parseInt(value.slice(index, index + 2), 16)) : [242, 235, 249]);
  const left = parse(first);
  const right = parse(second);
  return `#${left.map((value, index) => Math.round(value * (1 - ratio) + right[index] * ratio).toString(16).padStart(2, '0')).join('')}`;
}

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function buildImagePdf(dataUrls: string[]) {
  const encoder = new TextEncoder();
  const jpegPages = dataUrls.map(dataUrlToBytes);
  const pageIds = jpegPages.map((_, index) => 3 + index * 3);
  const objects: Array<{ id: number; chunks: Uint8Array[] }> = [
    { id: 1, chunks: [encoder.encode('<< /Type /Catalog /Pages 2 0 R >>')] },
    { id: 2, chunks: [encoder.encode(`<< /Type /Pages /Count ${jpegPages.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] >>`)] },
  ];
  jpegPages.forEach((jpeg, index) => {
    const pageId = pageIds[index];
    const contentId = pageId + 1;
    const imageId = pageId + 2;
    const content = encoder.encode(`q\n595 0 0 842 0 0 cm\n/Im${index} Do\nQ`);
    objects.push(
      { id: pageId, chunks: [encoder.encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im${index} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`)] },
      { id: contentId, chunks: [encoder.encode(`<< /Length ${content.length} >>\nstream\n`), content, encoder.encode('\nendstream')] },
      { id: imageId, chunks: [encoder.encode(`<< /Type /XObject /Subtype /Image /Width ${PAGE_WIDTH} /Height ${PAGE_HEIGHT} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`), jpeg, encoder.encode('\nendstream')] },
    );
  });
  objects.sort((a, b) => a.id - b.id);
  const chunks: Uint8Array[] = [encoder.encode('%PDF-1.4\n')];
  const offsets = [0];
  let length = chunks[0].length;
  for (const object of objects) {
    offsets[object.id] = length;
    const header = encoder.encode(`${object.id} 0 obj\n`);
    const footer = encoder.encode('\nendobj\n');
    chunks.push(header, ...object.chunks, footer);
    length += header.length + object.chunks.reduce((sum, chunk) => sum + chunk.length, 0) + footer.length;
  }
  const xrefOffset = length;
  const maxId = objects.at(-1)?.id ?? 0;
  const xref = [`xref\n0 ${maxId + 1}\n`, '0000000000 65535 f \n'];
  for (let id = 1; id <= maxId; id += 1) xref.push(`${String(offsets[id] ?? 0).padStart(10, '0')} 00000 n \n`);
  xref.push(`trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  chunks.push(encoder.encode(xref.join('')));
  return new Blob(chunks as BlobPart[], { type: 'application/pdf' });
}

function dataUrlToBytes(dataUrl: string) {
  const binary = atob(dataUrl.split(',')[1]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}
