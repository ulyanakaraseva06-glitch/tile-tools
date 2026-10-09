import { generatePolygonLayout, generateRectLayout } from '../layout/layoutEngine';
import type { LayoutEdgeCuts } from '../layout/layoutEngine';
import { getBoundingBox } from '../project/geometry';
import { getRoomObjectWallProjection } from '../project/projectFactory';
import type { FinishZone, Surface, TileMaterial, TileProject } from '../types/project';

export interface ZoneCalculation {
  areaM2: number;
  boxes: number | null;
  criticalPieces: number;
  cutPieces: number;
  edgeCuts: LayoutEdgeCuts;
  edgeOffsets: LayoutEdgeCuts;
  fullPieces: number;
  materialId: string;
  minCutMm: number | null;
  /** How the number of whole tiles was obtained in the first optimisation release. */
  purchaseMethod: 'area' | 'rectangular-offcuts';
  purchasePieces: number;
  reservePieces: number;
  surfaceId: string;
  surfaceName: string;
  totalPieces: number;
  truncated: boolean;
  warnings: string[];
  zoneId: string;
  zoneName: string;
}

export interface MaterialCalculation {
  areaM2: number;
  boxes: number | null;
  material: TileMaterial;
  purchasePieces: number;
  reservePieces: number;
  totalPieces: number;
  zones: ZoneCalculation[];
}

export interface ProjectCalculation {
  criticalPieces: number;
  cutPieces: number;
  floorCount: number;
  fullPieces: number;
  materials: MaterialCalculation[];
  roomCount: number;
  totalBoxes: number | null;
  totalAreaM2: number;
  totalPurchasePieces: number;
  wallCount: number;
  warnings: string[];
  zones: ZoneCalculation[];
}

export function calculateProject(project: TileProject, options?: { surfaceIds?: Iterable<string> }): ProjectCalculation {
  const allowedIds = options?.surfaceIds ? new Set(options.surfaceIds) : null;
  const rawZones = project.surfaces.flatMap((surface) => {
    if (allowedIds && !allowedIds.has(surface.id)) return [];
    return surface.zones.flatMap((zone) => {
      const material = project.materials.find((item) => item.id === zone.materialId) ?? project.materials[0];
      if (!material) return [];
      const layout = calculateZoneLayout(project, zone, surface, material);
      const layoutPieceCount = layout.fullCount + layout.cutCount + layout.criticalCount;
      const purchase = calculatePurchasePlan(layout, material, zone);
      return {
        areaM2: roundM2(layout.usedAreaMm2 / 1_000_000),
        boxes: calculateBoxes(material, purchase.purchasePieces, layout.usedAreaMm2),
        criticalPieces: layout.criticalCount,
        cutPieces: layout.cutCount,
        edgeCuts: layout.edgeCuts,
        edgeOffsets: layout.edgeOffsets,
        fullPieces: layout.fullCount,
        materialId: material.id,
        minCutMm: layout.minCutMm,
        purchaseMethod: purchase.method,
        purchasePieces: purchase.purchasePieces,
        reservePieces: purchase.reservePieces,
        surfaceId: surface.id,
        surfaceName: surface.name,
        totalPieces: layoutPieceCount,
        truncated: layout.truncated,
        warnings: [...getZoneWarnings(layout.truncated, zone), ...purchase.warnings],
        zoneId: zone.id,
        zoneName: zone.name,
      };
    });
  });
  const zones = rawZones.map((zone) => {
    const surface = project.surfaces.find((item) => item.id === zone.surfaceId);
    if (!surface || surface.zones[0]?.id !== zone.zoneId) return zone;
    const replacementAreaM2 = sum(rawZones.filter((candidate) => candidate.surfaceId === zone.surfaceId && candidate.zoneId !== zone.zoneId).map((candidate) => candidate.areaM2));
    if (!replacementAreaM2 || !zone.areaM2) return zone;
    const areaM2 = roundM2(Math.max(0, zone.areaM2 - replacementAreaM2));
    const ratio = Math.max(0, Math.min(1, areaM2 / zone.areaM2));
    const fullPieces = Math.round(zone.fullPieces * ratio);
    const cutPieces = Math.round(zone.cutPieces * ratio);
    const criticalPieces = Math.round(zone.criticalPieces * ratio);
    const totalPieces = fullPieces + cutPieces + criticalPieces;
    const material = project.materials.find((item) => item.id === zone.materialId);
    const cleanPieces = Math.max(0, Math.ceil((zone.purchasePieces - zone.reservePieces) * ratio));
    const reservePieces = material ? calculateReservePieces(cleanPieces, material.reservePercent, zone.purchaseMethod === 'area' ? 8 : 0) : Math.max(0, Math.ceil(zone.reservePieces * ratio));
    const purchasePieces = cleanPieces + reservePieces;
    return {
      ...zone,
      areaM2,
      boxes: material ? calculateBoxes(material, purchasePieces, areaM2 * 1_000_000) : zone.boxes,
      criticalPieces,
      cutPieces,
      fullPieces,
      purchasePieces,
      reservePieces,
      totalPieces,
    };
  });

  const materials = project.materials.flatMap((material) => {
    const materialZones = zones.filter((zone) => zone.materialId === material.id);
    if (!materialZones.length) return [];
    const areaM2 = roundM2(sum(materialZones.map((zone) => zone.areaM2)));
    const purchasePieces = sum(materialZones.map((zone) => zone.purchasePieces));
    return {
      areaM2,
      boxes: calculateMaterialBoxes(material, purchasePieces, areaM2),
      material,
      purchasePieces,
      reservePieces: sum(materialZones.map((zone) => zone.reservePieces)),
      totalPieces: sum(materialZones.map((zone) => zone.totalPieces)),
      zones: materialZones,
    };
  });

  const countedSurfaces = allowedIds
    ? project.surfaces.filter((surface) => allowedIds.has(surface.id))
    : project.surfaces;
  const roomIds = new Set(
    countedSurfaces
      .map((surface) => surface.sourceRef?.split(':')[1])
      .filter((id): id is string => Boolean(id)),
  );

  return {
    criticalPieces: sum(zones.map((zone) => zone.criticalPieces)),
    cutPieces: sum(zones.map((zone) => zone.cutPieces)),
    floorCount: countedSurfaces.filter((surface) => surface.type === 'floor').length,
    fullPieces: sum(zones.map((zone) => zone.fullPieces)),
    materials,
    roomCount: roomIds.size || (countedSurfaces.some((surface) => surface.type === 'floor') ? 1 : 0),
    totalBoxes: sumNullable(materials.map((material) => material.boxes)),
    totalAreaM2: roundM2(sum(zones.map((zone) => zone.areaM2))),
    totalPurchasePieces: sum(materials.map((material) => material.purchasePieces)),
    wallCount: countedSurfaces.filter((surface) => surface.type === 'wall').length,
    warnings: zones.flatMap((zone) => zone.warnings),
    zones,
  };
}

const CUT_KERF_MM = 3;

type PurchasePlan = {
  method: 'area' | 'rectangular-offcuts';
  purchasePieces: number;
  reservePieces: number;
  warnings: string[];
};

/**
 * First release: only axis-aligned rectangular pieces are reused.  Every cut
 * consumes a 3 mm saw kerf, so the result deliberately never understates the
 * purchase quantity.  Complex patterns remain an area calculation by design.
 */
function calculatePurchasePlan(
  layout: ReturnType<typeof calculateZoneLayout>,
  material: TileMaterial,
  zone: FinishZone,
): PurchasePlan {
  const complexReserve = getComplexPatternReserve(zone);
  const useRectangularOffcuts = complexReserve === null;
  const cleanPieces = useRectangularOffcuts
    ? packRectangularOffcuts(layout.pieces, material.widthMm, material.heightMm)
    : tilesNeededFromArea(layout.usedAreaMm2, material.widthMm, material.heightMm);
  const reservePieces = calculateReservePieces(cleanPieces, material.reservePercent, complexReserve ?? 0);
  const warnings = complexReserve === null
    ? []
    : [`${zone.name}: ${zone.layout.pattern === 'herringbone' ? 'ёлочка' : 'диагональная укладка'} посчитана по площади с запасом ${Math.max(material.reservePercent, complexReserve)}%. Повторное использование обрезков для этой схемы не учитывается.`];

  return {
    method: useRectangularOffcuts ? 'rectangular-offcuts' : 'area',
    purchasePieces: cleanPieces + reservePieces,
    reservePieces,
    warnings,
  };
}

function getComplexPatternReserve(zone: FinishZone): number | null {
  if (zone.layout.pattern === 'herringbone') return 13;
  if (zone.layout.pattern === 'diagonal' || Math.abs(zone.layout.turnDeg ?? 0) > 0 || zone.layout.angleDeg === 45) return 8;
  return null;
}

function calculateReservePieces(cleanPieces: number, configuredPercent: number, minimumPercent: number) {
  if (configuredPercent <= 0 || cleanPieces <= 0) return 0;
  return Math.ceil(cleanPieces * Math.max(configuredPercent, minimumPercent) / 100);
}

function packRectangularOffcuts(
  pieces: Array<{ kind: string; widthMm: number; heightMm: number }>,
  tileWidthMm: number,
  tileHeightMm: number,
) {
  const fullPieces = pieces.filter((piece) => piece.kind === 'full').length;
  const cuts = pieces
    .filter((piece) => piece.kind !== 'full')
    .map((piece) => ({ widthMm: Math.min(tileWidthMm, piece.widthMm + CUT_KERF_MM), heightMm: Math.min(tileHeightMm, piece.heightMm + CUT_KERF_MM) }))
    .sort((a, b) => b.widthMm * b.heightMm - a.widthMm * a.heightMm);
  const bins: Array<Array<{ widthMm: number; heightMm: number }>> = [];

  for (const cut of cuts) {
    let target: { bin: number; rect: number; waste: number } | null = null;
    bins.forEach((freeRects, bin) => freeRects.forEach((free, rect) => {
      if (cut.widthMm > free.widthMm || cut.heightMm > free.heightMm) return;
      const waste = free.widthMm * free.heightMm - cut.widthMm * cut.heightMm;
      if (!target || waste < target.waste) target = { bin, rect, waste };
    }));
    if (!target) {
      bins.push([{ widthMm: tileWidthMm, heightMm: tileHeightMm }]);
      target = { bin: bins.length - 1, rect: 0, waste: tileWidthMm * tileHeightMm - cut.widthMm * cut.heightMm };
    }
    const freeRects = bins[target.bin];
    const [free] = freeRects.splice(target.rect, 1);
    const right = { widthMm: free.widthMm - cut.widthMm, heightMm: cut.heightMm };
    const bottom = { widthMm: free.widthMm, heightMm: free.heightMm - cut.heightMm };
    if (right.widthMm > 0 && right.heightMm > 0) freeRects.push(right);
    if (bottom.widthMm > 0 && bottom.heightMm > 0) freeRects.push(bottom);
  }
  return fullPieces + bins.length;
}

/** Area fallback for diagonal and herringbone layouts. */
export function tilesNeededFromArea(usedAreaMm2: number, tileWidthMm: number, tileHeightMm: number) {
  const tileAreaMm2 = Math.max(1, tileWidthMm * tileHeightMm);
  if (usedAreaMm2 <= 0) return 0;
  return Math.ceil(usedAreaMm2 / tileAreaMm2);
}

function calculateZoneLayout(project: TileProject, zone: FinishZone, surface: Surface, material: TileMaterial) {
  const blockedRects = getBlockedRectsForZone(project, zone, surface);
  const result =
    zone.shape.type === 'polygon'
      ? generatePolygonLayout({
          blockedRects,
          layout: zone.layout,
          points: zone.shape.points,
          tileHeightMm: material.heightMm,
          tileWidthMm: material.widthMm,
        })
      : generateRectLayout({
          blockedRects,
          heightMm: zone.shape.heightMm || surface.heightMm,
          layout: zone.layout,
          tileHeightMm: material.heightMm,
          tileWidthMm: material.widthMm,
          widthMm: zone.shape.widthMm || surface.widthMm,
        });

  return {
    ...result,
    usedAreaMm2: result.pieces.reduce((total, piece) => total + (piece.areaMm2 ?? piece.widthMm * piece.heightMm), 0),
  };
}

function getBlockedRectsForZone(project: TileProject, zone: FinishZone, surface: Surface) {
  const blockedRects: Array<{ type: 'rect'; xMm: number; yMm: number; widthMm: number; heightMm: number }> = [];

  if (surface.type === 'wall') {
    const shape = zone.shape.type === 'rect' ? zone.shape : null;
    blockedRects.push(...surface.openings.map((opening) => ({
      type: 'rect' as const,
      xMm: opening.xMm - (shape?.xMm ?? 0),
      yMm: opening.yMm - (shape?.yMm ?? 0),
      widthMm: opening.widthMm,
      heightMm: opening.heightMm,
    })));
    for (const object of project.objects) {
      if (!object.excludeWallTile) continue;
      const projection = getRoomObjectWallProjection(project, surface.id, object);
      if (!projection) continue;
      blockedRects.push({
        type: 'rect',
        xMm: projection.offsetMm - (shape?.xMm ?? 0),
        yMm: surface.heightMm - object.elevationMm - object.heightMm - (shape?.yMm ?? 0),
        widthMm: projection.widthMm,
        heightMm: object.heightMm,
      });
    }
  }

  if (surface.type === 'floor') {
    const areaId = surface.sourceRef?.split(':')[1];
    const area = project.room.areas?.find((item) => item.id === areaId);
    if (!area) return blockedRects;
    const areaBox = getBoundingBox(area.contour);
    const zoneOrigin = zone.shape.type === 'polygon'
      ? getBoundingBox(zone.shape.points)
      : { minX: areaBox.minX + zone.shape.xMm, minY: areaBox.minY + zone.shape.yMm };
    for (const object of project.objects) {
      if (!object.excludeFloorTile || object.areaId !== area.id) continue;
      blockedRects.push({
        type: 'rect',
        xMm: object.xMm - zoneOrigin.minX,
        yMm: object.yMm - zoneOrigin.minY,
        widthMm: object.lengthMm,
        heightMm: object.widthMm,
      });
    }
  }

  return blockedRects;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function roundM2(value: number): number {
  return Math.round(value * 100) / 100;
}

function calculateBoxes(material: TileMaterial, purchasePieces: number, usedAreaMm2: number): number | null {
  if (material.piecesPerBox && material.piecesPerBox > 0) return Math.ceil(purchasePieces / material.piecesPerBox);
  if (material.boxAreaM2 && material.boxAreaM2 > 0) return Math.ceil(usedAreaMm2 / 1_000_000 / material.boxAreaM2);
  return null;
}

function calculateMaterialBoxes(material: TileMaterial, purchasePieces: number, areaM2: number): number | null {
  if (material.piecesPerBox && material.piecesPerBox > 0) return Math.ceil(purchasePieces / material.piecesPerBox);
  if (material.boxAreaM2 && material.boxAreaM2 > 0) return Math.ceil(areaM2 / material.boxAreaM2);
  return null;
}

function sumNullable(values: Array<number | null>): number | null {
  const present = values.filter((value): value is number => value !== null);
  return present.length ? sum(present) : null;
}

function getZoneWarnings(truncated: boolean, zone: FinishZone): string[] {
  const warnings: string[] = [];
  if (truncated) warnings.push(`${zone.name}: сетка обрезана для скорости отображения.`);
  return warnings;
}
