import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Calculator,
  FolderOpen,
  Grid3X3,
  HelpCircle,
  Info,
  Maximize2,
  Minus,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Trash2,
  Undo2,
} from 'lucide-react';
import { Circle, Group, Layer, Line, Rect, Shape, Stage, Text } from 'react-konva';
import type Konva from 'konva';
import { TileRotationControl } from './TileRotationControl';
import { useDraftHistory } from './useDraftHistory';
import { getVisibleTilePresets, templates } from '../config/appConfig';
import {
  addRoomFromContour,
  addManualZone,
  addSizedZone,
  addOpeningDetailed,
  addPartition,
  addRoomObject,
  createProjectFromTemplate,
  connectRoomOpenings,
  confirmRoomAreaDimensions,
  constrainOpeningPosition,
  constrainConnectedOpeningPosition,
  getRoomMagnetMove,
  deleteOpening,
  deletePartition,
  deleteRoomArea,
  deleteRoomObject,
  deleteZone,
  ensureProjectDefaults,
  getInitialProject,
  getOpeningConnectionCandidates,
  getNextRoomObjectName,
  getRoomObjectWallProjection,
  getSurfaceMaterial,
  getZoneMaterial,
  isPointOnContourBoundary,
  isPointStrictlyInsidePolygon,
  isRoomObjectPlacementValid,
  moveRoomAreaChecked,
  moveRoomAreaWall,
  previewRoomAreaWall,
  moveOpening,
  movePartition,
  moveRoomObject,
  moveRoomObjectOnWall,
  resizeOpening,
  resetOpening,
  renameRoomArea,
  resolveRoomObjectStacking,
  resolveWallObjectStacking,
  rotateRoomObject,
  getRoomObjectCorners,
  slideRoomObjectPosition,
  OBJECT_STACK_CONFLICT_HINT,
  updateRoomObject,
  updateRoomContour,
  updateRoomAreaHeight,
  updateRoomAreaSegmentLength,
  updateSurfaceCustomTileMaterial,
  updateSurfaceLayoutOffset,
  updateSurfaceLayoutOrigin,
  updateSurfaceTileMaterial,
  updateZoneCustomTileMaterial,
  updateZoneLayoutOffset,
  updateZoneLayoutOrigin,
  updateZoneLayoutPattern,
  updateZoneLayoutStagger,
  updateZoneLayoutGrout,
  updateZoneLayoutTurn,
  updateZoneName,
  updateZonePolygonPoints,
  updateZoneShape,
  updateZoneTileMaterial,
  updateZoneTileColor,
  type OpeningConnectionCandidate,
} from '../project/projectFactory';
import { generatePolygonLayout, generateRectLayout, type LayoutEdgeCuts, type LayoutTilePiece } from '../layout/layoutEngine';
import { calculateProject } from '../calculation/calculateProject';
import { exportProjectPdf } from '../export/projectPdf';
import { clearProject, loadProject, parseProjectFile, saveProject, serializeProjectFile } from '../project/storage';
import { getBoundingBox, isSegmentWithinContour, moveWall, segmentLength, segmentsIntersect, updateSegmentLength, validateContour } from '../project/geometry';
import { getFloorZoneDistanceBounds, getPolygonLineIntersections } from '../project/wallDistances';
import { getPartitionDistances, getPartitionPositionForDistance } from '../project/partitionMeasurements';
import { updateZoneSegmentLength } from '../project/zoneGeometry';
import { arrangeMeasurementLabels, type LabelRequest } from '../canvas/measurementLabels';
import {
  buildClosedContour,
  buildClosedOrthogonalContour,
  constrainFreePoint,
  constrainOrthogonalPoint,
  constrainOrthogonalResizePoint,
  isExplicitlyClosedContour,
  pointerToDraftPoint,
  validateDraftPoint,
} from '../canvas/drawing';
import { calculateWallsStartY, FLOOR_TITLE_GAP_PX, PLAN_BLOCK_TOP_PX, PLAN_OFFSET_Y, WALLS_BASE_Y } from '../canvas/layout';
import { canvasToMm, gridPxForMm, MINOR_GRID_MM, MM_PER_MAJOR_GRID, mmToCanvas, PX_PER_MM } from '../canvas/scale';
import { changeCanvasZoom, constrainFreeViewport, panViewport, resetViewport, type CanvasViewport } from '../canvas/viewport';
import { frameRoomEditor, frameSavedRoom } from '../canvas/roomEditorViewport';
import type { FinishZone, LayoutPattern, LayoutStagger, Opening, Partition, PointMm, RoomArea, RoomObject, RoomTemplate, TileMaterial, TileProject, TileSizePreset } from '../types/project';

function useAnimationFrameCallback<T>(callback: (value: T) => void): readonly [(value: T) => void, (value: T) => void] {
  const callbackRef = useRef(callback);
  const frameRef = useRef<number | null>(null);
  const pendingRef = useRef<T | null>(null);
  callbackRef.current = callback;
  const schedule = (value: T) => {
    pendingRef.current = value;
    if (frameRef.current !== null) return;
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      if (pendingRef.current !== null) callbackRef.current(pendingRef.current);
      pendingRef.current = null;
    });
  };
  const flush = (value: T) => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    pendingRef.current = null;
    callbackRef.current(value);
  };
  useEffect(() => () => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
  }, []);
  return [schedule, flush] as const;
}

type EditTarget =
  | { type: 'draft-segment'; index: number }
  | { type: 'zone-draft-segment'; index: number; position: PointMm; value: number }
  | { type: 'floor-segment'; areaId: string; index: number }
  | { type: 'wall-segment'; areaId: string; index: number; surfaceId: string }
  | { type: 'wall-height'; areaId: string }
  | { type: 'partition-length'; partitionId: string }
  | { type: 'partition-distance'; partitionId: string; edge: ObjectDistanceEdge; labelPosition?: PointMm }
  | { type: 'opening-distance'; openingId: string; edge: 'start' | 'end'; position: PointMm; value: number; max: number }
  | { type: 'layout-offset'; edge: keyof LayoutEdgeCuts; surfaceId: string; zoneId: string }
  | { type: 'object-distance'; edge: ObjectDistanceEdge; objectId: string; labelPosition?: PointMm }
  | null;

type CanvasLayers = {
  grid: boolean;
  floor: boolean;
  walls: boolean;
  dimensions: boolean;
};

type DrawingMode = 'idle' | 'custom-room' | 'custom-room-review';
type CustomDrawingMode = 'orthogonal' | 'free';
type ZoneDraftSnapshot = { points: PointMm[]; review: boolean };
type ZoneDraftEditor = {
  review: boolean;
  armed: boolean;
  canUndo: boolean;
  onChangePoints: (points: PointMm[]) => boolean;
  onChangeSegment: (index: number, value: number) => boolean;
  onBack: () => void;
};
type PanelTab = 'tile' | 'room' | 'objects' | 'zones';
type TilePanelSection = 'grout' | 'laying' | 'offset' | 'origin';
type CustomDrawingTarget = 'primary' | 'additional';
type MeasurementMode = 'room' | 'tile' | 'objects';
type ObjectDistanceEdge = 'left' | 'right' | 'top' | 'bottom';
type ObjectDragVisual = { id: string; areaId?: string; rotationDeg?: number; xMm: number; yMm: number };
type PartitionDragVisual = { id: string; start: PointMm; end: PointMm };

const ROOM_OBJECT_FILL = '#8A6AAE';
const ROOM_OBJECT_STROKE = '#6F4F93';
const ROOM_OBJECT_OPACITY = 1;

type ConfirmAction =
  | { type: 'reset' }
  | { type: 'template'; templateId: string }
  | { type: 'delete-opening'; id: string }
  | { type: 'delete-partition'; id: string }
  | { type: 'delete-room-area'; areaId: string }
  | { type: 'delete-object'; id: string }
  | { type: 'delete-zone'; surfaceId: string; zoneId: string }
  | null;

type InlineEdit = {
  left: number;
  max: number;
  min: number;
  target: Exclude<EditTarget, null>;
  top: number;
  value: number;
};

const tilePresets = getVisibleTilePresets();
const initialCanvasSize = { width: 1120, height: 760 };
const PLAN_OFFSET_X = 170;
const TILE_PALETTE_STORAGE_KEY = 'vilray-tile-color-palette-v1';
const CALCULATION_HINT_STORAGE_KEY = 'vilray-calculation-select-hint-seen';

type TilePaletteEntry = { color: string; id: string; name: string };

const defaultTilePalette: TilePaletteEntry[] = [
  { id: 'pastel-orange', color: '#F8D5C2', name: 'Оранжевый' },
  { id: 'pastel-yellow', color: '#F5EDC9', name: 'Жёлтый' },
  { id: 'pastel-green', color: '#DDEBD4', name: 'Зелёный' },
  { id: 'pastel-blue', color: '#D0E8F2', name: 'Голубой' },
  { id: 'pastel-pink', color: '#F2D7D9', name: 'Розовый' },
];

const defaultExtendedTileColors = [
  '#F3CED8',
  '#F5D8C4',
  '#D9EBCF',
  '#CDE9DE',
  '#CEE8EE',
  '#CFDDF2',
  '#D8D2F1',
  '#E8D2EE',
  '#F1D4E2',
  '#E4DDD5',
];

function normalizeHexColor(color: string) {
  return color.trim().toUpperCase();
}

function getUsedTileColors(project: TileProject) {
  const materialsById = new Map(project.materials.map((material) => [material.id, material]));
  const used = new Set<string>();
  for (const surface of project.surfaces) {
    for (const zone of surface.zones) {
      const material = zone.materialId ? materialsById.get(zone.materialId) : null;
      if (material?.swatch.type === 'color') used.add(normalizeHexColor(material.swatch.value));
    }
  }
  return used;
}

function loadStoredTilePalette(): { extended: string[]; palette: TilePaletteEntry[] } {
  try {
    const raw = localStorage.getItem(TILE_PALETTE_STORAGE_KEY);
    if (!raw) return { extended: [...defaultExtendedTileColors], palette: defaultTilePalette.map((item) => ({ ...item })) };
    const parsed = JSON.parse(raw) as { extended?: string[]; palette?: TilePaletteEntry[] };
    const palette = Array.isArray(parsed.palette)
      ? parsed.palette
        .filter((item) => item && typeof item.color === 'string')
        .map((item, index) => ({
          id: typeof item.id === 'string' ? item.id : `palette-${index}`,
          color: normalizeHexColor(item.color),
          name: typeof item.name === 'string' && item.name.trim() ? item.name.trim().slice(0, 60) : `Цвет ${index + 1}`,
        }))
      : defaultTilePalette.map((item) => ({ ...item }));
    const extended = Array.isArray(parsed.extended)
      ? parsed.extended.map(normalizeHexColor).filter((color) => /^#[0-9A-F]{6}$/.test(color))
      : [...defaultExtendedTileColors];
    return {
      extended: extended.length ? extended : [...defaultExtendedTileColors],
      palette: palette.length ? palette : defaultTilePalette.map((item) => ({ ...item })),
    };
  } catch {
    return { extended: [...defaultExtendedTileColors], palette: defaultTilePalette.map((item) => ({ ...item })) };
  }
}

function saveStoredTilePalette(palette: TilePaletteEntry[], extended: string[]) {
  try {
    localStorage.setItem(TILE_PALETTE_STORAGE_KEY, JSON.stringify({ extended, palette }));
  } catch {
    // Ignore quota / private-mode failures; in-memory palette still works.
  }
}

function suggestCustomColorName(color: string, usedNames: Set<string>) {
  const base = `Свой ${normalizeHexColor(color).slice(1, 4)}`;
  if (!usedNames.has(base)) return base;
  let index = 2;
  while (usedNames.has(`${base} ${index}`)) index += 1;
  return `${base} ${index}`;
}

function loadInitialAppState() {
  const savedProject = loadProject();
  return {
    hasRoomEdits: Boolean(savedProject),
    templatePickerOpen: !savedProject,
    project: savedProject ? ensureProjectDefaults(savedProject) : getInitialProject(),
  };
}

export function App() {
  const [initialAppState] = useState(loadInitialAppState);
  const [project, setProject] = useState<TileProject>(initialAppState.project);
  const [selectedTemplateId, setSelectedTemplateId] = useState(project.room.templateId ?? 'custom');
  const [selectedSurfaceId, setSelectedSurfaceId] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [zoneSelectionRevision, setZoneSelectionRevision] = useState(0);
  const [selectedWallIndex, setSelectedWallIndex] = useState<number | null>(null);
  const [selectedOpeningId, setSelectedOpeningId] = useState<string | null>(null);
  const [selectedPartitionId, setSelectedPartitionId] = useState<string | null>(null);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [activePanelTab, setActivePanelTab] = useState<PanelTab>('room');
  const [sidePanelCollapsed, setSidePanelCollapsed] = useState(false);
  const [layoutDragEnabled, setLayoutDragEnabled] = useState(false);
  const [layoutRotateEnabled, setLayoutRotateEnabled] = useState(false);
  const [calculationOpen, setCalculationOpen] = useState(false);
  const [calculationSelecting, setCalculationSelecting] = useState(false);
  const [calculationSurfaceIds, setCalculationSurfaceIds] = useState<Set<string>>(() => new Set());
  const [calculationHintVisible, setCalculationHintVisible] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EditTarget>(null);
  const [layers, setLayers] = useState<CanvasLayers>({ grid: true, floor: true, walls: true, dimensions: true });
  const [viewport, setViewport] = useState<CanvasViewport>(resetViewport());
  const [hasRoomEdits, setHasRoomEdits] = useState(initialAppState.hasRoomEdits);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('idle');
  const [customDrawingTarget, setCustomDrawingTarget] = useState<CustomDrawingTarget>('primary');
  const [customDrawingMode, setCustomDrawingMode] = useState<CustomDrawingMode>('orthogonal');
  const [drawingToolArmed, setDrawingToolArmed] = useState(true);
  const [draftContour, setDraftContour] = useState<PointMm[]>([]);
  const [draftWallStart, setDraftWallStart] = useState<PointMm | null>(null);
  const [drawingError, setDrawingError] = useState<string | null>(null);
  const [customTileDialogOpen, setCustomTileDialogOpen] = useState(false);
  const [customTileError, setCustomTileError] = useState<string | null>(null);
  const [openTileSection, setOpenTileSection] = useState<TilePanelSection | null>(null);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(initialAppState.templatePickerOpen);
  const [addRoomPickerOpen, setAddRoomPickerOpen] = useState(false);
  const [partitionDrawingActive, setPartitionDrawingActive] = useState(false);
  const [partitionDraftAreaId, setPartitionDraftAreaId] = useState<string | null>(null);
  const [partitionDraftStart, setPartitionDraftStart] = useState<PointMm | null>(null);
  const [connectionPrompt, setConnectionPrompt] = useState<{ candidates: OpeningConnectionCandidate[]; sourceOpeningId: string } | null>(null);
  const [roomActionMessage, setRoomActionMessage] = useState<string | null>(null);
  const [objectDialogError, setObjectDialogError] = useState<string | null>(null);
  const [editingObjectId, setEditingObjectId] = useState<string | null>(null);
  const [renameRoomAreaId, setRenameRoomAreaId] = useState<string | null>(null);
  const [openingDialogKind, setOpeningDialogKind] = useState<Opening['kind'] | null>(null);
  const [openingDialogSurfaceId, setOpeningDialogSurfaceId] = useState<string | null>(null);
  const [editingOpeningId, setEditingOpeningId] = useState<string | null>(null);
  const [manualZoneSurfaceId, setManualZoneSurfaceId] = useState<string | null>(null);
  const [manualZonePoints, setManualZonePoints] = useState<PointMm[]>([]);
  const [manualZoneDrawingMode, setManualZoneDrawingMode] = useState<CustomDrawingMode>('orthogonal');
  const [manualZoneReview, setManualZoneReview] = useState(false);
  const [manualZoneToolArmed, setManualZoneToolArmed] = useState(true);
  const [editingManualZoneId, setEditingManualZoneId] = useState<string | null>(null);
  const [roomDimensionsAreaId, setRoomDimensionsAreaId] = useState<string | null>(null);
  const [roomDimensionsError, setRoomDimensionsError] = useState<string | null>(null);
  const [additionalRoomDraft, setAdditionalRoomDraft] = useState<TileProject | null>(null);
  const additionalRoomHistory = useDraftHistory(additionalRoomDraft ? 'additional-room' : null, additionalRoomDraft);
  const beforeAdditionalRoomRef = useRef<{ layers: CanvasLayers; viewport: CanvasViewport; surfaceId: string | null; hasRoomEdits: boolean } | null>(null);
  const roomDraftActive = drawingMode === 'custom-room' || drawingMode === 'custom-room-review';
  const roomDraftSnapshot = useMemo(() => ({ contour: draftContour, wallStart: draftWallStart, mode: drawingMode }), [draftContour, draftWallStart, drawingMode]);
  const roomDraftHistory = useDraftHistory(roomDraftActive ? `room:${customDrawingTarget}` : null, roomDraftSnapshot);
  const zoneDraftSnapshot = useMemo(() => ({ points: manualZonePoints, review: manualZoneReview }), [manualZonePoints, manualZoneReview]);
  const zoneDraftHistory = useDraftHistory(manualZoneSurfaceId, zoneDraftSnapshot);
  const historyRef = useRef<{ applying: boolean; current: TileProject; future: TileProject[]; past: TileProject[] }>({ applying: false, current: initialAppState.project, future: [], past: [] });
  const projectFileInputRef = useRef<HTMLInputElement>(null);
  const [, setHistoryRevision] = useState(0);
  const contourStatus = validateContour(project.room.contour);
  const primaryMaterial = project.materials[0];
  const activeSurfaceId = selectedSurfaceId;
  const activeSurface = activeSurfaceId ? project.surfaces.find((surface) => surface.id === activeSurfaceId) : null;
  const activeZone = activeSurface?.zones.find((zone) => zone.id === selectedZoneId) ?? activeSurface?.zones[0] ?? null;
  const activeZoneId = activeZone?.id ?? null;
  const activeTileMaterial = activeSurfaceId && activeZoneId ? getZoneMaterial(project, activeSurfaceId, activeZoneId) : activeSurfaceId ? getSurfaceMaterial(project, activeSurfaceId) : primaryMaterial;
  // Material calculation traverses every tile piece. Keep it completely out of
  // interactive canvas updates and run it only when the user opens the report.
  const calculation = useMemo(
    () => calculationOpen ? calculateProject(project, { surfaceIds: calculationSurfaceIds }) : null,
    [calculationOpen, calculationSurfaceIds, project],
  );
  useEffect(() => {
    const history = historyRef.current;
    if (history.applying) {
      history.current = project;
      history.applying = false;
      setHistoryRevision((value) => value + 1);
      return;
    }
    if (history.current === project) return;
    history.past = [...history.past, history.current].slice(-10);
    history.future = [];
    history.current = project;
    setHistoryRevision((value) => value + 1);
  }, [project]);

  useEffect(() => {
    if (templatePickerOpen) return;
    const timeoutId = window.setTimeout(() => {
      saveProject(project);
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [project, templatePickerOpen]);

  useEffect(() => {
    if (!activeSurface || !selectedZoneId) return;
    if (!activeSurface.zones.some((zone) => zone.id === selectedZoneId)) setSelectedZoneId(null);
  }, [activeSurface, selectedZoneId]);

  useEffect(() => {
    if (selectedOpeningId && !project.room.openings?.some((opening) => opening.id === selectedOpeningId)) setSelectedOpeningId(null);
  }, [project.room.openings, selectedOpeningId]);

  useEffect(() => {
    if (selectedObjectId && !project.objects.some((object) => object.id === selectedObjectId)) setSelectedObjectId(null);
  }, [project.objects, selectedObjectId]);

  useEffect(() => {
    if (!roomActionMessage) return;
    const timeoutId = window.setTimeout(() => setRoomActionMessage(null), 5200);
    return () => window.clearTimeout(timeoutId);
  }, [roomActionMessage]);

  useEffect(() => {
    if (drawingMode === 'idle' || !calculationSelecting) return;
    setCalculationSelecting(false);
    setCalculationSurfaceIds(new Set());
    setCalculationOpen(false);
    setCalculationHintVisible(false);
  }, [drawingMode, calculationSelecting]);

  function undoProject() {
    if (additionalRoomDraft) {
      if (additionalRoomHistory.canUndo) setAdditionalRoomDraft(additionalRoomHistory.undo() ?? additionalRoomDraft);
      else exitAdditionalRoomEditor();
      setEditTarget(null);
      setRoomDimensionsError(null);
      return;
    }
    if (roomDraftActive) {
      if (roomDraftHistory.canUndo) restoreRoomDraft(roomDraftHistory.undo());
      else if (customDrawingTarget === 'additional') exitAdditionalRoomEditor();
      else cancelCustomDrawing();
      return;
    }
    if (manualZoneSurfaceId) { restoreZoneDraft(zoneDraftHistory.undo()); return; }
    const history = historyRef.current;
    const previous = history.past.at(-1);
    if (!previous) return;
    history.past = history.past.slice(0, -1);
    history.future = [history.current, ...history.future].slice(0, 10);
    history.applying = true;
    setProject(previous);
  }

  function redoProject() {
    if (additionalRoomDraft) {
      const next = additionalRoomHistory.redo();
      if (next) setAdditionalRoomDraft(next);
      setEditTarget(null);
      setRoomDimensionsError(null);
      return;
    }
    if (roomDraftActive) { restoreRoomDraft(roomDraftHistory.redo()); return; }
    if (manualZoneSurfaceId) { restoreZoneDraft(zoneDraftHistory.redo()); return; }
    const history = historyRef.current;
    const next = history.future[0];
    if (!next) return;
    history.future = history.future.slice(1);
    history.past = [...history.past, history.current].slice(-10);
    history.applying = true;
    setProject(next);
  }

  function resetInteractiveModes() {
    setManualZoneSurfaceId(null);
    setManualZonePoints([]);
    setManualZoneReview(false);
    setEditingManualZoneId(null);
    setEditTarget(null);
    setPartitionDrawingActive(false);
    setPartitionDraftAreaId(null);
    setPartitionDraftStart(null);
    setLayoutDragEnabled(false);
    setLayoutRotateEnabled(false);
    setDrawingMode('idle');
    setDraftContour([]);
    setDraftWallStart(null);
    setDrawingToolArmed(true);
    setDrawingError(null);
  }

  function switchPanelTab(tab: PanelTab) {
    resetInteractiveModes();
    setActivePanelTab(tab);
  }

  function applyTemplate(templateId: string) {
    resetInteractiveModes();
    if (templateId === selectedTemplateId) return;
    if (hasRoomEdits) {
      setConfirmAction({ type: 'template', templateId });
      return;
    }
    applyTemplateNow(templateId);
  }

  function applyTemplateNow(templateId: string) {
    setAdditionalRoomDraft(null);
    if (templateId === 'custom') {
      setTemplatePickerOpen(false);
      beginCustomDrawing('primary');
      return;
    }
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    setDrawingMode('idle');
    setDraftContour([]);
    setDraftWallStart(null);
    setDrawingToolArmed(true);
    setDrawingError(null);
    setCustomDrawingTarget('primary');
    setSelectedTemplateId(template.id);
    selectSurface('surface-floor');
    setEditTarget(null);
    setViewport(resetViewport());
    setHasRoomEdits(false);
    setTemplatePickerOpen(false);
    setActivePanelTab('room');
    const nextProject = createProjectFromTemplate(template, getPreferredTemplateSize(template), project, true, false);
    setProject(nextProject);
    setRoomDimensionsAreaId(nextProject.room.areas?.[0]?.id ?? 'room-1');
    setRoomDimensionsError(null);
    setLayers({ grid: true, floor: true, walls: false, dimensions: true });
  }

  function beginCustomDrawing(target: CustomDrawingTarget) {
    resetInteractiveModes();
    setAdditionalRoomDraft(null);
    setCustomDrawingTarget(target);
    if (target === 'primary') setSelectedTemplateId('custom');
    selectSurface(null);
    setEditTarget(null);
    setViewport(resetViewport());
    setLayers({ grid: true, floor: true, walls: false, dimensions: true });
    setDraftContour([]);
    setDraftWallStart(null);
    setCustomDrawingMode('orthogonal');
    setDrawingToolArmed(true);
    setDrawingError(null);
    setDrawingMode('custom-room');
    setHasRoomEdits(false);
  }

  function addDraftPoint(point: PointMm) {
    if (!drawingToolArmed) return;
    if (!draftWallStart) {
      const previousEnd = draftContour[draftContour.length - 1];
      if (previousEnd) {
        const workingPoints = draftContour;
        const nextPoint = customDrawingMode === 'orthogonal' ? constrainOrthogonalPoint(workingPoints, point) : constrainFreePoint(point, workingPoints);
        const error = validateDraftPoint(workingPoints, nextPoint);
        if (error) {
          setDrawingError(error);
          return;
        }
        setDraftContour((current) => [...current, nextPoint]);
        setDrawingError(null);
        setHasRoomEdits(true);
        return;
      }
      const snappedPoint = constrainFreePoint(point);
      setDraftWallStart(snappedPoint);
      setDrawingError(null);
      return;
    }
    const workingPoints = draftContour.length ? draftContour : [draftWallStart];
    const nextPoint = customDrawingMode === 'orthogonal' ? constrainOrthogonalPoint(workingPoints, point) : constrainFreePoint(point, workingPoints);
    const error = validateDraftPoint(workingPoints, nextPoint);
    if (error) {
      setDrawingError(error);
      return;
    }
    setDraftContour((current) => current.length ? [...current, nextPoint] : [draftWallStart, nextPoint]);
    setDraftWallStart(null);
    setDrawingError(null);
    setHasRoomEdits(true);
  }

  function changeCustomDrawingMode(mode: CustomDrawingMode) {
    if (drawingToolArmed && customDrawingMode === mode) {
      setDrawingToolArmed(false);
      setDraftWallStart(null);
      setDrawingError(null);
      return;
    }
    setCustomDrawingMode(mode);
    setDrawingToolArmed(true);
    setDrawingError(null);
  }

  function moveLastDraftPoint(point: PointMm) {
    if (draftWallStart || draftContour.length < 2) return null;
    const fixedPoints = draftContour.slice(0, -1);
    const wallStart = fixedPoints[fixedPoints.length - 1];
    const currentEnd = draftContour[draftContour.length - 1];
    const nextPoint = customDrawingMode === 'orthogonal'
      ? constrainOrthogonalResizePoint(wallStart, currentEnd, point)
      : constrainFreePoint(point);
    if (customDrawingMode === 'free' && (nextPoint.x === wallStart.x || nextPoint.y === wallStart.y)) {
      setDrawingError('Диагональная стена должна оставаться диагональной.');
      return null;
    }
    const error = validateDraftPoint(fixedPoints, nextPoint);
    if (error) {
      setDrawingError(error);
      return null;
    }
    setDraftContour((current) => [...current.slice(0, -1), nextPoint]);
    setDrawingError(null);
    return nextPoint;
  }

  function restoreRoomDraft(snapshot: typeof roomDraftSnapshot | undefined) {
    if (!snapshot) return;
    setDraftContour(snapshot.contour);
    setDraftWallStart(snapshot.wallStart);
    setDrawingMode(snapshot.mode);
    setDrawingToolArmed(true);
    setEditTarget(null);
    setDrawingError(null);
  }

  function undoDraftPoint() {
    restoreRoomDraft(roomDraftHistory.undo());
  }

  function cancelCustomDrawing() {
    setDraftContour([]);
    setDraftWallStart(null);
    setDrawingToolArmed(true);
    setDrawingError(null);
    setDrawingMode('idle');
    setCustomDrawingTarget('primary');
    setSelectedTemplateId(project.room.templateId ?? 'custom');
  }

  function completeCustomDrawing() {
    const hasDiagonalWall = draftContour.some((point, index) => {
      const next = draftContour[index + 1];
      return next ? point.x !== next.x && point.y !== next.y : false;
    });
    const contour = hasDiagonalWall ? buildClosedContour(draftContour) : buildClosedOrthogonalContour(draftContour);
    if (!contour) {
      setDrawingError('Контур нельзя замкнуть: проверьте длину последней стены и пересечения.');
      return;
    }
    const validation = validateContour(contour);
    if (!validation.ok) {
      setDrawingError(validation.message ?? 'Контур нельзя завершить.');
      return;
    }
    setDraftContour(contour);
    setDraftWallStart(null);
    setDrawingToolArmed(true);
    setDrawingError(null);
    setDrawingMode('custom-room-review');
  }

  function moveDraftReviewPoint(index: number, point: PointMm) {
    const nextContour = draftContour.map((current, pointIndex) => pointIndex === index ? { x: Math.round(point.x), y: Math.round(point.y) } : current);
    const validation = validateContour(nextContour);
    if (!validation.ok) {
      setDrawingError('Точки нельзя переместить так, чтобы стены пересекались или контур стал некорректным.');
      return false;
    }
    setDraftContour(nextContour);
    setDrawingError(null);
    return true;
  }

  function moveDraftReviewWall(index: number, deltaXmm: number, deltaYmm: number) {
    setDraftContour((currentContour) => {
      const point = currentContour[index];
      const next = currentContour[(index + 1) % currentContour.length];
      if (!point || !next) return currentContour;
      const nextContour = moveWall(currentContour, index, point.y === next.y ? deltaYmm : deltaXmm);
      if (!validateContour(nextContour).ok || nextContour === currentContour) return currentContour;
      return nextContour;
    });
    setDrawingError(null);
    return true;
  }

  function changeDraftReviewSegmentLength(index: number, value: number) {
    const current = draftContour[index];
    const next = draftContour[(index + 1) % draftContour.length];
    if (!current || !next) return false;
    const updated = updateSegmentLength(draftContour, index, value);
    if (updated === draftContour && Math.round(segmentLength(current, next)) !== value) {
      setDrawingError('Не удалось изменить размер: проверьте, чтобы стены не пересекались.');
      return false;
    }
    setDraftContour(updated);
    setDrawingError(null);
    return true;
  }

  function saveCustomDrawing() {
    const validation = validateContour(draftContour);
    if (!validation.ok) {
      setDrawingError(validation.message ?? 'Контур нельзя сохранить.');
      return;
    }
    if (customDrawingTarget === 'additional') {
      const nextAreaId = `room-${(project.room.areas?.length ?? 1) + 1}`;
      setProject((current) => addRoomFromContour(current, draftContour, true));
      selectSurface(`surface-floor-${nextAreaId}`);
      setActivePanelTab('room');
    } else {
      setProject((current) => updateRoomContour({ ...current, room: { ...current.room, templateId: null } }, draftContour, true, false));
      setSelectedTemplateId('custom');
      selectSurface('surface-floor');
      setRoomDimensionsAreaId(null);
      setRoomDimensionsError(null);
    }
    setDraftContour([]);
    setDraftWallStart(null);
    setDrawingError(null);
    setDrawingMode('idle');
    setCustomDrawingTarget('primary');
    setLayers({ grid: true, floor: true, walls: true, dimensions: true });
    setHasRoomEdits(true);
  }

  function changeHeight(areaId: string, value: string) {
    const nextHeight = Number(value);
    if (!Number.isFinite(nextHeight)) return;
    setHasRoomEdits(true);
    setProject((current) => updateRoomAreaHeight(current, areaId, nextHeight));
  }

  function changeSegmentLength(target: Extract<Exclude<EditTarget, null>, { type: 'floor-segment' | 'wall-segment' }>, value: string) {
    const length = Number(value);
    if (!Number.isFinite(length)) return;
    if (additionalRoomDraft) {
      setAdditionalRoomDraft((current) => current ? updateRoomAreaSegmentLength(current, target.areaId, target.index, length) : current);
      setEditTarget(null);
      return;
    }
    setHasRoomEdits(true);
    setProject((current) => updateRoomAreaSegmentLength(current, target.areaId, target.index, length));
    setEditTarget(null);
  }

  function selectTilePreset(tile: TileSizePreset) {
    setCustomTileDialogOpen(false);
    setCustomTileError(null);
    if (!activeSurfaceId) {
      setRoomActionMessage('Сначала выберите пол или стену нужного помещения.');
      setOpenTileSection(null);
      return;
    }
    setHasRoomEdits(true);
    setProject((current) => activeZoneId
      ? updateZoneTileMaterial(current, activeSurfaceId, activeZoneId, tile)
      : updateSurfaceTileMaterial(current, activeSurfaceId, tile));
    setOpenTileSection(null);
  }

  function submitCustomTile(widthCm: string, heightCm: string) {
    const widthCmNumber = Number(widthCm);
    const heightCmNumber = Number(heightCm);
    const widthMm = widthCmNumber * 10;
    const heightMm = heightCmNumber * 10;
    if (
      !Number.isInteger(widthCmNumber) ||
      !Number.isInteger(heightCmNumber) ||
      widthMm < 50 ||
      heightMm < 50 ||
      widthMm > 3200 ||
      heightMm > 3200
    ) {
      setCustomTileError('Введите ширину и высоту от 5 до 320 см.');
      return;
    }
    if (!activeSurfaceId) {
      setCustomTileDialogOpen(false);
      setCustomTileError(null);
      setRoomActionMessage('Сначала выберите пол или стену нужного помещения.');
      setOpenTileSection(null);
      return;
    }
    setHasRoomEdits(true);
    setProject((current) => activeZoneId
      ? updateZoneCustomTileMaterial(current, activeSurfaceId, activeZoneId, widthMm, heightMm)
      : updateSurfaceCustomTileMaterial(current, activeSurfaceId, widthMm, heightMm));
    setCustomTileDialogOpen(false);
    setCustomTileError(null);
    setOpenTileSection(null);
  }

  function dragWall(areaId: string, index: number, deltaMm: number) {
    if (additionalRoomDraft) {
      setAdditionalRoomDraft((current) => current ? moveRoomAreaWall(current, areaId, index, deltaMm) : current);
      return;
    }
    setHasRoomEdits(true);
    setProject((current) => moveRoomAreaWall(current, areaId, index, deltaMm));
  }

  function selectSurface(surfaceId: string | null) {
    setSelectedSurfaceId(surfaceId);
    setSelectedZoneId(null);
    setSelectedOpeningId(null);
    setSelectedPartitionId(null);
    setSelectedObjectId(null);
    const wallIndex = surfaceId ? project.surfaces.filter((surface) => surface.type === 'wall').findIndex((surface) => surface.id === surfaceId) : -1;
    setSelectedWallIndex(wallIndex >= 0 ? wallIndex : null);
  }

  function selectRoomObject(objectId: string | null) {
    setSelectedObjectId(objectId);
    setSelectedOpeningId(null);
    setSelectedPartitionId(null);
    setSelectedZoneId(null);
    setSelectedWallIndex(null);
    setSelectedSurfaceId(null);
  }

  function selectZone(surfaceId: string, zoneId: string | null) {
    setSelectedSurfaceId(surfaceId);
    setSelectedZoneId(zoneId);
    if (zoneId) setZoneSelectionRevision((current) => current + 1);
    setSelectedOpeningId(null);
    setSelectedObjectId(null);
    setSelectedPartitionId(null);
    setSelectedWallIndex(null);
  }

  function selectWall(index: number | null) {
    const walls = project.surfaces.filter((surface) => surface.type === 'wall');
    selectSurface(index === null ? null : walls[index]?.id ?? null);
  }

  function selectOpening(surfaceId: string, openingId: string) {
    setSelectedSurfaceId(surfaceId);
    setSelectedZoneId(null);
    setSelectedOpeningId(openingId);
    setSelectedPartitionId(null);
    setSelectedObjectId(null);
    setSelectedWallIndex(null);
  }

  function changeOriginMode(originMode: TileProject['surfaces'][number]['zones'][number]['layout']['originMode']) {
    if (!activeSurfaceId || !activeZoneId) return;
    setHasRoomEdits(true);
    setProject((current) => updateZoneLayoutOrigin(current, activeSurfaceId, activeZoneId, originMode));
  }

  function changeLayoutPattern(pattern: LayoutPattern) {
    if (!activeSurfaceId || !activeZoneId) return;
    setHasRoomEdits(true);
    setProject((current) => updateZoneLayoutPattern(current, activeSurfaceId, activeZoneId, pattern));
  }

  function changeLayoutStagger(stagger: LayoutStagger) {
    if (!activeSurfaceId || !activeZoneId) return;
    setHasRoomEdits(true);
    setProject((current) => updateZoneLayoutStagger(current, activeSurfaceId, activeZoneId, stagger));
  }

  function changeLayoutGrout(groutMm: number) {
    if (!activeSurfaceId || !activeZoneId) return;
    setHasRoomEdits(true);
    setProject((current) => updateZoneLayoutGrout(current, activeSurfaceId, activeZoneId, groutMm));
  }

  function shiftLayoutOrigin(deltaXmm: number, deltaYmm: number) {
    if (!activeSurfaceId || !activeZone) return;
    const layout = activeZone.layout;
    if (!layout) return;
    setHasRoomEdits(true);
    setProject((current) => updateZoneLayoutOffset(current, activeSurfaceId, activeZone.id, layout.originXmm + deltaXmm, layout.originYmm + deltaYmm));
  }

  function setLayoutTurn(turnDeg: number) {
    if (!activeSurfaceId || !activeZoneId) return;
    const wrapped = ((turnDeg % 360) + 360) % 360;
    const rounded = Math.round(wrapped * 10) / 10;
    const next = rounded === 0 || rounded === 360 ? 0 : rounded;
    setHasRoomEdits(true);
    setProject((current) => {
      const zone = current.surfaces.find((surface) => surface.id === activeSurfaceId)?.zones.find((item) => item.id === activeZoneId);
      if ((zone?.layout.turnDeg ?? 0) === next) return current;
      return updateZoneLayoutTurn(current, activeSurfaceId, activeZoneId, next);
    });
  }

  function resetLayoutTurn() {
    if (!activeSurfaceId || !activeZoneId) return;
    setHasRoomEdits(true);
    setProject((current) => updateZoneLayoutTurn(current, activeSurfaceId, activeZoneId, 0));
  }

  function setLayoutOriginOffset(axis: 'x' | 'y', value: string) {
    if (!activeSurfaceId || !activeZone) return;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    const layout = activeZone.layout;
    if (!layout) return;
    setHasRoomEdits(true);
    setProject((current) => updateZoneLayoutOffset(current, activeSurfaceId, activeZone.id, axis === 'x' ? parsed : layout.originXmm, axis === 'y' ? parsed : layout.originYmm));
  }

  function resetLayoutOffset() {
    if (!activeSurfaceId || !activeZoneId) return;
    setHasRoomEdits(true);
    setProject((current) => updateZoneLayoutOffset(current, activeSurfaceId, activeZoneId, 0, 0));
  }

  function setLayoutEdgeOffset(surfaceId: string, zoneId: string, edge: keyof LayoutEdgeCuts, value: number) {
    const surface = project.surfaces.find((item) => item.id === surfaceId);
    const zone = surface?.zones.find((item) => item.id === zoneId);
    const material = surface && zone ? getZoneMaterial(project, surface.id, zone.id) : null;
    if (!surface || !zone || !material) return;
    const result = getZoneLayoutResult(surface, zone, material);
    const current = result.edgeOffsets[edge] ?? 0;
    const delta = value - current;
    const layout = zone.layout;
    const nextX = edge === 'left' ? layout.originXmm + delta : edge === 'right' ? layout.originXmm - delta : layout.originXmm;
    const nextY = edge === 'top' ? layout.originYmm + delta : edge === 'bottom' ? layout.originYmm - delta : layout.originYmm;
    setHasRoomEdits(true);
    setProject((currentProject) => updateZoneLayoutOffset(currentProject, surfaceId, zoneId, nextX, nextY));
  }

  function addRoom() {
    setAddRoomPickerOpen(true);
  }

  function exitAdditionalRoomEditor() {
    const previous = beforeAdditionalRoomRef.current;
    resetInteractiveModes();
    setAdditionalRoomDraft(null);
    setRoomDimensionsAreaId(null);
    setRoomDimensionsError(null);
    setEditTarget(null);
    setCustomDrawingTarget('primary');
    setSelectedTemplateId(project.room.templateId ?? 'custom');
    if (previous) {
      setLayers(previous.layers);
      setViewport(previous.viewport);
      setHasRoomEdits(previous.hasRoomEdits);
      selectSurface(previous.surfaceId);
    } else {
      selectSurface('surface-floor');
    }
    beforeAdditionalRoomRef.current = null;
  }

  function selectAdditionalRoomTemplate(templateId: string) {
    beforeAdditionalRoomRef.current = { layers, viewport, surfaceId: selectedSurfaceId, hasRoomEdits };
    setAddRoomPickerOpen(false);
    if (templateId === 'custom') {
      beginCustomDrawing('additional');
      return;
    }
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    const draftProject = createProjectFromTemplate(template, getPreferredTemplateSize(template), project, false);
    const draftAreaId = draftProject.room.areas?.[0]?.id ?? 'room-1';
    setAdditionalRoomDraft(draftProject);
    setRoomDimensionsAreaId(draftAreaId);
    setRoomDimensionsError(null);
    setLayers({ grid: true, floor: true, walls: false, dimensions: true });
    selectSurface('surface-floor');
    setEditTarget(null);
    setViewport(resetViewport());
    setActivePanelTab('room');
  }

  function moveAdditionalRoom(areaId: string, deltaXmm: number, deltaYmm: number, detachingOpeningId?: string) {
    setHasRoomEdits(true);
    setProject((current) => {
      const result = moveRoomAreaChecked(current, areaId, deltaXmm, deltaYmm, detachingOpeningId);
      if (result.error) setRoomActionMessage(result.error);
      else {
        const ownLinks = (value: TileProject) => (value.room.openings ?? [])
          .filter((opening) => getOpeningRoomAreaId(value, opening) === areaId && opening.connectedOpeningId)
          .map((opening) => `${opening.id}:${opening.connectedOpeningId}`).sort().join(',');
        const before = ownLinks(current);
        const after = ownLinks(result.project);
        if (before !== after) {
          const newLink = after.split(',').some((link) => link && !before.split(',').includes(link));
          setRoomActionMessage(newLink
            ? 'Помещения соединены. Общий проём можно двигать вдоль стены.'
            : 'Соединение разъединено. Остальные связанные помещения перемещены вместе.');
        }
      }
      return result.project;
    });
  }

  function addSurfaceOpening(kind: Opening['kind'], dimensions: { widthMm: number; heightMm?: number }, surfaceId = activeSurfaceId) {
    if (!surfaceId) return false;
    const added = addOpeningDetailed(project, surfaceId, kind, dimensions);
    if (!added.opening) {
      setRoomActionMessage('На этой стене нет свободного места для нового проёма.');
      return false;
    }
    setHasRoomEdits(true);
    setSelectedSurfaceId(surfaceId);
    setSelectedOpeningId(added.opening.id);
    setSelectedZoneId(null);
    setSelectedPartitionId(null);
    setSelectedObjectId(null);
    if (added.opening.kind === 'window') {
      setProject(added.project);
      return true;
    }
    const areaId = getOpeningRoomAreaId(added.project, added.opening);
    const result = areaId ? moveRoomAreaChecked(added.project, areaId, 0, 0) : { project: added.project };
    setProject(result.project);
    return true;
  }

  function updateSurfaceOpeningDimensions(openingId: string, dimensions: { widthMm: number; heightMm?: number }) {
    const opening = project.room.openings?.find((item) => item.id === openingId);
    if (!opening) return false;
    let nextProject = resizeOpening(project, openingId, {
      xMm: opening.xMm,
      yMm: opening.yMm,
      widthMm: dimensions.widthMm,
      heightMm: opening.kind === 'passage' ? opening.heightMm : dimensions.heightMm ?? opening.heightMm,
    });
    let updated = nextProject.room.openings?.find((item) => item.id === openingId);
    if (!updated || updated.widthMm !== dimensions.widthMm || (opening.kind !== 'passage' && updated.heightMm !== dimensions.heightMm)) {
      setRoomActionMessage('Такие размеры не помещаются на выбранной стене или пересекают другой элемент.');
      return false;
    }
    if (opening.connectedOpeningId && opening.kind !== 'window') {
      const linked = nextProject.room.openings?.find((item) => item.id === opening.connectedOpeningId);
      if (!linked) return false;
      nextProject = resizeOpening(nextProject, linked.id, {
        xMm: linked.xMm,
        yMm: linked.yMm,
        widthMm: dimensions.widthMm,
        heightMm: linked.kind === 'passage' ? linked.heightMm : dimensions.heightMm ?? linked.heightMm,
      });
      const resizedLinked = nextProject.room.openings?.find((item) => item.id === linked.id);
      if (!resizedLinked || resizedLinked.widthMm !== dimensions.widthMm || (linked.kind !== 'passage' && resizedLinked.heightMm !== dimensions.heightMm)) {
        setRoomActionMessage('Парный проём не помещается на стене второго помещения.');
        return false;
      }
      updated = nextProject.room.openings?.find((item) => item.id === openingId);
      if (updated) nextProject = moveOpening(nextProject, openingId, updated.xMm, updated.yMm);
    }
    setHasRoomEdits(true);
    setProject(nextProject);
    setSelectedOpeningId(opening.id);
    setSelectedSurfaceId(opening.surfaceId);
    return true;
  }

  function connectOpeningTo(candidate: OpeningConnectionCandidate) {
    if (!connectionPrompt) return;
    setProject((current) => {
      const result = connectRoomOpenings(current, connectionPrompt.sourceOpeningId, candidate.openingId);
      setRoomActionMessage(result.error ?? `Помещение присоединено через ${candidate.label}.`);
      return result.project;
    });
    setConnectionPrompt(null);
  }

  function moveSurfaceOpening(openingId: string, xMm: number, yMm?: number) {
    setHasRoomEdits(true);
    setProject((current) => moveOpening(current, openingId, xMm, yMm));
  }

  function resizeSurfaceOpening(openingId: string, patch: Pick<Opening, 'xMm' | 'yMm' | 'widthMm' | 'heightMm'>) {
    setHasRoomEdits(true);
    setProject((current) => resizeOpening(current, openingId, patch));
  }

  function resetSurfaceOpening(openingId: string) {
    setHasRoomEdits(true);
    setProject((current) => resetOpening(current, openingId));
  }

  function deleteSurfaceOpening(openingId: string) {
    setConfirmAction({ type: 'delete-opening', id: openingId });
  }

  function deleteFloorArea(areaId: string) {
    setConfirmAction({ type: 'delete-room-area', areaId });
  }

  function createPartition() {
    setPartitionDrawingActive((current) => !current);
    setPartitionDraftStart(null);
    setPartitionDraftAreaId(null);
    setSelectedPartitionId(null);
    setDrawingError(null);
  }

  function addPartitionDraftPoint(point: PointMm) {
    if (!partitionDraftStart) {
      const snapped = findNearestRoomBoundary(project, point, 350);
      if (!snapped) {
        setDrawingError('Начните перегородку на границе пола, рядом с одной из стен.');
        return;
      }
      setPartitionDraftStart(snapped.point);
      setPartitionDraftAreaId(snapped.areaId);
      setDrawingError(null);
      return;
    }
    const area = project.room.areas?.find((item) => item.id === partitionDraftAreaId);
    if (!area) return;
    const end = constrainPartitionEnd(partitionDraftStart, point);
    const crossesPartition = (project.room.partitions ?? []).some((partition) => segmentsIntersect(partitionDraftStart, end, partition.start, partition.end));
    if (!isPartitionInsideContour(area.contour, partitionDraftStart, end) || crossesPartition) {
      setDrawingError('Перегородка должна идти внутрь помещения и не пересекать стены.');
      return;
    }
    const wallIndex = findBoundarySegmentIndex(area.contour, partitionDraftStart);
    setProject((current) => addPartition(current, partitionDraftStart, end, area.id, wallIndex));
    setHasRoomEdits(true);
    setPartitionDrawingActive(false);
    setPartitionDraftStart(null);
    setPartitionDraftAreaId(null);
    setDrawingError(null);
  }

  function moveSurfacePartition(partitionId: string, start: PointMm, end: PointMm) {
    const partition = project.room.partitions?.find((item) => item.id === partitionId);
    if (!partition) return;
    const area = project.room.areas?.find((item) => item.id === partition.areaId);
    if (!area) return;
    if (!isPartitionPlacementValid(area.contour, start, end, project.room.partitions ?? [], partitionId)) {
      setRoomActionMessage('Перегородка должна полностью находиться внутри помещения и не пересекать другие перегородки.');
      return;
    }
    setHasRoomEdits(true);
    setProject((current) => movePartition(current, partitionId, start, end));
  }

  function changePartitionLength(partitionId: string, value: string) {
    const lengthMm = Number(value);
    const partition = project.room.partitions?.find((item) => item.id === partitionId);
    const area = project.room.areas?.find((item) => item.id === partition?.areaId);
    if (!partition || !area || !Number.isInteger(lengthMm) || lengthMm < 250) return false;
    const currentLength = segmentLength(partition.start, partition.end);
    if (!currentLength) return false;
    const center = { x: (partition.start.x + partition.end.x) / 2, y: (partition.start.y + partition.end.y) / 2 };
    const direction = { x: (partition.end.x - partition.start.x) / currentLength, y: (partition.end.y - partition.start.y) / currentLength };
    const start = { x: Math.round(center.x - direction.x * lengthMm / 2), y: Math.round(center.y - direction.y * lengthMm / 2) };
    const end = { x: Math.round(center.x + direction.x * lengthMm / 2), y: Math.round(center.y + direction.y * lengthMm / 2) };
    if (!isPartitionPlacementValid(area.contour, start, end, project.room.partitions ?? [], partitionId)) {
      setRoomActionMessage('Такая длина не помещается внутри помещения. Уменьшите значение или переместите перегородку.');
      return false;
    }
    setHasRoomEdits(true);
    setProject((current) => movePartition(current, partitionId, start, end));
    return true;
  }

  function deleteSurfacePartition(partitionId: string) {
    setConfirmAction({ type: 'delete-partition', id: partitionId });
  }

  function submitRoomObject(input: Parameters<typeof addRoomObject>[1]) {
    const result = editingObjectId ? updateRoomObject(project, editingObjectId, input) : addRoomObject(project, input);
    if (result.error) {
      setObjectDialogError(result.error);
      return false;
    }
    setProject(result.project);
    setSelectedObjectId(result.object?.id ?? null);
    setEditingObjectId(null);
    setObjectDialogError(null);
    setHasRoomEdits(true);
    return true;
  }

  function editSurfaceObject(objectId: string) {
    setEditingObjectId(objectId);
    setSelectedObjectId(objectId);
    setObjectDialogError(null);
    setActivePanelTab('objects');
  }

  function moveSurfaceObjectOnWall(objectId: string, surfaceId: string, offsetMm: number, elevationMm: number) {
    setProject((current) => moveRoomObjectOnWall(current, objectId, surfaceId, offsetMm, elevationMm).project);
    setHasRoomEdits(true);
  }

  function moveSurfaceObject(objectId: string, xMm: number, yMm: number, areaId?: string) {
    setProject((current) => moveRoomObject(current, objectId, xMm, yMm, areaId).project);
    setHasRoomEdits(true);
  }

  function rotateSurfaceObject(objectId: string, rotationDeg: number) {
    setProject((current) => rotateRoomObject(current, objectId, rotationDeg).project);
    setHasRoomEdits(true);
  }

  function deleteSurfaceObject(objectId: string) {
    setConfirmAction({ type: 'delete-object', id: objectId });
  }

  function changeRoomAreaName(areaId: string, name: string) {
    setProject((current) => renameRoomArea(current, areaId, name));
    setRenameRoomAreaId(null);
    setHasRoomEdits(true);
  }

  function createZone(widthMm: number, lengthMm: number, name: string) {
    const targetSurfaceId = activeSurfaceId && project.surfaces.some((surface) => surface.id === activeSurfaceId) ? activeSurfaceId : null;
    if (!targetSurfaceId) return 'Выберите пол или стену на схеме.';
    const result = addSizedZone(project, targetSurfaceId, widthMm, lengthMm, name);
    if (!result.zone) return result.error ?? 'Не удалось создать зону.';
    setHasRoomEdits(true);
    setActivePanelTab('zones');
    setProject(result.project);
    selectZone(targetSurfaceId, result.zone.id);
    return null;
  }

  function changeZoneShape(surfaceId: string, zoneId: string, patch: Partial<Extract<FinishZone['shape'], { type: 'rect' }>>) {
    setHasRoomEdits(true);
    setProject((current) => updateZoneShape(current, surfaceId, zoneId, patch));
  }

  function changeZonePolygonPoints(surfaceId: string, zoneId: string, points: PointMm[]) {
    setHasRoomEdits(true);
    setProject((current) => updateZonePolygonPoints(current, surfaceId, zoneId, points));
  }

  function saveZoneDetails(surfaceId: string, zoneId: string, name: string, shape: Partial<Extract<FinishZone['shape'], { type: 'rect' }>>) {
    const surface = project.surfaces.find((item) => item.id === surfaceId);
    const zone = surface?.zones.find((item) => item.id === zoneId);
    if (!surface || !zone || zone.shape.type !== 'rect') return 'Не удалось найти зону.';
    const next = { ...zone.shape, ...shape };
    if (![next.widthMm, next.heightMm].every((value) => Number.isInteger(value) && value >= 100) || next.xMm < 0 || next.yMm < 0 || next.xMm + next.widthMm > surface.widthMm || next.yMm + next.heightMm > surface.heightMm) return 'Зона не помещается на выбранной плоскости.';
    if (surface.type === 'floor') {
      const contour = project.room.areas?.find((area) => area.id === surface.sourceRef?.split(':')[1])?.contour ?? project.room.contour;
      const box = getBoundingBox(contour);
      if (!isRoomObjectPlacementValid(contour, box.minX + next.xMm, box.minY + next.yMm, next.widthMm, next.heightMm)) return 'Зона должна полностью находиться внутри контура пола.';
    }
    setHasRoomEdits(true);
    setProject((current) => updateZoneShape(updateZoneName(current, surfaceId, zoneId, name), surfaceId, zoneId, shape));
    return null;
  }

  function deleteActiveZone(surfaceId = activeSurfaceId, zoneId = selectedZoneId) {
    if (!surfaceId || !zoneId) return;
    setConfirmAction({ type: 'delete-zone', surfaceId, zoneId });
  }

  function saveRoomDimensions(areaId: string) {
    const sourceProject = additionalRoomDraft ?? project;
    const area = sourceProject.room.areas?.find((item) => item.id === areaId);
    if (!area) return;
    const lengthsMm = area.contour.map((point, index) => Math.round(segmentLength(point, area.contour[(index + 1) % area.contour.length])));
    const result = confirmRoomAreaDimensions(sourceProject, areaId, lengthsMm);
    if (result.error) { setRoomDimensionsError(result.error); return; }
    if (additionalRoomDraft) {
      const confirmedArea = result.project.room.areas?.find((item) => item.id === areaId);
      if (!confirmedArea) return;
      const nextAreaId = `room-${(project.room.areas?.length ?? 1) + 1}`;
      const templateId = confirmedArea.templateId ?? result.project.room.templateId ?? null;
      setProject((current) => addRoomFromContour(current, confirmedArea.contour, true, templateId));
      setAdditionalRoomDraft(null);
      setSelectedSurfaceId(`surface-floor-${nextAreaId}`);
      setSelectedZoneId(null);
      setSelectedOpeningId(null);
      setSelectedPartitionId(null);
      setSelectedObjectId(null);
      setSelectedWallIndex(null);
      setViewport(resetViewport());
    } else {
      setProject(result.project);
    }
    setRoomDimensionsAreaId(null);
    setRoomDimensionsError(null);
    setLayers((current) => ({ ...current, floor: true, walls: true, dimensions: true }));
    setHasRoomEdits(true);
  }

  function requestOpening(kind: Opening['kind']) {
    const fallbackWall = project.surfaces.find((surface) => surface.type === 'wall');
    const surface = activeSurface?.type === 'wall' ? activeSurface : fallbackWall;
    if (!surface) return;
    setEditingOpeningId(null);
    setOpeningDialogSurfaceId(surface.id);
    setOpeningDialogKind(kind);
  }

  function editOpening(openingId: string) {
    const opening = project.room.openings?.find((item) => item.id === openingId);
    if (!opening) return;
    setEditingOpeningId(opening.id);
    setOpeningDialogSurfaceId(opening.surfaceId);
    setOpeningDialogKind(opening.kind);
    selectOpening(opening.surfaceId, opening.id);
  }

  function closeOpeningDialog() {
    setOpeningDialogKind(null);
    setOpeningDialogSurfaceId(null);
    setEditingOpeningId(null);
  }

  function applyTileColor(color: string, name?: string) {
    if (!activeSurfaceId || !activeZoneId) return;
    setHasRoomEdits(true);
    setProject((current) => updateZoneTileColor(current, activeSurfaceId, activeZoneId, color, name));
  }

  function downloadProjectFile() {
    const blob = new Blob([serializeProjectFile(project)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.name.trim().replace(/[\\/:*?"<>|]+/g, '-') || 'Проект Vilray'}.vilray`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function openProjectFile(file: File) {
    const loaded = parseProjectFile(await file.text());
    if (!loaded) {
      setRoomActionMessage('Не удалось открыть файл. Выберите корректный проект с расширением .vilray.');
      return;
    }
    const nextProject = ensureProjectDefaults(loaded);
    setProject(nextProject);
    historyRef.current = { applying: true, current: nextProject, future: [], past: [] };
    setSelectedTemplateId(nextProject.room.templateId ?? 'custom');
    selectSurface(null);
    setRoomDimensionsAreaId(null);
    setEditTarget(null);
    setDrawingMode('idle');
    setLayers({ grid: true, floor: true, walls: true, dimensions: true });
    setViewport(resetViewport());
    setTemplatePickerOpen(false);
    setHasRoomEdits(true);
    setRoomActionMessage('Проект открыт. Можно продолжать работу.');
  }

  function startManualZone(surfaceId = activeSurfaceId, zoneId?: string) {
    resetInteractiveModes();
    const surface = project.surfaces.find((item) => item.id === surfaceId);
    if (!surface) return;
    const zone = zoneId ? surface.zones.find((item) => item.id === zoneId) : null;
    setManualZoneSurfaceId(surface.id);
    setManualZonePoints(zone?.shape.type === 'polygon' ? zone.shape.points.map((point) => ({ ...point })) : []);
    setManualZoneReview(zone?.shape.type === 'polygon');
    setEditingManualZoneId(zone?.shape.type === 'polygon' ? zone.id : null);
    setManualZoneToolArmed(true);
    setManualZoneDrawingMode('orthogonal');
    setSelectedSurfaceId(surface.id);
    setSelectedZoneId(null);
    setLayers((current) => ({
      ...current,
      floor: surface.type === 'floor' ? true : current.floor,
      walls: surface.type === 'wall' ? true : current.walls,
    }));
    setDrawingError(null);
  }

  function addManualZonePoint(point: PointMm) {
    if (manualZoneReview || !manualZoneToolArmed || isExplicitlyClosedContour(manualZonePoints)) return;
    const surface = project.surfaces.find((item) => item.id === manualZoneSurfaceId);
    if (!surface) return;
    const rawPoint = { x: Math.round(point.x), y: Math.round(point.y) };
    let nextPoint = manualZonePoints.length
      ? manualZoneDrawingMode === 'orthogonal'
        ? constrainOrthogonalPoint(manualZonePoints, rawPoint)
        : constrainFreePoint(rawPoint, manualZonePoints)
      : rawPoint;
    if (surface.type === 'floor') {
      const areaId = surface.sourceRef?.split(':')[1];
      const contour = project.room.areas?.find((area) => area.id === areaId)?.contour ?? project.room.contour;
      if (!pointInPolygonOrBoundary(nextPoint, contour)) {
        setDrawingError('Точки зоны должны находиться внутри выбранного пола.');
        return;
      }
      const previousPoint = manualZonePoints.at(-1);
      if (previousPoint && !isSegmentInsidePolygon(contour, previousPoint, nextPoint)) {
        setDrawingError('Линия зоны должна полностью находиться внутри выбранного пола.');
        return;
      }
    } else {
      nextPoint = { x: Math.max(0, Math.min(surface.widthMm, nextPoint.x)), y: Math.max(0, Math.min(surface.heightMm, nextPoint.y)) };
    }
    const error = manualZonePoints.length ? validateDraftPoint(manualZonePoints, nextPoint) : null;
    if (error) {
      setDrawingError(error);
      return;
    }
    setManualZonePoints((current) => [...current, nextPoint]);
    setDrawingError(null);
  }

  function undoManualZonePoint() {
    restoreZoneDraft(zoneDraftHistory.undo());
  }

  function restoreZoneDraft(snapshot: ZoneDraftSnapshot | undefined) {
    if (!snapshot) return;
    setManualZonePoints(snapshot.points);
    setManualZoneReview(snapshot.review);
    setEditTarget(null);
    setDrawingError(null);
  }

  function changeManualZoneMode(mode: CustomDrawingMode) {
    setManualZoneToolArmed((armed) => mode === manualZoneDrawingMode ? !armed : true);
    setManualZoneDrawingMode(mode);
  }

  function changeManualZoneReviewPoints(points: PointMm[]) {
    const surface = project.surfaces.find((item) => item.id === manualZoneSurfaceId);
    if (!surface || !validateContour(points).ok) { setDrawingError('Контур не должен пересекать сам себя.'); return false; }
    if (surface.type === 'floor') {
      const contour = project.room.areas?.find((area) => area.id === surface.sourceRef?.split(':')[1])?.contour ?? project.room.contour;
      if (points.some((point, index) => !pointInPolygonOrBoundary(point, contour) || !isSegmentInsidePolygon(contour, point, points[(index + 1) % points.length]))) { setDrawingError('Зона должна полностью находиться внутри выбранного пола.'); return false; }
    } else if (points.some((point) => point.x < 0 || point.y < 0 || point.x > surface.widthMm || point.y > surface.heightMm)) { setDrawingError('Зона должна полностью находиться внутри выбранной стены.'); return false; }
    setManualZonePoints(points);
    setDrawingError(null);
    return true;
  }

  function changeManualZoneSegment(index: number, value: number) {
    const points = updateZoneSegmentLength(manualZonePoints, index, value);
    if (points === manualZonePoints && segmentLength(points[index], points[(index + 1) % points.length]) !== value) { setDrawingError('Не удалось изменить размер без пересечения сторон.'); return false; }
    return changeManualZoneReviewPoints(points);
  }

  function finishManualZone() {
    const surface = project.surfaces.find((item) => item.id === manualZoneSurfaceId);
    if (!surface) return;
    if (manualZonePoints.length < 3) {
      setDrawingError(`Для зоны ${surface.type === 'floor' ? 'пола' : 'стены'} укажите минимум три точки.`);
      return;
    }
    const hasDiagonal = manualZonePoints.some((point, index) => {
      const next = manualZonePoints[index + 1];
      return next ? point.x !== next.x && point.y !== next.y : false;
    });
    const contourPoints = manualZoneReview ? manualZonePoints : hasDiagonal ? buildClosedContour(manualZonePoints, false) : buildClosedOrthogonalContour(manualZonePoints, false);
    if (!contourPoints || !validateContour(contourPoints).ok) {
      setDrawingError('Контур зоны нельзя замкнуть. Проверьте пересечения и длины сторон.');
      return;
    }
    if (surface.type === 'floor') {
      const areaId = surface.sourceRef?.split(':')[1];
      const contour = project.room.areas?.find((area) => area.id === areaId)?.contour ?? project.room.contour;
      if (contourPoints.some((point) => !pointInPolygonOrBoundary(point, contour)) || contourPoints.some((point, index) => !isSegmentInsidePolygon(contour, point, contourPoints[(index + 1) % contourPoints.length]))) {
        setDrawingError('Нарисованная зона должна полностью находиться внутри выбранного пола.');
        return;
      }
    } else if (contourPoints.some((point) => point.x < 0 || point.y < 0 || point.x > surface.widthMm || point.y > surface.heightMm)) {
      setDrawingError('Нарисованная зона должна полностью находиться внутри выбранной стены.');
      return;
    }
    if (!manualZoneReview) {
      setManualZonePoints(contourPoints);
      setManualZoneReview(true);
      setDrawingError(null);
      return;
    }
    const result = editingManualZoneId
      ? { project: updateZonePolygonPoints(project, surface.id, editingManualZoneId, contourPoints), zone: surface.zones.find((zone) => zone.id === editingManualZoneId) }
      : addManualZone(project, surface.id, contourPoints);
    if (!result.zone) return;
    setProject(result.project);
    setHasRoomEdits(true);
    selectZone(surface.id, result.zone.id);
    setManualZoneSurfaceId(null);
    setManualZonePoints([]);
    setManualZoneReview(false);
    setEditingManualZoneId(null);
    setEditTarget(null);
    setDrawingError(null);
  }

  function cancelManualZone() {
    setManualZoneSurfaceId(null);
    setManualZonePoints([]);
    setManualZoneReview(false);
    setEditingManualZoneId(null);
    setEditTarget(null);
    setDrawingError(null);
  }

  function resetProject() {
    setConfirmAction({ type: 'reset' });
  }

  function resetProjectNow() {
    const nextProject = getInitialProject();
    clearProject();
    setSelectedTemplateId(nextProject.room.templateId ?? 'custom');
    selectSurface('surface-floor');
    setEditTarget(null);
    setLayers({ grid: true, floor: true, walls: true, dimensions: true });
    setViewport(resetViewport());
    setDraftContour([]);
    setDrawingError(null);
    setDrawingMode('idle');
    setAdditionalRoomDraft(null);
    setCustomTileDialogOpen(false);
    setCustomTileError(null);
    setHasRoomEdits(false);
    setActivePanelTab('tile');
    setTemplatePickerOpen(true);
    setProject(nextProject);
  }

  function confirmPendingAction() {
    const action = confirmAction;
    setConfirmAction(null);
    if (!action) return;
    if (action.type === 'reset') {
      resetProjectNow();
      return;
    }
    if (action.type === 'template') { applyTemplateNow(action.templateId); return; }
    setHasRoomEdits(true);
    if (action.type === 'delete-opening') {
      setProject((current) => {
        const opening = current.room.openings?.find((item) => item.id === action.id);
        const withoutOpening = deleteOpening(current, action.id);
        return opening?.connectedOpeningId ? deleteOpening(withoutOpening, opening.connectedOpeningId) : withoutOpening;
      });
      setSelectedOpeningId(null);
      return;
    }
    if (action.type === 'delete-partition') { setProject((current) => deletePartition(current, action.id)); setSelectedPartitionId(null); return; }
    if (action.type === 'delete-room-area') {
      setProject((current) => {
        const result = deleteRoomArea(current, action.areaId);
        if (result.error) setRoomActionMessage(result.error);
        return result.project;
      });
      selectSurface(null);
      return;
    }
    if (action.type === 'delete-object') { setProject((current) => deleteRoomObject(current, action.id)); setSelectedObjectId(null); return; }
    setProject((current) => deleteZone(current, action.surfaceId, action.zoneId));
    setSelectedZoneId(null);
  }

  const confirmDialog = getConfirmDialogCopy(confirmAction);

  return (
    <div className="app-shell">
      <header className="topbar">
        <AppLogo />
        <div className="topbar-tools" aria-label="Быстрые действия">
          <button type="button" className="icon-button" aria-label="Отменить" disabled={additionalRoomDraft || roomDraftActive ? false : manualZoneSurfaceId ? !zoneDraftHistory.canUndo : !historyRef.current.past.length} onClick={undoProject}>
            <Undo2 size={18} />
          </button>
          <button type="button" className="icon-button" aria-label="Повторить" disabled={additionalRoomDraft ? !additionalRoomHistory.canRedo : roomDraftActive ? !roomDraftHistory.canRedo : manualZoneSurfaceId ? !zoneDraftHistory.canRedo : !historyRef.current.future.length} onClick={redoProject}>
            <Redo2 size={18} />
          </button>
          <button type="button" className={layers.grid ? 'tool-button active' : 'tool-button'} onClick={() => setLayers((current) => ({ ...current, grid: !current.grid }))}>
            <Grid3X3 size={17} />
            Сетка
          </button>
          <button type="button" className="tool-button" onClick={() => setHelpOpen(true)}>
            <HelpCircle size={17} />
            Помощь
          </button>
          <button type="button" className="tool-button" onClick={() => setAboutOpen(true)}>
            <Info size={17} />
            О сервисе
          </button>
          <button type="button" className="tool-button danger-lite" onClick={resetProject}>
            <Trash2 size={17} />
            Сброс
          </button>
        </div>
        <div className="topbar-actions">
          <button
            type="button"
            className={calculationSelecting ? 'primary-button active' : 'primary-button'}
            aria-pressed={calculationSelecting}
            disabled={drawingMode !== 'idle'}
            onClick={() => {
              setCalculationOpen(false);
              setLayoutDragEnabled(false);
              setLayoutRotateEnabled(false);
              if (!calculationSelecting) {
                setCalculationSurfaceIds(new Set());
                if (localStorage.getItem(CALCULATION_HINT_STORAGE_KEY) !== '1') {
                  localStorage.setItem(CALCULATION_HINT_STORAGE_KEY, '1');
                  setCalculationHintVisible(true);
                }
              }
              setCalculationSelecting(true);
            }}
          >
            <Calculator size={17} />
            Расчёт
          </button>
          <button type="button" className="tool-button" onClick={downloadProjectFile}>
            <Save size={17} />
            Сохранить
          </button>
          <button type="button" className="tool-button" onClick={() => projectFileInputRef.current?.click()}>
            <FolderOpen size={17} />
            Открыть
          </button>
          <input ref={projectFileInputRef} className="visually-hidden" type="file" accept=".vilray,application/json" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (file) void openProjectFile(file); event.currentTarget.value = ''; }} />
        </div>
      </header>

      <main className={sidePanelCollapsed ? 'workspace side-panel-collapsed' : 'workspace'}>
        <section className="canvas-area" aria-label="Рабочее поле">
          <WorkspaceCanvas
            activePanelTab={activePanelTab}
            canCompleteDrawing={!draftWallStart && isExplicitlyClosedContour(draftContour)}
            draftContour={draftContour}
            draftWallStart={draftWallStart}
            drawingError={drawingError}
            drawingMode={drawingMode}
            drawingToolArmed={drawingToolArmed}
            dimensionEntryAreaId={roomDimensionsAreaId}
            dimensionEntryError={roomDimensionsError}
            customDrawingMode={customDrawingMode}
            editTarget={editTarget}
            layers={layers}
            hideFloorOpenings={false}
            manualZonePoints={manualZonePoints}
            manualZoneSurfaceId={manualZoneSurfaceId}
            manualZoneDrawingMode={manualZoneDrawingMode}
            zoneDraftEditor={{ review: manualZoneReview, armed: manualZoneToolArmed, canUndo: zoneDraftHistory.canUndo, onChangePoints: changeManualZoneReviewPoints, onChangeSegment: changeManualZoneSegment, onBack: () => { setManualZoneReview(false); setEditTarget(null); } }}
            onCancelManualZone={cancelManualZone}
            onFinishManualZone={finishManualZone}
            onManualZoneDrawingModeChange={changeManualZoneMode}
            onUndoManualZonePoint={undoManualZonePoint}
            partitionDrawingActive={partitionDrawingActive}
            partitionDraftStart={partitionDraftStart}
            onAddPartitionDraftPoint={addPartitionDraftPoint}
            onAddDraftPoint={addDraftPoint}
            onChangeHeight={changeHeight}
            onCancelDrawing={cancelCustomDrawing}
            onCompleteDrawing={completeCustomDrawing}
            onCustomDrawingModeChange={changeCustomDrawingMode}
            onEditSegment={setEditTarget}
            onLayersChange={setLayers}
            onAddManualZonePoint={addManualZonePoint}
            layoutDragEnabled={layoutDragEnabled}
            layoutRotateEnabled={layoutRotateEnabled}
            onLayoutDrag={shiftLayoutOrigin}
            onLayoutTurn={setLayoutTurn}
            onToggleLayoutDrag={(enabled) => {
              setLayoutDragEnabled(enabled);
              if (enabled) setLayoutRotateEnabled(false);
            }}
            onToggleLayoutRotate={(enabled) => {
              setLayoutRotateEnabled(enabled);
              if (enabled) setLayoutDragEnabled(false);
            }}
            onLayoutEdgeOffsetChange={setLayoutEdgeOffset}
            onDeleteOpening={deleteSurfaceOpening}
            onDeletePartition={deleteSurfacePartition}
            onDeleteRoomArea={deleteFloorArea}
            onMoveOpening={moveSurfaceOpening}
            onMovePartition={moveSurfacePartition}
            onChangePartitionLength={changePartitionLength}
            onMoveObject={moveSurfaceObject}
            onRotateObject={rotateSurfaceObject}
            onMoveObjectOnWall={moveSurfaceObjectOnWall}
            onResizeOpening={resizeSurfaceOpening}
            onMoveWall={dragWall}
            onMoveRoomArea={moveAdditionalRoom}
            onMoveDraftReviewPoint={moveDraftReviewPoint}
            onMoveDraftReviewWall={moveDraftReviewWall}
            onChangeDraftReviewSegmentLength={changeDraftReviewSegmentLength}
            onMoveLastDraftPoint={moveLastDraftPoint}
            onSaveRoomDimensions={() => roomDimensionsAreaId && saveRoomDimensions(roomDimensionsAreaId)}
            onSaveDrawing={saveCustomDrawing}
            onSelectSurface={selectSurface}
            onSelectOpening={selectOpening}
            onSelectZone={selectZone}
            onSelectWall={selectWall}
            onSubmitSegment={changeSegmentLength}
            onResetOpening={resetSurfaceOpening}
            onEditObject={editSurfaceObject}
            onDeleteObject={deleteSurfaceObject}
            onUndoDraftPoint={undoDraftPoint}
            onViewportChange={setViewport}
            onZoneShapeChange={changeZoneShape}
            onZonePolygonChange={changeZonePolygonPoints}
            project={additionalRoomDraft ?? project}
            relatedZoneWallIds={activeZone?.relatedSurfaceIds ?? []}
            selectedSurfaceId={selectedSurfaceId}
            selectedOpeningId={selectedOpeningId}
            selectedPartitionId={selectedPartitionId}
            selectedObjectId={selectedObjectId}
            onSelectObject={selectRoomObject}
            onRenameRoomArea={setRenameRoomAreaId}
            onSelectPartition={setSelectedPartitionId}
            selectedZoneId={selectedZoneId}
            selectedWallIndex={selectedWallIndex}
            showOpeningNames={Boolean(connectionPrompt)}
            viewport={viewport}
            calculationSelecting={calculationSelecting}
            calculationSelectedIds={calculationSurfaceIds}
            onToggleCalculationSurface={(surfaceId) => {
              setCalculationSurfaceIds((current) => {
                const next = new Set(current);
                if (next.has(surfaceId)) next.delete(surfaceId);
                else next.add(surfaceId);
                return next;
              });
            }}
            onRunCalculation={() => {
              if (!calculationSurfaceIds.size) return;
              setCalculationOpen(true);
            }}
            onCancelCalculation={() => {
              setCalculationSelecting(false);
              setCalculationSurfaceIds(new Set());
              setCalculationOpen(false);
              setCalculationHintVisible(false);
            }}
            calculationHintVisible={calculationHintVisible}
          />
          {roomActionMessage ? <div className="room-action-message" role="status">{roomActionMessage}</div> : null}
        </section>

        <aside className={sidePanelCollapsed ? 'side-panel collapsed' : 'side-panel'} aria-label="Панель текущего шага">
          <button
            type="button"
            className="side-panel-toggle"
            aria-expanded={!sidePanelCollapsed}
            aria-label={sidePanelCollapsed ? 'Открыть правую панель' : 'Скрыть правую панель'}
            title={sidePanelCollapsed ? 'Открыть панель' : 'Скрыть панель'}
            onClick={() => setSidePanelCollapsed((current) => !current)}
          >
            {sidePanelCollapsed ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
          </button>
          <div className="panel-tabs">
            <button type="button" className={activePanelTab === 'room' ? 'active' : ''} onClick={() => switchPanelTab('room')}>Помещение</button>
            <button type="button" className={activePanelTab === 'tile' ? 'active' : ''} onClick={() => switchPanelTab('tile')}>Плитка</button>
            <button type="button" className={activePanelTab === 'zones' ? 'active' : ''} onClick={() => switchPanelTab('zones')}>Зоны</button>
            <button type="button" className={activePanelTab === 'objects' ? 'active' : ''} onClick={() => switchPanelTab('objects')}>Объекты</button>
          </div>

          {activePanelTab === 'tile' ? (
            <div className="panel-stack tile-panel-stack">
              <section className="panel-module tile-format-module">
                <h1 className="panel-module-title">Формат плитки</h1>
                <details
                  className="panel-card panel-section tile-format-select"
                  open
                  onToggle={(event) => {
                    if (!event.currentTarget.open) event.currentTarget.open = true;
                  }}
                >
                  <summary className={activeTileMaterial ? 'tile-format-summary active' : 'tile-format-summary'}>
                    <strong>{activeTileMaterial?.label ?? 'Выберите формат'}</strong>
                  </summary>
                  <div className="tile-card-grid">
                    {tilePresets.map((tile) => (
                      <TilePresetCard
                        active={activeTileMaterial?.presetId === tile.id}
                        tile={tile}
                        key={tile.id}
                        onSelect={() => selectTilePreset(tile)}
                      />
                    ))}
                    <button
                      type="button"
                      className={activeTileMaterial && !activeTileMaterial.presetId ? 'tile-card custom-tile-card active' : 'tile-card custom-tile-card'}
                      onClick={() => {
                        setCustomTileDialogOpen(true);
                        setCustomTileError(null);
                      }}
                    >
                      <span className="tile-card-preview custom-preview">
                        <Plus size={18} />
                      </span>
                      <strong>{activeTileMaterial && !activeTileMaterial.presetId ? activeTileMaterial.label : 'Другой размер'}</strong>
                    </button>
                  </div>
                </details>
              </section>

              <GroutControl
                groutMm={activeZone?.layout.groutMm ?? project.settings.groutMm}
                open={openTileSection === 'grout'}
                disabled={!activeZone}
                onOpenChange={(open) => setOpenTileSection((current) => (open ? 'grout' : current === 'grout' ? null : current))}
                onGroutChange={changeLayoutGrout}
              />

              <section className="panel-module tile-color-module">
                <h1 className="panel-module-title">Цвет плитки</h1>
                <div className="panel-card panel-section">
                  <TileColorPicker
                    activeColor={activeTileMaterial?.swatch.type === 'color' ? activeTileMaterial.swatch.value : '#F2EBF9'}
                    canApply={Boolean(activeSurfaceId && activeZoneId)}
                    project={project}
                    onSelect={applyTileColor}
                  />
                </div>
              </section>

              <LayoutControl
                material={activeTileMaterial}
                openSection={openTileSection}
                onOpenSectionChange={setOpenTileSection}
                onOriginModeChange={changeOriginMode}
                onOffsetReset={resetLayoutOffset}
                onOffsetStep={shiftLayoutOrigin}
                onPatternChange={changeLayoutPattern}
                onStaggerChange={changeLayoutStagger}
                onToggleLayoutDrag={(enabled) => {
                  setLayoutDragEnabled(enabled);
                  if (enabled) setLayoutRotateEnabled(false);
                }}
                onToggleLayoutRotate={(enabled) => {
                  setLayoutRotateEnabled(enabled);
                  if (enabled) setLayoutDragEnabled(false);
                }}
                onTurnReset={resetLayoutTurn}
                onTurnChange={setLayoutTurn}
                surface={activeSurface}
                zone={activeZone}
              />

            </div>
          ) : null}

          {activePanelTab === 'room' ? (
            <div className="panel-stack room-tab-stack">
              <section className="panel-module">
                <h1 className="panel-module-title">Форма помещения</h1>
                <div className="panel-card panel-section">
                  <TemplateGrid onSelect={applyTemplate} selectedTemplateId={selectedTemplateId} />
                </div>
              </section>
              <RoomTools
                disabled={drawingMode !== 'idle' || Boolean(roomDimensionsAreaId)}
                editingOpeningId={editingOpeningId}
                onAddDoor={() => requestOpening('door')}
                onAddPassage={() => requestOpening('passage')}
                onAddPartition={createPartition}
                onAddWindow={() => requestOpening('window')}
                partitionDrawingActive={partitionDrawingActive}
                onAddRoom={addRoom}
                onCancelOpening={closeOpeningDialog}
                onDeleteOpening={deleteSurfaceOpening}
                onDeletePartition={deleteSurfacePartition}
                onEditOpening={editOpening}
                onEditPartitionLength={changePartitionLength}
                onOpeningSurfaceChange={setOpeningDialogSurfaceId}
                onSelectOpening={selectOpening}
                onSelectPartition={setSelectedPartitionId}
                onSubmitOpening={(kind, dimensions, surfaceId, openingId) => openingId
                  ? updateSurfaceOpeningDimensions(openingId, dimensions)
                  : addSurfaceOpening(kind, dimensions, surfaceId)}
                openingEditorKind={openingDialogKind}
                openingSurfaceId={openingDialogSurfaceId}
                project={project}
                selectedOpeningId={selectedOpeningId}
                selectedPartitionId={selectedPartitionId}
              />
            </div>
          ) : null}

          {activePanelTab === 'objects' ? (
            <ObjectsPanel
              editingObject={project.objects.find((object) => object.id === editingObjectId) ?? null}
              error={objectDialogError}
              onCancelEdit={() => { setEditingObjectId(null); setObjectDialogError(null); }}
              onDelete={deleteSurfaceObject}
              onEdit={editSurfaceObject}
              onSelect={selectRoomObject}
              onSubmit={submitRoomObject}
              preferredAreaId={activeSurface ? getZoneAreaId(project, activeSurface) : project.room.areas?.[0]?.id ?? null}
              project={project}
              selectedObjectId={selectedObjectId}
            />
          ) : null}
          {activePanelTab === 'zones' ? (
            <ZonesPanel
              activeSurface={activeSurface}
              activeZone={activeZone}
              onCreateZone={createZone}
              onDeleteZone={deleteActiveZone}
              onSaveZone={saveZoneDetails}
              onSelectZone={selectZone}
              manualDrawingActive={Boolean(manualZoneSurfaceId)}
              editingManualZoneId={editingManualZoneId}
              onCancelManualZone={cancelManualZone}
              onStartManualZone={startManualZone}
              onEditManualZone={startManualZone}
              project={project}
              selectedSurfaceId={selectedSurfaceId}
              selectedZoneId={selectedZoneId}
              selectionRevision={zoneSelectionRevision}
            />
          ) : null}

          {contourStatus.ok ? null : <p className="error-text">{contourStatus.message}</p>}
          <PromoCard />
        </aside>
      </main>

      {confirmDialog ? (
        <ConfirmDialog
          cancelLabel="Отмена"
          confirmLabel={confirmDialog.confirmLabel}
          message={confirmDialog.message}
          title={confirmDialog.title}
          onCancel={() => setConfirmAction(null)}
          onConfirm={confirmPendingAction}
        />
      ) : null}

      {connectionPrompt ? (
        <OpeningConnectionDialog
          candidates={connectionPrompt.candidates}
          onCancel={() => setConnectionPrompt(null)}
          onSelect={connectOpeningTo}
        />
      ) : null}

      {customTileDialogOpen ? (
        <CustomTileDialog
          error={customTileError}
          material={activeTileMaterial ?? undefined}
          onCancel={() => {
            setCustomTileDialogOpen(false);
            setCustomTileError(null);
          }}
          onSubmit={submitCustomTile}
        />
      ) : null}

      {renameRoomAreaId ? (
        <RoomNameDialog
          area={project.room.areas?.find((area) => area.id === renameRoomAreaId)}
          onCancel={() => setRenameRoomAreaId(null)}
          onSubmit={changeRoomAreaName}
        />
      ) : null}

      {helpOpen ? <HelpDialog onClose={() => setHelpOpen(false)} /> : null}
      {aboutOpen ? <AboutDialog onClose={() => setAboutOpen(false)} /> : null}

      {templatePickerOpen ? (
        <TemplatePickerDialog
          onSelect={applyTemplateNow}
          selectedTemplateId={selectedTemplateId}
        />
      ) : null}

      {addRoomPickerOpen ? (
        <TemplatePickerDialog
          onSelect={selectAdditionalRoomTemplate}
          selectedTemplateId=""
        />
      ) : null}

      {calculationOpen && calculation ? (
        <CalculationDialog
          calculation={calculation}
          project={project}
          onClose={() => setCalculationOpen(false)}
        />
      ) : null}
    </div>
  );
}

function AppLogo() {
  return (
    <div className="brand" aria-label="Посчитай плитку">
      <svg className="brand-logo-mark" viewBox="0 0 52 44" aria-hidden="true">
        <rect className="logo-tile logo-tile-a" x="4" y="5" width="12" height="12" rx="3" />
        <rect className="logo-tile logo-tile-b" x="19" y="5" width="12" height="12" rx="3" />
        <rect className="logo-tile logo-tile-c" x="4" y="20" width="12" height="12" rx="3" />
        <rect className="logo-tile logo-tile-d" x="19" y="20" width="12" height="12" rx="3" />
        <path className="logo-ruler" d="M36 9v25h12" />
        <path className="logo-ruler" d="M36 14h4M36 19h6M36 24h4M36 29h6" />
        <path className="logo-ruler-fill" d="M39 31h9v4h-9z" />
      </svg>
      <strong>
        Посчитай
        <span>плитку</span>
      </strong>
    </div>
  );
}

function ConfirmDialog({
  cancelLabel,
  confirmLabel,
  message,
  onCancel,
  onConfirm,
  title,
}: {
  cancelLabel: string;
  confirmLabel: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <h2 id="confirm-title">{title}</h2>
        <p>{message}</p>
        <div className="confirm-actions">
          <button type="button" className="confirm-cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="confirm-submit" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function OpeningConnectionDialog({ candidates, onCancel, onSelect }: { candidates: OpeningConnectionCandidate[]; onCancel: () => void; onSelect: (candidate: OpeningConnectionCandidate) => void }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="confirm-dialog opening-connection-dialog" role="dialog" aria-modal="true" aria-labelledby="opening-connection-title">
        <h2 id="opening-connection-title">Соединить помещения</h2>
        <p>Выберите свободный проём, к которому нужно присоединить новое помещение. Мы развернём и совместим помещения автоматически.</p>
        <div className="opening-connection-options">
          {candidates.map((candidate) => (
            <button type="button" key={candidate.openingId} onClick={() => onSelect(candidate)}>
              <strong>{candidate.label}</strong>
              <span>{candidate.areaName}</span>
            </button>
          ))}
        </div>
        <div className="confirm-actions">
          <button type="button" className="confirm-cancel" onClick={onCancel}>Пока не соединять</button>
        </div>
      </section>
    </div>
  );
}

function HelpDialog({ onClose }: { onClose: () => void }) {
  const sections: Array<{ title: string; steps: string[]; tip?: string }> = [
    {
      title: 'Как начать проект?',
      steps: [
        'При первом запуске откроется выбор шаблона помещения.',
        'Выберите готовую форму (прямоугольник и другие) или режим «Нарисовать самому».',
        'Для шаблона растяните стены мышкой или нажмите на подписи размеров и введите длину в миллиметрах.',
        'Обязательно нажмите «Сохранить форму» — после этого контур помещения фиксируется.',
        'Если рисуете сами: ставьте точки стен, при необходимости переключайте «Нарисовать стену» / «Стена под углом», затем «Завершить построение» и сохраните.',
      ],
      tip: 'До сохранения формы размеры можно править свободно. После сохранения геометрию комнаты менять нельзя.',
    },
    {
      title: 'Верхняя панель',
      steps: [
        'Стрелки «назад / вперёд» отменяют и возвращают до десяти последних действий проекта.',
        '«Сетка» включает и выключает фоновую сетку на схеме.',
        '«Помощь» открывает руководство по работе со схемой.',
        '«О сервисе» рассказывает, для кого сделан инструмент и чем он помогает.',
        '«Сброс» очищает текущий проект в браузере (с подтверждением).',
        '«Расчёт» включает выбор пола и стен на схеме. После отметки нажмите «Рассчитать» сверху.',
        '«Сохранить» скачивает файл .vilray. «Открыть» загружает ранее сохранённый проект.',
      ],
    },
    {
      title: 'Навигация по схеме',
      steps: [
        'Клик по полу выбирает пол. Клик по ребру комнаты или стене в блоке стен выбирает стену.',
        'Масштаб меняется кнопками «− / + / вписать» справа на схеме.',
        'Схему можно панорамировать, когда не активен режим рисования или перетаскивания объекта.',
        'Чекбоксы «Пол / Стены / Размеры» слева сверху показывают или скрывают слои.',
        'Рядом с «Размеры» есть режим: «Размеры помещения», «Отступы плитки» или «Расстояния между объектами».',
      ],
    },
    {
      title: 'Вкладка «Помещение»',
      steps: [
        'Откройте правую панель → «Помещение».',
        'В блоке формы можно сменить шаблон до сохранения формы.',
        '«Добавить помещение» создаёт ещё одну комнату: выберите шаблон, задайте размеры и сохраните.',
        'Новое помещение можно двигать целиком и соединять с другим через свободные двери или проходы.',
        'Кнопки двери, окна, прохода и перегородки добавляют элементы на выбранную стену или в комнату.',
        'Для перегородки кликните у стены, протяните линию и завершите построение.',
        'Название помещения меняется через диалог переименования в инструментах комнаты.',
      ],
      tip: 'Соединение дверей/проходов между комнатами предлагается автоматически, когда рядом есть подходящий проём.',
    },
    {
      title: 'Вкладка «Плитка»',
      steps: [
        'Сначала кликните по полу, стене или зоне на схеме — без выбора поверхности настройки не применятся.',
        'Формат плитки всегда открыт: выберите готовый размер или «Другой размер» (ввод в сантиметрах).',
        'В «Размере швов» задайте 0 / 0.5 / 1 / 2 / 3 мм или свой вариант — плитки раздвигаются на эту ширину, расчёт стены это учитывает.',
        'В «Укладке» на фиолетовой строке виден выбранный рисунок. Ниже — точка старта сетки.',
        'В «Смещении» выберите долю сдвига ряда, затем двигайте раскладку стрелками или кнопкой «Крутить».',
        'Цвет плитки выбирается пятью кнопками; шестая кнопка «Свой цвет» открывает дополнительные оттенки.',
      ],
    },
    {
      title: 'Цвет плитки',
      steps: [
        'Выберите пол, стену или зону.',
        'Откройте вкладку «Плитка» — цвета находятся в блоке окрашивания.',
        'Пять кнопок — готовые пастельные оттенки. Клик красит выбранную поверхность.',
        '«Свой цвет» открывает дополнительные оттенки. Неиспользованный слот заменяется; если все пять цветов уже применялись, выбранный оттенок просто красится на поверхность.',
      ],
    },
    {
      title: 'Вкладка «Зоны»',
      steps: [
        'Выберите пол или стену на схеме.',
        'Создайте зону кнопками «Прямоугольник», «Горизонталь», «Вертикаль» или «Нарисовать зону».',
        'В режиме рисования ставьте точки контура; доступны прямые углы и линии под углом.',
        'В списке зон по помещениям можно выбрать зону, посмотреть info, изменить имя/размеры (если не заблокирована) или удалить.',
        'У прямоугольной зоны можно править отступы и размеры в диалоге редактирования.',
        'Зона получает свой формат и цвет плитки независимо от основной поверхности.',
      ],
      tip: 'После сохранения ручной (нарисованной) зоны её геометрия фиксируется.',
    },
    {
      title: 'Вкладка «Объекты»',
      steps: [
        'Заполните название, ширину, высоту и длину в миллиметрах и нажмите «Создать».',
        'Объект появится в помещении. Перетаскивайте его внутри комнаты — за стены он не выходит.',
        'Галочка «За объектом отсутствует плитка» вычитает плитку на стене за объектом.',
        'Галочка «Под объектом отсутствует плитка» вычитает плитку на полу под объектом.',
        'Если поставить объект на другой, он автоматически встанет выше (как навесной шкаф над нижним). На стене такую пару можно двигать по высоте.',
        'У выбранного объекта есть поворот ↻, редактирование ✎ и удаление.',
        'В режиме размеров «Расстояния между объектами» видны отступы до стен (у объектов на полу) и промежутки между ними.',
      ],
    },
    {
      title: 'Режимы размеров на схеме',
      steps: [
        'Включите слой «Размеры».',
        '«Размеры помещения» — габариты выбранного объекта (или размеры стен/проёмов в зависимости от выбора).',
        '«Отступы плитки» — подписи подрезок раскладки; объекты становятся почти прозрачными, чтобы не мешать.',
        '«Расстояния между объектами» — пунктир до стен и зазоры между мебелью.',
        'Подписи размеров всегда рисуются поверх объектов, чтобы их было видно.',
      ],
    },
    {
      title: 'Двери, окна и проходы',
      steps: [
        'Выберите стену, затем на вкладке «Помещение» добавьте дверь, окно или проход.',
        'Укажите размеры в миллиметрах — после сохранения размер проёма фиксируется.',
        'Проём можно двигать вдоль стены; окно также можно смещать по высоте.',
        'У проёма есть ручки изменения размера и сброс к исходному положению.',
        'Плитка в зоне двери/окна/прохода не считается — это вырез в раскладке.',
      ],
    },
    {
      title: 'Расчёт плитки',
      steps: [
        'Нажмите «Расчёт» в верхней панели — элементы схемы станут серее, рядом появятся чекбоксы.',
        'Отметьте нужный пол и стены, затем нажмите «Рассчитать» на схеме.',
        'В окне кратко указано, что выбрано: помещений, полов и стен.',
        'Сверху видны число помещений и общая площадь плитки в м².',
        'В списке «Использованная плитка» — карточки: цвет, название и метраж.',
        'Обрезки учитываются по площади кусков и округляются вверх до целых плиток.',
        '«Выгрузить в PDF» сохраняет отчёт только по отмеченным элементам. Можно включить схему пола, стен или обе — из того, что было выбрано.',
        'В файле сначала идёт схема с кладкой, сеткой и размерами, затем расчёт метража, внизу — «Разработано VilrayStudio».',
      ],
    },
    {
      title: 'Сохранение и открытие',
      steps: [
        '«Сохранить» создаёт файл .vilray с проектом (комнаты, плитка, зоны, объекты, цвета).',
        '«Открыть» загружает файл обратно в браузер.',
        'Проект также может автоматически сохраняться в памяти браузера между сессиями.',
        '«Сброс» удаляет локальные данные текущего проекта — используйте осторожно.',
      ],
    },
    {
      title: 'Правая панель и рекламный блок',
      steps: [
        'Вкладки панели: Помещение, Плитка, Зоны, Объекты.',
        'Панель рассчитана на один экран без общего скролла; длинные списки зон и объектов прокручиваются внутри выпадающих групп.',
        'Стрелка у края панели сворачивает её, чтобы расширить схему.',
        'Внизу панели — блок Vilray Studio со ссылкой на обсуждение проекта.',
      ],
    },
  ];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const active = sections[selectedIndex];

  return (
    <div className="help-page-backdrop" role="presentation">
      <section className="help-page" role="dialog" aria-modal="true" aria-labelledby="help-title">
        <header>
          <div>
            <h2 id="help-title">Руководство пользователя</h2>
            <p>Сверху общее видео. Ниже слева выберите вопрос — справа откроется ответ.</p>
          </div>
          <button type="button" aria-label="Закрыть" onClick={onClose}>×</button>
        </header>
        <div className="help-page-body">
          <section className="help-video-panel" aria-label="Обучающее видео">
            <div className="help-video-placeholder">
              <span>Обучающее видео</span>
              <p>Здесь будет общая видеоинструкция по работе с сервисом.</p>
            </div>
          </section>
          <div className="help-page-lower">
            <nav className="help-question-list" aria-label="Разделы руководства">
              {sections.map((section, index) => (
                <button
                  key={section.title}
                  type="button"
                  className={selectedIndex === index ? 'active' : ''}
                  onClick={() => setSelectedIndex(index)}
                >
                  {section.title}
                </button>
              ))}
            </nav>
            <main className="help-content">
              <section className="help-answer">
                <h3>{active.title}</h3>
                <ol className="help-step-list">
                  {active.steps.map((step) => <li key={step}>{step}</li>)}
                </ol>
                {active.tip ? <p className="help-tip"><strong>Совет.</strong> {active.tip}</p> : null}
              </section>
            </main>
          </div>
        </div>
      </section>
    </div>
  );
}

function AboutDialog({ onClose }: { onClose: () => void }) {
  const sections: Array<{ title: string; paragraphs: string[]; points?: string[] }> = [
    {
      title: 'Для кого создан сервис',
      paragraphs: [
        '«Посчитай плитку» сделан для людей, которым нужно понять раскладку до покупки материала — без чертежной программы и без регистрации.',
      ],
      points: [
        'Покупателю, который планирует ремонт ванной, кухни или санузла и хочет увидеть, как плитка ляжет на его стены и пол.',
        'Менеджеру салона: схему можно собрать вместе с клиентом и сразу показать подрезки и количество.',
        'Плиточнику и замерщику — чтобы согласовать формат, швы и старт сетки до выезда на объект.',
        'Дизайнеру интерьера — как быстрый черновик раскладки, а не как тяжёлый CAD.',
      ],
    },
    {
      title: 'Для чего создан сервис',
      paragraphs: [
        'Сервис помогает разложить плитку по реальному помещению: выбрать или нарисовать комнату, назначить формат на пол и стены, увидеть целые плитки и подрезки.',
        'Это не калькулятор «площадь комнаты разделить на площадь плитки». Расчёт строится по конкретной раскладке, с учётом швов, зон, дверей, окон и объектов.',
      ],
    },
    {
      title: 'Зачем он нужен',
      paragraphs: [
        'Чаще всего плитку покупают с запасом «на глаз» или по грубой площади. В итоге либо не хватает коробок, либо остаются лишние упаковки, а неприятные подрезки обнаруживаются уже на стене.',
        '«Посчитай плитку» нужен, чтобы принять решение заранее: какой формат выбрать, куда сдвинуть сетку, хватает ли материала и сколько это примерно будет стоить.',
      ],
    },
    {
      title: 'Чем помогает',
      paragraphs: [
        'Инструмент проводит от формы помещения до расчёта количества — в одном окне браузера, бесплатно и без установки.',
      ],
      points: [
        'Собрать план: шаблон комнаты или свой контур, несколько помещений, двери, окна, проходы и перегородки.',
        'Разложить плитку на полу, стенах и отдельных зонах — со швом, рисунком укладки, смещением и цветом.',
        'Поставить мебель и сантехнику, чтобы видеть, где плитка не нужна, и проверить расстояния.',
        'Получить количество плиток и упаковок, оценить стоимость и сохранить схему в файл или PDF.',
      ],
    },
  ];

  return (
    <div className="help-page-backdrop" role="presentation">
      <section className="help-page" role="dialog" aria-modal="true" aria-labelledby="about-title">
        <header>
          <div>
            <h2 id="about-title">О сервисе</h2>
            <p>Кратко о том, для кого сделан «Посчитай плитку», зачем он существует и чем помогает.</p>
          </div>
          <button type="button" aria-label="Закрыть" onClick={onClose}>×</button>
        </header>
        <div className="about-page-body">
          <div className="about-sections">
            {sections.map((section, index) => (
              <details key={section.title} open={index === 0}>
                <summary>{section.title}</summary>
                <div className="about-section-body">
                  {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  {section.points ? (
                    <ul>
                      {section.points.map((point) => <li key={point}>{point}</li>)}
                    </ul>
                  ) : null}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function ObjectsPanel({ editingObject, error, onCancelEdit, onDelete, onEdit, onSelect, onSubmit, preferredAreaId, project, selectedObjectId }: {
  editingObject: RoomObject | null;
  error: string | null;
  onCancelEdit: () => void;
  onDelete: (objectId: string) => void;
  onEdit: (objectId: string) => void;
  onSelect: (objectId: string | null) => void;
  onSubmit: (input: Parameters<typeof addRoomObject>[1]) => boolean;
  preferredAreaId: string | null;
  project: TileProject;
  selectedObjectId: string | null;
}) {
  const areas = project.room.areas ?? [];
  const [name, setName] = useState(() => getNextRoomObjectName(project.objects));
  const [widthMm, setWidthMm] = useState('500');
  const [heightMm, setHeightMm] = useState('850');
  const [lengthMm, setLengthMm] = useState('800');
  const [excludeWallTile, setExcludeWallTile] = useState(false);
  const [excludeFloorTile, setExcludeFloorTile] = useState(false);
  const [infoObjectId, setInfoObjectId] = useState<string | null>(null);

  useEffect(() => {
    if (editingObject) {
      setName(editingObject.name);
      setWidthMm(String(editingObject.widthMm));
      setHeightMm(String(editingObject.heightMm));
      setLengthMm(String(editingObject.lengthMm));
      setExcludeWallTile(editingObject.excludeWallTile);
      setExcludeFloorTile(editingObject.excludeFloorTile);
      return;
    }
    setName(getNextRoomObjectName(project.objects));
    setWidthMm('500');
    setHeightMm('850');
    setLengthMm('800');
    setExcludeWallTile(false);
    setExcludeFloorTile(false);
  }, [editingObject?.id, project.objects.length]);

  function resetForm() {
    onCancelEdit();
    setName(getNextRoomObjectName(project.objects));
    setWidthMm('500');
    setHeightMm('850');
    setLengthMm('800');
    setExcludeWallTile(false);
    setExcludeFloorTile(false);
  }

  return (
    <div className="panel-stack objects-panel">
      <section className="panel-module">
        <h1 className="panel-module-title">{editingObject ? 'Редактирование объекта' : 'Новый объект'}</h1>
        <div className="panel-card panel-section">
          <form
            className="object-editor"
            onSubmit={(event) => {
              event.preventDefault();
              const saved = onSubmit({
                areaId: editingObject?.areaId ?? preferredAreaId ?? areas[0]?.id ?? '',
                excludeWallTile,
                excludeFloorTile,
                heightMm: Number(heightMm),
                lengthMm: Number(lengthMm),
                name,
                widthMm: Number(widthMm),
              });
              if (saved) {
                setName(getNextRoomObjectName([...project.objects, { name }]));
                setWidthMm('500');
                setHeightMm('850');
                setLengthMm('800');
                setExcludeWallTile(false);
                setExcludeFloorTile(false);
              }
            }}
          >
            <label className="object-editor-wide">
              Название
              <input maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Например, навесной шкаф" required />
            </label>
            <label>Ширина, мм<input type="number" min="1" max="15000" step="1" value={widthMm} onChange={(event) => setWidthMm(event.target.value)} required /></label>
            <label>Высота, мм<input type="number" min="1" max="4500" step="1" value={heightMm} onChange={(event) => setHeightMm(event.target.value)} required /></label>
            <label>Длина, мм<input type="number" min="1" max="15000" step="1" value={lengthMm} onChange={(event) => setLengthMm(event.target.value)} required /></label>
            <label className="object-tile-checkbox">
              <input type="checkbox" checked={excludeWallTile} onChange={(event) => setExcludeWallTile(event.target.checked)} />
              <span>За объектом отсутствует плитка</span>
            </label>
            <label className="object-tile-checkbox">
              <input type="checkbox" checked={excludeFloorTile} onChange={(event) => setExcludeFloorTile(event.target.checked)} />
              <span>Под объектом отсутствует плитка</span>
            </label>
            {error ? <p className="error-text object-editor-wide">{error}</p> : null}
            <div className="object-editor-actions object-editor-wide">
              {editingObject ? <button type="button" className="secondary" onClick={resetForm}>Отмена</button> : null}
              <button type="submit">{editingObject ? 'Сохранить изменения' : 'Создать'}</button>
            </div>
          </form>
        </div>
      </section>

      <section className="panel-module panel-module-fill">
        <h1 className="panel-module-title">Список объектов</h1>
        <div className="panel-card panel-section panel-card-fill">
          <div className="panel-groups">
            {areas.map((area) => {
              const objects = project.objects.filter((object) => object.areaId === area.id);
              return (
                <details className="panel-group" key={area.id} open={objects.length > 0}>
                  <summary>
                    <span>{area.name}</span>
                    <small>{objects.length}</small>
                  </summary>
                  <div className="panel-group-list">
                    {objects.length ? objects.map((object) => (
                      <article key={object.id} className={selectedObjectId === object.id ? 'selected' : ''}>
                        <button type="button" className="panel-item-name" onClick={() => onSelect(object.id)}>{object.name}</button>
                        <div className="panel-item-actions">
                          <button type="button" onClick={() => setInfoObjectId((current) => current === object.id ? null : object.id)} aria-label="Информация">i</button>
                          <button type="button" onClick={() => onEdit(object.id)} aria-label="Изменить">✎</button>
                          <button type="button" className="danger-lite" onClick={() => onDelete(object.id)} aria-label="Удалить">×</button>
                        </div>
                        {infoObjectId === object.id ? (
                          <div className="panel-item-info">
                            <span>{object.widthMm} × {object.heightMm} × {object.lengthMm} мм</span>
                            <small>{object.excludeWallTile ? 'Без плитки за объектом' : 'Плитка на стене'} · {object.excludeFloorTile ? 'без плитки под объектом' : 'плитка на полу'}</small>
                          </div>
                        ) : null}
                      </article>
                    )) : <p>В этом помещении пока нет объектов.</p>}
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function RoomNameDialog({ area, onCancel, onSubmit }: {
  area: NonNullable<TileProject['room']['areas']>[number] | undefined;
  onCancel: () => void;
  onSubmit: (areaId: string, name: string) => void;
}) {
  const [name, setName] = useState(area?.name ?? '');
  if (!area) return null;
  return (
    <div className="modal-backdrop" role="presentation">
      <form className="confirm-dialog room-name-dialog" role="dialog" aria-modal="true" aria-labelledby="room-name-title" onSubmit={(event) => { event.preventDefault(); onSubmit(area.id, name); }}>
        <h2 id="room-name-title">Название помещения</h2>
        <label>
          Введите своё название
          <input autoFocus maxLength={60} value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <div className="dialog-actions">
          <button type="button" className="secondary" onClick={onCancel}>Отмена</button>
          <button type="submit" disabled={!name.trim()}>Сохранить</button>
        </div>
      </form>
    </div>
  );
}

function CustomTileDialog({
  error,
  material,
  onCancel,
  onSubmit,
}: {
  error: string | null;
  material?: TileMaterial;
  onCancel: () => void;
  onSubmit: (widthCm: string, heightCm: string) => void;
}) {
  const defaultWidth = material ? String(Math.round(material.widthMm / 10)) : '60';
  const defaultHeight = material ? String(Math.round(material.heightMm / 10)) : '120';

  return (
    <div className="modal-backdrop" role="presentation">
      <form
        className="confirm-dialog custom-tile-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-tile-title"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          onSubmit(String(data.get('widthCm') ?? ''), String(data.get('heightCm') ?? ''));
        }}
      >
        <h2 id="custom-tile-title">Другой размер плитки</h2>
        <p>Введите размер в сантиметрах. В проекте он сохранится в миллиметрах.</p>
        <div className="custom-tile-fields">
          <label>
            Ширина
            <input name="widthCm" type="number" min={5} max={320} step={1} defaultValue={defaultWidth} autoFocus />
          </label>
          <label>
            Высота
            <input name="heightCm" type="number" min={5} max={320} step={1} defaultValue={defaultHeight} />
          </label>
        </div>
        {error ? <em>{error}</em> : null}
        <div className="confirm-actions">
          <button type="button" className="confirm-cancel" onClick={onCancel}>
            Отмена
          </button>
          <button type="submit" className="confirm-submit">
            Применить
          </button>
        </div>
      </form>
    </div>
  );
}

function getConfirmDialogCopy(action: ConfirmAction) {
  if (!action) return null;
  if (action.type === 'reset') {
    return {
      confirmLabel: 'Сбросить',
      message: 'Текущая схема, размеры и настройки будут удалены из этого браузера.',
      title: 'Сбросить проект?',
    };
  }

  if (action.type.startsWith('delete-')) {
    return {
      confirmLabel: 'Да, удалить',
      message: 'Вы уверены, что хотите удалить элемент?',
      title: 'Удаление элемента',
    };
  }

  return {
    confirmLabel: 'Сменить форму',
    message: 'Текущие размеры и правки стен будут заменены выбранным шаблоном.',
    title: 'Сменить форму помещения?',
  };
}

interface WorkspaceCanvasProps {
  activePanelTab: PanelTab;
  canCompleteDrawing: boolean;
  customDrawingMode: CustomDrawingMode;
  draftContour: PointMm[];
  draftWallStart: PointMm | null;
  drawingError: string | null;
  drawingMode: DrawingMode;
  drawingToolArmed: boolean;
  dimensionEntryAreaId: string | null;
  dimensionEntryError: string | null;
  editTarget: EditTarget;
  layers: CanvasLayers;
  hideFloorOpenings: boolean;
  manualZonePoints: PointMm[];
  manualZoneSurfaceId: string | null;
  manualZoneDrawingMode: CustomDrawingMode;
  zoneDraftEditor: ZoneDraftEditor;
  onCancelManualZone: () => void;
  onFinishManualZone: () => void;
  onManualZoneDrawingModeChange: (mode: CustomDrawingMode) => void;
  onUndoManualZonePoint: () => void;
  partitionDrawingActive: boolean;
  partitionDraftStart: PointMm | null;
  onAddPartitionDraftPoint: (point: PointMm) => void;
  layoutDragEnabled: boolean;
  layoutRotateEnabled: boolean;
  onAddDraftPoint: (point: PointMm) => void;
  onChangeHeight: (areaId: string, value: string) => void;
  onCancelDrawing: () => void;
  onCompleteDrawing: () => void;
  onCustomDrawingModeChange: (mode: CustomDrawingMode) => void;
  onEditSegment: (target: EditTarget) => void;
  onLayersChange: (layers: CanvasLayers) => void;
  onAddManualZonePoint: (point: PointMm) => void;
  onLayoutDrag: (deltaXmm: number, deltaYmm: number) => void;
  onLayoutTurn: (turnDeg: number) => void;
  onToggleLayoutDrag: (enabled: boolean) => void;
  onToggleLayoutRotate: (enabled: boolean) => void;
  onLayoutEdgeOffsetChange: (surfaceId: string, zoneId: string, edge: keyof LayoutEdgeCuts, value: number) => void;
  onDeleteObject: (objectId: string) => void;
  onEditObject: (objectId: string) => void;
  onDeleteOpening: (openingId: string) => void;
  onDeletePartition: (partitionId: string) => void;
  onDeleteRoomArea: (areaId: string) => void;
  onMoveObject: (objectId: string, xMm: number, yMm: number, areaId?: string) => void;
  onRotateObject: (objectId: string, rotationDeg: number) => void;
  onMoveObjectOnWall: (objectId: string, surfaceId: string, offsetMm: number, elevationMm: number) => void;
  onMoveOpening: (openingId: string, xMm: number, yMm?: number) => void;
  onMovePartition: (partitionId: string, start: PointMm, end: PointMm) => void;
  onChangePartitionLength: (partitionId: string, value: string) => boolean;
  onResizeOpening: (openingId: string, patch: Pick<Opening, 'xMm' | 'yMm' | 'widthMm' | 'heightMm'>) => void;
  onMoveWall: (areaId: string, index: number, deltaMm: number) => void;
  onMoveRoomArea: (areaId: string, deltaXmm: number, deltaYmm: number, detachingOpeningId?: string) => void;
  onMoveDraftReviewPoint: (index: number, point: PointMm) => boolean;
  onMoveDraftReviewWall: (index: number, deltaXmm: number, deltaYmm: number) => boolean;
  onChangeDraftReviewSegmentLength: (index: number, value: number) => boolean;
  onMoveLastDraftPoint: (point: PointMm) => PointMm | null;
  onSaveRoomDimensions: () => void;
  onSaveDrawing: () => void;
  onSelectSurface: (surfaceId: string | null) => void;
  onSelectOpening: (surfaceId: string, openingId: string) => void;
  onSelectZone: (surfaceId: string, zoneId: string | null) => void;
  onSelectWall: (index: number | null) => void;
  onSubmitSegment: (target: Extract<Exclude<EditTarget, null>, { type: 'floor-segment' | 'wall-segment' }>, value: string) => void;
  onRenameRoomArea: (areaId: string) => void;
  onResetOpening: (openingId: string) => void;
  onSelectObject: (objectId: string | null) => void;
  onSelectPartition: (partitionId: string | null) => void;
  onUndoDraftPoint: () => void;
  onViewportChange: (viewport: CanvasViewport) => void;
  onZoneShapeChange: (surfaceId: string, zoneId: string, patch: Partial<Extract<FinishZone['shape'], { type: 'rect' }>>) => void;
  onZonePolygonChange: (surfaceId: string, zoneId: string, points: PointMm[]) => void;
  showOpeningNames: boolean;
  project: TileProject;
  relatedZoneWallIds: string[];
  selectedSurfaceId: string | null;
  selectedOpeningId: string | null;
  selectedObjectId: string | null;
  selectedPartitionId: string | null;
  selectedZoneId: string | null;
  selectedWallIndex: number | null;
  viewport: CanvasViewport;
  calculationSelecting: boolean;
  calculationSelectedIds: Set<string>;
  onToggleCalculationSurface: (surfaceId: string) => void;
  onRunCalculation: () => void;
  onCancelCalculation: () => void;
  calculationHintVisible: boolean;
}

function WorkspaceCanvas({
  activePanelTab,
  canCompleteDrawing,
  customDrawingMode,
  draftContour,
  draftWallStart,
  drawingError,
  drawingMode,
  drawingToolArmed,
  dimensionEntryAreaId,
  dimensionEntryError,
  editTarget,
  layers,
  hideFloorOpenings,
  manualZonePoints,
  manualZoneSurfaceId,
  manualZoneDrawingMode,
  zoneDraftEditor,
  onCancelManualZone,
  onFinishManualZone,
  onManualZoneDrawingModeChange,
  onUndoManualZonePoint,
  partitionDrawingActive,
  partitionDraftStart,
  onAddPartitionDraftPoint,
  layoutDragEnabled,
  layoutRotateEnabled,
  onAddDraftPoint,
  onChangeHeight,
  onCancelDrawing,
  onCompleteDrawing,
  onCustomDrawingModeChange,
  onEditSegment,
  onLayersChange,
  onAddManualZonePoint,
  onLayoutDrag,
  onLayoutTurn,
  onToggleLayoutDrag,
  onToggleLayoutRotate,
  onLayoutEdgeOffsetChange,
  onDeleteObject,
  onEditObject,
  onDeleteOpening,
  onDeletePartition,
  onDeleteRoomArea,
  onMoveObject,
  onRotateObject,
  onMoveOpening,
  onMoveObjectOnWall,
  onMovePartition,
  onChangePartitionLength,
  onResizeOpening,
  onMoveWall,
  onMoveRoomArea,
  onMoveDraftReviewPoint,
  onMoveDraftReviewWall,
  onChangeDraftReviewSegmentLength,
  onMoveLastDraftPoint,
  onSaveRoomDimensions,
  onSaveDrawing,
  onSelectSurface,
  onSelectOpening,
  onSelectZone,
  onSelectWall,
  onSubmitSegment,
  onRenameRoomArea,
  onResetOpening,
  onSelectObject,
  onSelectPartition,
  onUndoDraftPoint,
  onViewportChange,
  onZoneShapeChange,
  onZonePolygonChange,
  showOpeningNames,
  project,
  relatedZoneWallIds,
  selectedSurfaceId,
  selectedOpeningId,
  selectedObjectId,
  selectedPartitionId,
  selectedZoneId,
  selectedWallIndex,
  viewport,
  calculationSelecting,
  calculationSelectedIds,
  onToggleCalculationSurface,
  onRunCalculation,
  onCancelCalculation,
  calculationHintVisible,
}: WorkspaceCanvasProps) {
  const holderRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(initialCanvasSize);
  const [editError, setEditError] = useState<string | null>(null);
  const [draftPointer, setDraftPointer] = useState<PointMm | null>(null);
  const [collapsedWallAreaIds, setCollapsedWallAreaIds] = useState<Set<string>>(() => new Set());
  const [measurementMode, setMeasurementMode] = useState<MeasurementMode>('room');
  const panRef = useRef<{ active: boolean; x: number; y: number }>({ active: false, x: 0, y: 0 });
  const layoutDragRef = useRef<{ active: boolean; moved: boolean; x: number; y: number }>({ active: false, moved: false, x: 0, y: 0 });
  const layoutDragPendingRef = useRef({ x: 0, y: 0 });
  const [scheduleLayoutDrag, flushLayoutDrag] = useAnimationFrameCallback<undefined>(() => {
    const delta = layoutDragPendingRef.current;
    layoutDragPendingRef.current = { x: 0, y: 0 };
    if (delta.x || delta.y) onLayoutDrag(delta.x, delta.y);
  });
  const layoutRotateRef = useRef<{
    active: boolean;
    moved: boolean;
    centerX: number;
    centerY: number;
    startAngleDeg: number;
    startTurnDeg: number;
  }>({ active: false, moved: false, centerX: 0, centerY: 0, startAngleDeg: 0, startTurnDeg: 0 });
  const layoutRotatePendingRef = useRef<number | null>(null);
  const [scheduleLayoutRotate, flushLayoutRotate] = useAnimationFrameCallback<undefined>(() => {
    const nextTurn = layoutRotatePendingRef.current;
    layoutRotatePendingRef.current = null;
    if (nextTurn !== null) onLayoutTurn(nextTurn);
  });
  const planView = useMemo(() => getPlanView(project.room.contour), [project.room.contour]);
  const wallGeometrySignature = [
    project.room.heightMm,
    ...(project.room.areas ?? []).flatMap((area) => [area.id, area.name, area.heightMm ?? '', ...area.contour.flatMap((point) => [point.x, point.y])]),
    ...project.surfaces.flatMap((surface) => [surface.id, surface.type, surface.name, surface.sourceRef ?? '', surface.widthMm, surface.heightMm]),
  ].join('|');
  const wallLayout = useMemo(() => getWallLayout(project, planView, collapsedWallAreaIds), [wallGeometrySignature, planView, collapsedWallAreaIds]);
  const wallFrames = wallLayout.frames;
  const sectionBlocks = useMemo(() => getCanvasSectionBlocks(project, planView, wallLayout), [wallGeometrySignature, planView, wallLayout]);
  const calculationPicks = useMemo(() => {
    if (!calculationSelecting) return [];
    const areas = project.room.areas ?? [{ id: 'room-1', name: 'Помещение 1', contour: project.room.contour }];
    const picks: Array<{ id: string; x: number; y: number }> = [];
    if (layers.floor) {
      areas.forEach((area, areaIndex) => {
        const id = areaIndex === 0 ? 'surface-floor' : `surface-floor-${area.id}`;
        if (!project.surfaces.some((surface) => surface.id === id)) return;
        const box = getBoundingBox(area.contour);
        picks.push({ id, x: planView.x(box.minX + box.width / 2), y: planView.y(box.minY) });
      });
    }
    if (layers.walls) {
      for (const frame of wallFrames) {
        picks.push({ id: frame.id, x: frame.x, y: frame.y });
      }
    }
    return picks;
  }, [calculationSelecting, layers.floor, layers.walls, planView, project.room.areas, project.room.contour, project.surfaces, wallFrames]);

  useEffect(() => {
    if (!calculationSelecting) return;
    setCollapsedWallAreaIds(new Set());
  }, [calculationSelecting]);

  function handleSelectSurface(surfaceId: string | null) {
    if (calculationSelecting) {
      if (surfaceId) onToggleCalculationSurface(surfaceId);
      return;
    }
    onSelectSurface(surfaceId);
  }

  function handleSelectWall(index: number | null) {
    if (calculationSelecting) {
      if (index !== null) {
        const frame = wallFrames.find((item) => item.index === index);
        if (frame) onToggleCalculationSurface(frame.id);
      }
      return;
    }
    onSelectWall(index);
  }

  function handleSelectZone(surfaceId: string, zoneId: string | null) {
    if (calculationSelecting) {
      onToggleCalculationSurface(surfaceId);
      return;
    }
    onSelectZone(surfaceId, zoneId);
  }

  function handleSelectOpening(surfaceId: string, openingId: string) {
    if (calculationSelecting) {
      onToggleCalculationSurface(surfaceId);
      return;
    }
    onSelectOpening(surfaceId, openingId);
  }
  const constrainWorkspaceViewport = (next: CanvasViewport) => constrainFreeViewport(next);
  const activeEdit = editTarget ? getInlineEdit(project, editTarget, planView, wallFrames, viewport, draftContour) : null;
  const manualZoneSurface = project.surfaces.find((surface) => surface.id === manualZoneSurfaceId);
  const manualZoneFrame = manualZoneSurface?.type === 'wall' ? wallFrames.find((frame) => frame.id === manualZoneSurfaceId) : null;
  const manualZoneView: PlanViewTransform = manualZoneFrame ? {
    scale: PX_PER_MM,
    x: (x) => manualZoneFrame.x + mmToCanvas(x), y: (y) => manualZoneFrame.y + mmToCanvas(y),
    toPoint: (x, y) => ({ x: canvasToMm(x - manualZoneFrame.x), y: canvasToMm(y - manualZoneFrame.y) }),
  } : planView;
  const dimensionArea = dimensionEntryAreaId ? project.room.areas?.find((area) => area.id === dimensionEntryAreaId) : null;
  const dimensionBox = dimensionArea ? getBoundingBox(dimensionArea.contour) : null;
  const dimensionCanvasBounds = dimensionBox ? {
    minX: planView.x(dimensionBox.minX), minY: planView.y(dimensionBox.minY),
    maxX: planView.x(dimensionBox.maxX), maxY: planView.y(dimensionBox.maxY),
  } : null;
  const framedRoomRef = useRef<string | null>(null);
  useLayoutEffect(() => {
    if (!dimensionCanvasBounds || !dimensionEntryAreaId) {
      const savedAreaId = framedRoomRef.current;
      framedRoomRef.current = null;
      // Resizing a large room temporarily pans/zooms the editor. When the
      // shape is saved, frame the committed floor once more so that it cannot
      // remain hidden above or to the left of the normal workspace.
      if (savedAreaId) {
        const savedArea = project.room.areas?.find((area) => area.id === savedAreaId);
        if (savedArea) {
          const savedBox = getBoundingBox(savedArea.contour);
          const savedBounds = {
            minX: planView.x(savedBox.minX), minY: planView.y(savedBox.minY),
            maxX: planView.x(savedBox.maxX), maxY: planView.y(savedBox.maxY),
          };
          const next = frameSavedRoom(savedBounds, size);
          const constrained = constrainFreeViewport(next);
          if (constrained.x !== viewport.x || constrained.y !== viewport.y || constrained.zoom !== viewport.zoom) onViewportChange(constrained);
        }
      }
      return;
    }
    const next = frameRoomEditor(viewport, dimensionCanvasBounds, size, framedRoomRef.current !== dimensionEntryAreaId);
    framedRoomRef.current = dimensionEntryAreaId;
    if (next !== viewport) onViewportChange(next);
    // Only committed geometry is framed, so the view stays still while a wall follows the pointer.
  }, [dimensionEntryAreaId, dimensionCanvasBounds?.minX, dimensionCanvasBounds?.minY, dimensionCanvasBounds?.maxX, dimensionCanvasBounds?.maxY, size.width, size.height, viewport, onViewportChange, project.room.areas, planView]);
  const dimensionControlStyle = dimensionBox ? {
    left: Math.max(270, Math.min(size.width - 230, Math.round(viewport.x + (planView.x(dimensionBox.maxX) + 150) * viewport.zoom))),
    top: Math.max(96, Math.min(size.height - 118, Math.round(viewport.y + planView.y(dimensionBox.minY + dimensionBox.height / 2) * viewport.zoom))),
  } : undefined;

  useEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: Math.max(300, Math.round(entry.contentRect.width)),
        height: Math.max(260, Math.round(entry.contentRect.height)),
      });
    });
    observer.observe(holder);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setEditError(null);
  }, [editTarget]);

  useEffect(() => {
    setDraftPointer(null);
  }, [manualZoneSurfaceId]);

  function startPan(event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    // "Двигать мышью" must own every pointer gesture while armed: any
    // fallthrough to the generic pan-bg branch below would pan the whole
    // plan instead of nudging the tile pattern. Whether this turns out to be
    // a drag (adjust the origin) or a plain click (exit the mode) is decided
    // in movePan/stopPan once we know if the pointer actually moved.
    if (layoutRotateEnabled && selectedSurfaceId) {
      const pointer = event.target.getStage()?.getPointerPosition();
      if (!pointer) return;
      const center = getLayoutRotationCenter({
        planView,
        project,
        selectedSurfaceId,
        selectedZoneId,
        viewport,
        wallFrames,
      });
      if (center) {
        const surface = project.surfaces.find((item) => item.id === selectedSurfaceId);
        const zone = selectedZoneId
          ? surface?.zones.find((item) => item.id === selectedZoneId)
          : surface?.zones[0];
        layoutRotateRef.current = {
          active: true,
          moved: false,
          centerX: center.x,
          centerY: center.y,
          startAngleDeg: Math.atan2(pointer.y - center.y, pointer.x - center.x) * (180 / Math.PI),
          startTurnDeg: zone?.layout.turnDeg ?? 0,
        };
        return;
      }
    }
    if (layoutDragEnabled && selectedSurfaceId) {
      const pointer = event.target.getStage()?.getPointerPosition();
      if (!pointer) return;
      layoutDragRef.current = { active: true, moved: false, x: pointer.x, y: pointer.y };
      return;
    }
    if (manualZoneSurfaceId) {
      const pointer = event.target.getStage()?.getPointerPosition();
      if (zoneDraftEditor.review || !zoneDraftEditor.armed) {
        if (pointer && event.target.name() === 'manual-zone-capture') panRef.current = { active: true, x: pointer.x, y: pointer.y };
        return;
      }
      const surface = project.surfaces.find((item) => item.id === manualZoneSurfaceId);
      if (!pointer || !surface) return;
      if (surface.type === 'floor') {
        onAddManualZonePoint(pointerToPlanPoint(pointer, viewport, planView));
      } else {
        const frame = wallFrames.find((item) => item.id === surface.id);
        if (!frame) return;
        const localX = (pointer.x - viewport.x) / viewport.zoom;
        const localY = (pointer.y - viewport.y) / viewport.zoom;
        const surfaceX = canvasToMm(localX - frame.x);
        const surfaceY = canvasToMm(localY - frame.y);
        if (surfaceX < 0 || surfaceY < 0 || surfaceX > surface.widthMm || surfaceY > surface.heightMm) return;
        onAddManualZonePoint({ x: surfaceX, y: surfaceY });
      }
      return;
    }
    if (drawingMode === 'custom-room' && drawingToolArmed) {
      const pointer = event.target.getStage()?.getPointerPosition();
      if (!pointer) return;
      onAddDraftPoint(pointerToDraftPoint(pointer, viewport, { x: PLAN_OFFSET_X, y: PLAN_OFFSET_Y }));
      return;
    }
    if (partitionDrawingActive) {
      const pointer = event.target.getStage()?.getPointerPosition();
      if (!pointer) return;
      onAddPartitionDraftPoint(pointerToDraftPoint(pointer, viewport, { x: PLAN_OFFSET_X, y: PLAN_OFFSET_Y }));
      return;
    }
    if (event.target.name() === 'pan-bg' && !calculationSelecting) onSelectSurface(null);
    if (event.target.name() !== 'pan-bg') return;
    const pointer = event.target.getStage()?.getPointerPosition();
    if (!pointer) return;
    panRef.current = { active: true, x: pointer.x, y: pointer.y };
  }

  function movePan(event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    if (manualZoneSurfaceId && zoneDraftEditor.armed && !zoneDraftEditor.review) {
      const pointer = event.target.getStage()?.getPointerPosition();
      const surface = project.surfaces.find((item) => item.id === manualZoneSurfaceId);
      if (!pointer || !surface) return;
      if (surface.type === 'floor') {
        const point = pointerToPlanPoint(pointer, viewport, planView);
        const areaId = surface.sourceRef?.split(':')[1];
        const contour = project.room.areas?.find((area) => area.id === areaId)?.contour ?? project.room.contour;
        const roundedPoint = { x: Math.round(point.x), y: Math.round(point.y) };
        const constrainedPoint = manualZonePoints.length
          ? manualZoneDrawingMode === 'orthogonal'
            ? constrainOrthogonalPoint(manualZonePoints, roundedPoint)
            : constrainFreePoint(roundedPoint, manualZonePoints)
          : roundedPoint;
        const previousPoint = manualZonePoints.at(-1);
        const previewIsInside = pointInPolygonOrBoundary(constrainedPoint, contour)
          && (!previousPoint || isSegmentInsidePolygon(contour, previousPoint, constrainedPoint));
        setDraftPointer(previewIsInside ? constrainedPoint : null);
      } else {
        const frame = wallFrames.find((item) => item.id === surface.id);
        if (!frame) return;
        const localX = (pointer.x - viewport.x) / viewport.zoom;
        const localY = (pointer.y - viewport.y) / viewport.zoom;
        const rawPoint = { x: canvasToMm(localX - frame.x), y: canvasToMm(localY - frame.y) };
        const point = manualZonePoints.length
          ? manualZoneDrawingMode === 'orthogonal'
            ? constrainOrthogonalPoint(manualZonePoints, rawPoint)
            : constrainFreePoint(rawPoint, manualZonePoints)
          : rawPoint;
        setDraftPointer(point.x >= 0 && point.y >= 0 && point.x <= surface.widthMm && point.y <= surface.heightMm ? point : null);
      }
      return;
    }
    if (drawingMode === 'custom-room' && drawingToolArmed) {
      const previewStart = draftWallStart ?? draftContour[draftContour.length - 1] ?? null;
      if (!previewStart) {
        setDraftPointer(null);
        return;
      }
      const pointer = event.target.getStage()?.getPointerPosition();
      if (!pointer) return;
      const rawPoint = pointerToDraftPoint(pointer, viewport, { x: PLAN_OFFSET_X, y: PLAN_OFFSET_Y });
      const workingPoints = draftContour.length ? draftContour : [previewStart];
      setDraftPointer(customDrawingMode === 'orthogonal' ? constrainOrthogonalPoint(workingPoints, rawPoint) : constrainFreePoint(rawPoint, workingPoints));
      return;
    }
    if (partitionDrawingActive) {
      const pointer = event.target.getStage()?.getPointerPosition();
      if (!pointer) return;
      const rawPoint = pointerToPlanPoint(pointer, viewport, planView);
      setDraftPointer(partitionDraftStart ? constrainPartitionEnd(partitionDraftStart, rawPoint) : rawPoint);
      return;
    }
    if (layoutRotateRef.current.active) {
      const pointer = event.target.getStage()?.getPointerPosition();
      if (!pointer) return;
      const session = layoutRotateRef.current;
      const dx = pointer.x - session.centerX;
      const dy = pointer.y - session.centerY;
      const moved = session.moved || Math.hypot(dx, dy) > 8;
      const currentAngleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
      layoutRotateRef.current = { ...session, moved };
      if (moved && Math.hypot(dx, dy) >= 8) {
        layoutRotatePendingRef.current = session.startTurnDeg + currentAngleDeg - session.startAngleDeg;
        scheduleLayoutRotate(undefined);
      }
      return;
    }
    if (layoutDragRef.current.active) {
      const pointer = event.target.getStage()?.getPointerPosition();
      if (!pointer) return;
      const dx = pointer.x - layoutDragRef.current.x;
      const dy = pointer.y - layoutDragRef.current.y;
      const moved = layoutDragRef.current.moved || Math.abs(dx) > 2 || Math.abs(dy) > 2;
      layoutDragRef.current = { active: true, moved, x: pointer.x, y: pointer.y };
      const deltaXmm = Math.round(dx / (PX_PER_MM * viewport.zoom));
      const deltaYmm = Math.round(dy / (PX_PER_MM * viewport.zoom));
      if (deltaXmm || deltaYmm) {
        layoutDragPendingRef.current.x += deltaXmm;
        layoutDragPendingRef.current.y += deltaYmm;
        scheduleLayoutDrag(undefined);
      }
      return;
    }
    if (!panRef.current.active) return;
    const pointer = event.target.getStage()?.getPointerPosition();
    if (!pointer) return;
    const dx = pointer.x - panRef.current.x;
    const dy = pointer.y - panRef.current.y;
    panRef.current = { active: true, x: pointer.x, y: pointer.y };
    onViewportChange(constrainWorkspaceViewport(panViewport(viewport, dx, dy)));
  }

  function stopPan() {
    panRef.current.active = false;
    // A plain click (mousedown+mouseup with no real movement) while "Двигать
    // мышью" is armed means the user clicked elsewhere on the plan rather
    // than dragging the pattern — exit the mode instead of leaving it stuck on.
    if (layoutRotateRef.current.active && !layoutRotateRef.current.moved) onToggleLayoutRotate(false);
    layoutRotateRef.current.active = false;
    if (layoutRotatePendingRef.current !== null) flushLayoutRotate(undefined);
    if (layoutDragRef.current.active && !layoutDragRef.current.moved) onToggleLayoutDrag(false);
    layoutDragRef.current.active = false;
    if (layoutDragPendingRef.current.x || layoutDragPendingRef.current.y) {
      flushLayoutDrag(undefined);
    }
  }

  function commitActiveEdit(value: string) {
    if (!activeEdit) return;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < activeEdit.min || parsed > activeEdit.max) {
      setEditError(`Введите целое число от ${activeEdit.min} до ${activeEdit.max}.`);
      return;
    }

    if (activeEdit.target.type === 'layout-offset') {
      onLayoutEdgeOffsetChange(activeEdit.target.surfaceId, activeEdit.target.zoneId, activeEdit.target.edge, parsed);
    } else if (activeEdit.target.type === 'wall-height') {
      onChangeHeight(activeEdit.target.areaId, String(parsed));
    } else if (activeEdit.target.type === 'partition-length') {
      if (!onChangePartitionLength(activeEdit.target.partitionId, String(parsed))) {
        setEditError('Такая длина не помещается. Уменьшите её или переместите перегородку.');
        return;
      }
    } else if (activeEdit.target.type === 'partition-distance') {
      const { partitionId } = activeEdit.target;
      const partition = project.room.partitions?.find((item) => item.id === partitionId);
      const contour = project.room.areas?.find((area) => area.id === partition?.areaId)?.contour;
      const position = partition && contour ? getPartitionPositionForDistance(contour, partition, activeEdit.target.edge, parsed, project.room.partitions ?? []) : null;
      if (!position) {
        setEditError('Такой отступ не помещается: перегородка выйдет за стену или пересечёт другую перегородку.');
        return;
      }
      onMovePartition(activeEdit.target.partitionId, position.start, position.end);
    } else if (activeEdit.target.type === 'object-distance') {
      const position = getRoomObjectPositionForDistance(project, activeEdit.target, parsed);
      if (!position) {
        setEditError('Не удалось рассчитать положение объекта.');
        return;
      }
      onMoveObject(activeEdit.target.objectId, position.xMm, position.yMm, position.areaId);
    } else if (activeEdit.target.type === 'opening-distance') {
      const target = activeEdit.target;
      const opening = project.room.openings?.find((item) => item.id === target.openingId);
      const surface = opening ? project.surfaces.find((item) => item.id === opening.surfaceId) : null;
      if (!opening || !surface) {
        setEditError('Не удалось найти проём или стену.');
        return;
      }
      const xMm = target.edge === 'start'
        ? parsed
        : surface.widthMm - opening.widthMm - parsed;
      onMoveOpening(opening.id, xMm, opening.yMm);
    } else if (activeEdit.target.type === 'zone-draft-segment') {
      if (!zoneDraftEditor.onChangeSegment(activeEdit.target.index, parsed)) { setEditError('Размер не помещается на выбранной плоскости или приводит к пересечению сторон.'); return; }
    } else if (activeEdit.target.type === 'draft-segment') {
      if (!onChangeDraftReviewSegmentLength(activeEdit.target.index, parsed)) return;
    } else {
      onSubmitSegment(activeEdit.target, String(parsed));
    }
    setEditError(null);
    onEditSegment(null);
  }

  const canvasClassName = manualZoneSurfaceId
    ? 'canvas-card zone-drawing-active'
    : (drawingMode === 'custom-room' && draftWallStart) || (partitionDrawingActive && partitionDraftStart)
      ? 'canvas-card drawing-line-active'
      : layoutRotateEnabled
        ? 'canvas-card layout-rotate-active'
        : layoutDragEnabled
          ? 'canvas-card layout-drag-active'
          : calculationSelecting
            ? 'canvas-card calculation-selecting'
            : 'canvas-card';

  return (
    <div className={canvasClassName}>
      <div className="canvas-top-bar">
        <div className="canvas-layer-controls">
          <label>
            <input type="checkbox" checked={layers.floor} onChange={(event) => onLayersChange({ ...layers, floor: event.target.checked })} />
            Пол
          </label>
          <label>
            <input type="checkbox" checked={layers.walls} onChange={(event) => onLayersChange({ ...layers, walls: event.target.checked })} />
            Стены
          </label>
          <label>
            <input type="checkbox" checked={layers.dimensions} onChange={(event) => onLayersChange({ ...layers, dimensions: event.target.checked })} />
            Размеры
          </label>
          <select aria-label="Вид размеров" value={measurementMode} disabled={!layers.dimensions} onChange={(event) => setMeasurementMode(event.target.value as MeasurementMode)}>
            <option value="room">Размеры помещения</option>
            <option value="tile">Отступы плитки</option>
            <option value="objects">Расстояния между объектами</option>
          </select>
        </div>
        {calculationSelecting ? (
          <div className="canvas-calculation-actions">
            <div className="canvas-calculation-hint">
              <strong>Выберите, что считать</strong>
              <span>{calculationSelectedIds.size ? `Отмечено элементов: ${calculationSelectedIds.size}. Нажмите «Рассчитать».` : 'Поставьте галочки у нужного пола и стен.'}</span>
            </div>
            <button type="button" className="primary-button" disabled={!calculationSelectedIds.size} onClick={onRunCalculation}>Рассчитать</button>
            <button type="button" className="tool-button" onClick={onCancelCalculation}>Отмена</button>
          </div>
        ) : drawingMode === 'custom-room' ? (
          <div className="canvas-draw-hint">
            <strong>Новый контур</strong>
            <span>{customDrawingMode === 'orthogonal' ? 'Стена: только горизонтально или вертикально.' : 'Диагональ: свободное направление без пересечений.'}</span>
          </div>
        ) : null}
        {drawingMode === 'custom-room-review' ? (
          <div className="canvas-draw-hint">
            <strong>Проверка помещения</strong>
            <span>{draftContour.every((point, index) => {
              const next = draftContour[(index + 1) % draftContour.length];
              return point.x === next.x || point.y === next.y;
            }) ? 'Тяните стены. Прямые углы сохраняются.' : 'Тяните нужную точку. Остальные точки остаются на месте.'}</span>
          </div>
        ) : null}
        <div className="canvas-toolbar">
          <button type="button" aria-label="Уменьшить" onClick={() => onViewportChange(constrainWorkspaceViewport(changeCanvasZoom(viewport, viewport.zoom - 0.15)))}>
            <Minus size={16} />
          </button>
          <span>{Math.round(viewport.zoom * 100)}%</span>
          <button type="button" aria-label="Увеличить" onClick={() => onViewportChange(constrainWorkspaceViewport(changeCanvasZoom(viewport, viewport.zoom + 0.15)))}>
            <Plus size={16} />
          </button>
          <button type="button" aria-label="Вписать" onClick={() => onViewportChange(dimensionCanvasBounds ? frameRoomEditor(resetViewport(), dimensionCanvasBounds, size, true) : resetViewport())}>
            <Maximize2 size={16} />
          </button>
        </div>
      </div>
      <div className="canvas-stage-holder" ref={holderRef}>
      <Stage
        width={size.width}
        height={size.height}
        className="konva-stage"
        onMouseDown={startPan}
        onMouseMove={movePan}
        onMouseUp={stopPan}
        onMouseLeave={() => {
          stopPan();
          setDraftPointer(null);
        }}
        onTouchStart={startPan}
        onTouchMove={movePan}
        onTouchEnd={stopPan}
        onWheel={(event) => {
          event.evt.preventDefault();
          onViewportChange(constrainWorkspaceViewport(changeCanvasZoom(viewport, viewport.zoom + (event.evt.deltaY > 0 ? -0.08 : 0.08))));
        }}
      >
        <Layer>
          <Rect name="pan-bg" x={0} y={0} width={size.width} height={size.height} fill="#FBFBFC" />
          <Group x={viewport.x} y={viewport.y} scaleX={viewport.zoom} scaleY={viewport.zoom} listening={false}>
            {drawingMode === 'idle' && layers.floor ? <Rect {...sectionBlocks.floor} fillEnabled={false} stroke="rgba(96, 65, 126, 0.6)" strokeWidth={1.5} cornerRadius={12} /> : null}
            {drawingMode === 'idle' && layers.walls && !dimensionEntryAreaId ? <Rect {...sectionBlocks.walls} fillEnabled={false} stroke="rgba(96, 65, 126, 0.6)" strokeWidth={1.5} cornerRadius={12} /> : null}
          </Group>
          {layers.grid ? <Grid width={size.width} height={size.height} viewport={viewport} /> : null}
          <Group x={viewport.x} y={viewport.y} scaleX={viewport.zoom} scaleY={viewport.zoom}>
            {drawingMode === 'custom-room' ? <DraftContourLayer canResizeLastPoint={!draftWallStart && draftContour.length >= 2} onLastPointMove={onMoveLastDraftPoint} points={draftContour} previewPoint={draftPointer} previewStart={draftWallStart ?? (drawingToolArmed ? draftContour[draftContour.length - 1] ?? null : null)} /> : null}
            {drawingMode === 'custom-room-review' ? <DraftReviewLayer onEditSegment={(index) => onEditSegment({ type: 'draft-segment', index })} onPointMove={onMoveDraftReviewPoint} onWallMove={onMoveDraftReviewWall} points={draftContour} showHeading={false} /> : null}
            {drawingMode === 'idle' && layers.floor ? (
              <FloorLayer
                block={sectionBlocks.floor}
                dimensionEntryAreaId={dimensionEntryAreaId}
                dimensionsVisible={layers.dimensions && measurementMode === 'room' && (Boolean(selectedSurfaceId) || Boolean(dimensionEntryAreaId))}
                measurementMode={layers.dimensions ? measurementMode : null}
                hideOpenings={hideFloorOpenings}
                showOpeningNames={showOpeningNames}
                onEditSegment={onEditSegment}
                onMoveWall={onMoveWall}
                onMoveRoomArea={onMoveRoomArea}
                onDeleteObject={onDeleteObject}
                onEditObject={onEditObject}
                onMoveObject={onMoveObject}
                onMoveOpening={onMoveOpening}
                onRotateObject={onRotateObject}
                onSelectObject={onSelectObject}
                onDeletePartition={onDeletePartition}
                onDeleteRoomArea={onDeleteRoomArea}
                onMovePartition={onMovePartition}
                onSelectPartition={onSelectPartition}
                onSelectSurface={handleSelectSurface}
                onSelectOpening={handleSelectOpening}
                onSelectZone={handleSelectZone}
                onSelectWall={handleSelectWall}
                onEditLayoutOffset={onEditSegment}
                onZoneShapeChange={onZoneShapeChange}
                onZonePolygonChange={onZonePolygonChange}
                project={project}
                roomMoveEnabled={!calculationSelecting && activePanelTab !== 'zones' && activePanelTab !== 'objects' && !selectedObjectId && !selectedOpeningId && !selectedPartitionId && !dimensionEntryAreaId && !partitionDrawingActive && !selectedZoneId && !manualZoneSurfaceId && !layoutDragEnabled && !layoutRotateEnabled}
                selectedSurfaceId={selectedSurfaceId}
                selectedOpeningId={selectedOpeningId}
                selectedObjectId={selectedObjectId}
                selectedPartitionId={selectedPartitionId}
                selectedZoneId={selectedZoneId}
                selectedWallIndex={selectedWallIndex}
                calculationSelecting={calculationSelecting}
                calculationSelectedIds={calculationSelectedIds}
                view={planView}
              />
            ) : null}
            {drawingMode === 'idle' && partitionDrawingActive ? <PartitionDraftLayer end={partitionDraftStart ? draftPointer : null} start={partitionDraftStart} view={planView} /> : null}
            {drawingMode === 'idle' && layers.walls && !dimensionEntryAreaId ? (
              <WallsLayer
                block={sectionBlocks.walls}
                dimensionsVisible={layers.dimensions && measurementMode === 'room' && Boolean(selectedSurfaceId)}
                tileOffsetsVisible={layers.dimensions && measurementMode === 'tile' && Boolean(selectedSurfaceId)}
                objectDistancesVisible={layers.dimensions && measurementMode === 'objects'}
                frames={wallFrames}
                sections={wallLayout.sections}
                onChangeHeight={onChangeHeight}
                onEditSegment={onEditSegment}
                onDeleteOpening={onDeleteOpening}
                onMoveOpening={onMoveOpening}
                onResizeOpening={onResizeOpening}
                onSelectWall={handleSelectWall}
                onSelectOpening={handleSelectOpening}
                onSelectZone={handleSelectZone}
                onEditLayoutOffset={onEditSegment}
                onZonePolygonChange={onZonePolygonChange}
                onZoneShapeChange={onZoneShapeChange}
                onResetOpening={onResetOpening}
                onRenameArea={onRenameRoomArea}
                onDeleteObject={onDeleteObject}
                onEditObject={onEditObject}
                onMoveObjectOnWall={onMoveObjectOnWall}
                onSelectObject={onSelectObject}
                project={project}
                relatedZoneWallIds={relatedZoneWallIds}
                selectedSurfaceId={selectedSurfaceId}
                selectedOpeningId={selectedOpeningId}
                selectedObjectId={selectedObjectId}
                selectedZoneId={selectedZoneId}
                selectedWallIndex={selectedWallIndex}
                calculationSelecting={calculationSelecting}
                calculationSelectedIds={calculationSelectedIds}
                onToggleArea={(areaId) => {
                  setCollapsedWallAreaIds((current) => {
                    const next = new Set(current);
                    if (next.has(areaId)) next.delete(areaId);
                    else next.add(areaId);
                    return next;
                  });
                }}
                showOpeningNames={showOpeningNames}
              />
            ) : null}
            {manualZoneSurfaceId ? (
              <Rect
                name="manual-zone-capture"
                x={-viewport.x / viewport.zoom}
                y={-viewport.y / viewport.zoom}
                width={size.width / viewport.zoom}
                height={size.height / viewport.zoom}
                fill="rgba(255, 255, 255, 0.001)"
              />
            ) : null}
            {manualZoneSurfaceId ? zoneDraftEditor.review ? (
              <DraftReviewLayer points={manualZonePoints} view={manualZoneView} showHeading={false}
                onEditSegment={(index) => {
                  const start = manualZonePoints[index];
                  const end = manualZonePoints[(index + 1) % manualZonePoints.length];
                  const a = { x: manualZoneView.x(start.x), y: manualZoneView.y(start.y) };
                  const b = { x: manualZoneView.x(end.x), y: manualZoneView.y(end.y) };
                  onEditSegment({ type: 'zone-draft-segment', index, value: segmentLength(start, end), position: { x: (a.x + b.x) / 2, y: getDraftLengthLabelY(a, b) } });
                }}
                onPointMove={(index, point) => zoneDraftEditor.onChangePoints(manualZonePoints.map((current, i) => i === index ? { x: Math.round(point.x), y: Math.round(point.y) } : current))}
                onWallMove={(index, deltaXmm, deltaYmm) => zoneDraftEditor.onChangePoints(moveWall(manualZonePoints, index, manualZonePoints[index].y === manualZonePoints[(index + 1) % manualZonePoints.length].y ? deltaYmm : deltaXmm))}
              />
            ) : <ManualZoneDraftLayer frames={wallFrames} mode={manualZoneDrawingMode} points={manualZonePoints} previewPoint={zoneDraftEditor.armed && !isExplicitlyClosedContour(manualZonePoints) ? draftPointer : null} surface={manualZoneSurface} view={planView} /> : null}
          </Group>
        </Layer>
      </Stage>

      {calculationSelecting && calculationHintVisible ? (
        <div className="calculation-select-banner" role="status">
          <strong>Отметьте пол и стены на схеме</strong>
          <span>{calculationSelectedIds.size ? `Выбрано: ${calculationSelectedIds.size}. Когда всё нужное отмечено — нажмите «Рассчитать» сверху.` : 'Рядом с полом и каждой стеной появились галочки. Отметьте только те элементы, которые нужно посчитать, затем нажмите «Рассчитать».'}</span>
        </div>
      ) : null}

      {calculationSelecting ? (
        <div className="calculation-picks">
          {calculationPicks.map((pick) => {
            const checked = calculationSelectedIds.has(pick.id);
            return (
              <label
                key={pick.id}
                className={checked ? 'calculation-pick checked' : 'calculation-pick'}
                style={{
                  left: viewport.x + pick.x * viewport.zoom,
                  top: viewport.y + pick.y * viewport.zoom,
                }}
                onMouseDown={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleCalculationSurface(pick.id)}
                  aria-label="Включить в расчёт"
                />
              </label>
            );
          })}
        </div>
      ) : null}

      {manualZoneSurfaceId ? (
        <div className={`manual-zone-controls canvas-manual-zone-controls drawing-room-controls${zoneDraftEditor.review ? ' drawing-review-controls drawing-zone-review-controls' : ''}`}>
          <span>{zoneDraftEditor.review ? 'Проверьте зону: тяните стороны или точки, нажмите на размер для ввода.' : !zoneDraftEditor.armed ? 'Режим перемещения чертежа' : `Рисуйте зону на выбранной плоскости · ${manualZonePoints.length} точ.`}</span>
          {zoneDraftEditor.review ? <>
            <button type="button" className="secondary" onClick={zoneDraftEditor.onBack}>К рисованию</button>
            <button type="button" className="zone-finish ready" onClick={onFinishManualZone}>Сохранить зону</button>
          </> : <>
            <button type="button" className={zoneDraftEditor.armed && manualZoneDrawingMode === 'orthogonal' ? 'active' : ''} onClick={() => onManualZoneDrawingModeChange('orthogonal')}>Прямая линия</button>
            <button type="button" className={zoneDraftEditor.armed && manualZoneDrawingMode === 'free' ? 'active' : ''} onClick={() => onManualZoneDrawingModeChange('free')}>Линия под углом</button>
            <button type="button" className={manualZonePoints.length >= 3 ? 'zone-finish ready' : 'zone-finish'} disabled={manualZonePoints.length < 3} onClick={onFinishManualZone}>Завершить построение</button>
            <button type="button" className="secondary" disabled={!zoneDraftEditor.canUndo} onClick={onUndoManualZonePoint}>Отменить действие</button>
          </>}
          <button type="button" className="zone-cancel" onClick={onCancelManualZone}>{zoneDraftEditor.review ? 'Отмена' : 'Сброс всего'}</button>
          {drawingError ? <em>{drawingError}</em> : null}
        </div>
      ) : null}

      {partitionDrawingActive && !partitionDraftStart ? (
        <div className="partition-drawing-hint">Кликните у стены, чтобы<br />начать перегородку</div>
      ) : null}

      {dimensionEntryAreaId && drawingMode === 'idle' ? (
        <div className="room-dimension-controls" style={dimensionControlStyle}>
          <div><strong>Сохранить форму</strong><span>Проверьте размеры стен. После сохранения форму изменить нельзя.</span>{dimensionEntryError ? <em>{dimensionEntryError}</em> : null}</div>
          <button type="button" onClick={onSaveRoomDimensions}>Сохранить</button>
        </div>
      ) : null}

      {drawingMode === 'custom-room' ? (
        <div className="manual-zone-controls canvas-manual-zone-controls drawing-room-controls">
          <span>{!drawingToolArmed && draftContour.length ? 'Режим перемещения: двигайте весь чертёж мышью' : draftContour.length ? `Стройте контур отдельными точками · ${draftContour.length} точ.` : 'Кликните, чтобы поставить начало стены'}</span>
          <button type="button" className={drawingToolArmed && customDrawingMode === 'orthogonal' ? 'active' : ''} onClick={() => onCustomDrawingModeChange('orthogonal')}>Нарисовать стену</button>
          <button type="button" className={drawingToolArmed && customDrawingMode === 'free' ? 'active' : ''} onClick={() => onCustomDrawingModeChange('free')}>Стена под углом</button>
          <button type="button" className={canCompleteDrawing ? 'zone-finish ready' : 'zone-finish'} onClick={onCompleteDrawing} disabled={!canCompleteDrawing}>
            Завершить построение
          </button>
          <button type="button" className="secondary" onClick={onUndoDraftPoint} disabled={draftContour.length === 0 && !draftWallStart}>
            Отменить действие
          </button>
          <button type="button" className="zone-cancel" onClick={onCancelDrawing}>
            Сброс всего
          </button>
          {drawingError ? <em>{drawingError}</em> : null}
        </div>
      ) : null}

      {drawingMode === 'custom-room-review' ? (
        <div className="manual-zone-controls canvas-manual-zone-controls drawing-room-controls drawing-review-controls">
          <span>Проверьте размеры. Стены и отдельные точки можно перетаскивать.</span>
          {drawingError ? <em>{drawingError}</em> : null}
          <button type="button" className="zone-finish ready" onClick={onSaveDrawing}>Сохранить</button>
          <button type="button" className="zone-cancel" onClick={onCancelDrawing}>Отмена</button>
        </div>
      ) : null}

      {activeEdit ? (
        <form
          className="inline-dimension-editor"
          style={{ left: activeEdit.left, top: activeEdit.top }}
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const value = String(data.get('value') ?? activeEdit.value);
            commitActiveEdit(value);
          }}
        >
          <input
            name="value"
            type="number"
            min={activeEdit.min}
            max={activeEdit.max}
            step={1}
            defaultValue={activeEdit.value}
            autoFocus
            onBlur={(event) => commitActiveEdit(event.currentTarget.value)}
            onFocus={(event) => event.currentTarget.select()}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitActiveEdit(event.currentTarget.value);
              }
              if (event.key === 'Escape') {
                event.preventDefault();
                setEditError(null);
                onEditSegment(null);
              }
            }}
          />
          {editError ? <em>{editError}</em> : null}
        </form>
      ) : null}
      </div>
    </div>
  );
}

const Grid = memo(function Grid({ width, height, viewport }: { width: number; height: number; viewport: CanvasViewport }) {
  const minorStep = Math.max(8, gridPxForMm(MINOR_GRID_MM) * viewport.zoom);
  const majorEvery = MM_PER_MAJOR_GRID / MINOR_GRID_MM;
  const verticalStart = ((viewport.x % minorStep) + minorStep) % minorStep;
  const horizontalStart = ((viewport.y % minorStep) + minorStep) % minorStep;
  const renderGridLines = (major: boolean) => (
    <Shape
      listening={false}
      perfectDrawEnabled={false}
      stroke={major ? '#C4C4D1' : '#E4E4EA'}
      strokeWidth={major ? 1.25 : 1}
      sceneFunc={(context, shape) => {
        context.beginPath();
        let verticalIndex = Math.round((verticalStart - viewport.x) / minorStep);
        for (let x = verticalStart; x <= width; x += minorStep, verticalIndex += 1) {
          if ((verticalIndex % majorEvery === 0) !== major) continue;
          const alignedX = Math.round(x) + 0.5;
          context.moveTo(alignedX, 0);
          context.lineTo(alignedX, height);
        }
        let horizontalIndex = Math.round((horizontalStart - viewport.y) / minorStep);
        for (let y = horizontalStart; y <= height; y += minorStep, horizontalIndex += 1) {
          if ((horizontalIndex % majorEvery === 0) !== major) continue;
          const alignedY = Math.round(y) + 0.5;
          context.moveTo(0, alignedY);
          context.lineTo(width, alignedY);
        }
        context.strokeShape(shape);
      }}
    />
  );
  return <>{renderGridLines(false)}{renderGridLines(true)}</>;
});

function DraftContourLayer({ canResizeLastPoint, onLastPointMove, points, previewPoint, previewStart }: { canResizeLastPoint: boolean; onLastPointMove: (point: PointMm) => PointMm | null; points: PointMm[]; previewPoint: PointMm | null; previewStart: PointMm | null }) {
  const canvasPoints = points.map(pointToCanvasPoint);
  const linePoints = canvasPoints.flatMap((point) => [point.x, point.y]);
  const previousPoint = previewStart;
  const previewCanvasPoint = previewPoint ? pointToCanvasPoint(previewPoint) : null;
  const previewValidationPoints = points.length ? points : previewStart ? [previewStart] : [];
  const previewError = previousPoint && previewPoint ? validateDraftPoint(previewValidationPoints, previewPoint) : null;

  return (
    <Group>
      {points.length > 1 ? <Line points={linePoints} stroke="#8A6AAE" strokeWidth={5} lineCap="round" lineJoin="round" /> : null}
      {points.slice(0, -1).map((point, index) => {
        const next = points[index + 1];
        const start = pointToCanvasPoint(point);
        const end = pointToCanvasPoint(next);
        return <DraftLengthLabel key={`length-${index}`} x={(start.x + end.x) / 2} y={getDraftLengthLabelY(start, end)} text={formatDraftLengthMm(point, next)} />;
      })}
      {previousPoint && previewPoint && previewCanvasPoint && (previousPoint.x !== previewPoint.x || previousPoint.y !== previewPoint.y) ? (
        <Group>
          {points.length >= 3 && (previewPoint.x === points[0].x || previewPoint.y === points[0].y) ? (
            <Line
              points={[previewCanvasPoint.x, previewCanvasPoint.y, pointToCanvasPoint(points[0]).x, pointToCanvasPoint(points[0]).y]}
              stroke="#A385C4"
              strokeWidth={1.5}
              dash={[6, 6]}
              opacity={0.7}
            />
          ) : null}
          <Line
            points={[...Object.values(pointToCanvasPoint(previousPoint)), previewCanvasPoint.x, previewCanvasPoint.y]}
            stroke={previewError ? '#C85B72' : '#A385C4'}
            strokeWidth={4}
            dash={[10, 7]}
            lineCap="round"
          />
          <DraftLengthLabel
            error={Boolean(previewError)}
            x={(pointToCanvasPoint(previousPoint).x + previewCanvasPoint.x) / 2}
            y={getDraftLengthLabelY(pointToCanvasPoint(previousPoint), previewCanvasPoint)}
            text={formatDraftLengthMm(previousPoint, previewPoint)}
          />
          <Circle
            x={previewCanvasPoint.x}
            y={previewCanvasPoint.y}
            radius={7}
            fill="#8A6AAE"
            stroke="#FFFFFF"
            strokeWidth={2}
            shadowColor="rgba(111, 79, 147, 0.38)"
            shadowBlur={8}
          />
        </Group>
      ) : null}
      {canvasPoints.map((point, index) => (
        <Circle
          key={`draft-point-${index}`}
          x={point.x}
          y={point.y}
          radius={canResizeLastPoint && index === canvasPoints.length - 1 ? 9 : 7}
          fill="#8A6AAE"
          stroke={canResizeLastPoint && index === canvasPoints.length - 1 ? '#FFFFFF' : undefined}
          strokeWidth={2}
          shadowColor="rgba(111, 79, 147, 0.38)"
          shadowBlur={canResizeLastPoint && index === canvasPoints.length - 1 ? 8 : 0}
          draggable={canResizeLastPoint && index === canvasPoints.length - 1}
          onMouseEnter={(event) => {
            if (!canResizeLastPoint || index !== canvasPoints.length - 1) return;
            const container = event.target.getStage()?.container();
            if (container) container.style.cursor = 'grab';
          }}
          onMouseLeave={(event) => {
            const container = event.target.getStage()?.container();
            if (container) container.style.cursor = '';
          }}
          onDragMove={(event) => {
            if (!canResizeLastPoint || index !== canvasPoints.length - 1) return;
            const node = event.target;
            const acceptedPoint = onLastPointMove({
              x: canvasToMm(node.x() - PLAN_OFFSET_X),
              y: canvasToMm(node.y() - PLAN_OFFSET_Y),
            });
            node.position(acceptedPoint ? pointToCanvasPoint(acceptedPoint) : point);
          }}
        />
      ))}
      {previewStart && !points.some((point) => point.x === previewStart.x && point.y === previewStart.y) ? (
        <Circle {...pointToCanvasPoint(previewStart)} radius={7} fill="#8A6AAE" />
      ) : null}
    </Group>
  );
}

function DraftReviewLayer({ onEditSegment, onPointMove, onWallMove, points, showHeading = true, view = { scale: PX_PER_MM, x: (x) => PLAN_OFFSET_X + mmToCanvas(x), y: (y) => PLAN_OFFSET_Y + mmToCanvas(y), toPoint: (x, y) => ({ x: canvasToMm(x - PLAN_OFFSET_X), y: canvasToMm(y - PLAN_OFFSET_Y) }) } }: { onEditSegment: (index: number) => void; onPointMove: (index: number, point: PointMm) => boolean; onWallMove: (index: number, deltaXmm: number, deltaYmm: number) => boolean; points: PointMm[]; showHeading?: boolean; view?: PlanViewTransform }) {
  const wallDragOffsets = useRef<Record<number, { x: number; y: number }>>({});
  const toCanvas = (point: PointMm) => ({ x: view.x(point.x), y: view.y(point.y) });
  const canvasPoints = points.map(toCanvas);
  const orthogonal = points.every((point, index) => {
    const next = points[(index + 1) % points.length];
    return point.x === next.x || point.y === next.y;
  });
  return (
    <Group onMouseDown={(event) => { event.cancelBubble = true; }} onTouchStart={(event) => { event.cancelBubble = true; }}>
      {showHeading ? <><Text x={54} y={54} text="Проверка помещения" fill="#6B6B80" fontSize={18} />
      <Text x={54} y={82} text={orthogonal ? 'Тяните стены. Прямые углы сохраняются.' : 'Тяните нужную точку. Остальные точки остаются на месте.'} fill="#8F8FA3" fontSize={14} /></> : null}
      <Line points={canvasPoints.flatMap((point) => [point.x, point.y])} closed fill="#F2EBF9" stroke="#8A6AAE" strokeWidth={5} lineJoin="round" />
      {points.map((point, index) => {
        const next = points[(index + 1) % points.length];
        const startCanvas = toCanvas(point);
        const endCanvas = toCanvas(next);
        const horizontal = point.y === next.y;
        return (
          <Group key={`review-wall-${index}`}>
            <DraftLengthLabel onClick={() => onEditSegment(index)} x={(startCanvas.x + endCanvas.x) / 2} y={getDraftLengthLabelY(startCanvas, endCanvas)} text={formatDraftLengthMm(point, next)} />
            <Line
              points={[startCanvas.x, startCanvas.y, endCanvas.x, endCanvas.y]}
              stroke="transparent"
              strokeWidth={24}
              draggable={orthogonal}
              listening={orthogonal}
              onDragStart={() => {
                wallDragOffsets.current[index] = { x: 0, y: 0 };
              }}
              onDragMove={(event) => {
                if (!orthogonal) return;
                const node = event.currentTarget;
                node.position(horizontal ? { x: 0, y: node.y() } : { x: node.x(), y: 0 });
                const previous = wallDragOffsets.current[index] ?? { x: 0, y: 0 };
                const current = { x: node.x(), y: node.y() };
                const deltaXmm = (current.x - previous.x) / view.scale;
                const deltaYmm = (current.y - previous.y) / view.scale;
                if (deltaXmm || deltaYmm) {
                  onWallMove(index, deltaXmm, deltaYmm);
                  wallDragOffsets.current[index] = current;
                }
              }}
              onMouseEnter={(event) => {
                const container = event.target.getStage()?.container();
                if (container) container.style.cursor = orthogonal ? (horizontal ? 'ns-resize' : 'ew-resize') : 'move';
              }}
              onMouseLeave={(event) => {
                const container = event.target.getStage()?.container();
                if (container) container.style.cursor = '';
              }}
              onDragEnd={(event) => {
                const node = event.currentTarget;
                const previous = wallDragOffsets.current[index] ?? { x: 0, y: 0 };
                const deltaXmm = (node.x() - previous.x) / view.scale;
                const deltaYmm = (node.y() - previous.y) / view.scale;
                node.position({ x: 0, y: 0 });
                delete wallDragOffsets.current[index];
                if (deltaXmm || deltaYmm) onWallMove(index, deltaXmm, deltaYmm);
              }}
            />
          </Group>
        );
      })}
      {canvasPoints.map((canvasPoint, index) => (
        <Circle
          key={`review-point-${index}`}
          x={canvasPoint.x}
          y={canvasPoint.y}
          radius={9}
          fill="#8A6AAE"
          stroke="#FFFFFF"
          strokeWidth={2}
          shadowColor="rgba(111, 79, 147, 0.40)"
          shadowBlur={8}
          draggable={!orthogonal}
          listening={!orthogonal}
          onMouseEnter={(event) => {
            const container = event.target.getStage()?.container();
            if (container) container.style.cursor = 'grab';
          }}
          onMouseLeave={(event) => {
            const container = event.target.getStage()?.container();
            if (container) container.style.cursor = '';
          }}
          onDragMove={(event) => {
            if (orthogonal) return;
            const node = event.currentTarget;
            const accepted = onPointMove(index, view.toPoint(node.x(), node.y()));
            if (!accepted) node.position(canvasPoint);
          }}
          onDragEnd={(event) => {
            if (orthogonal) return;
            const node = event.currentTarget;
            const accepted = onPointMove(index, view.toPoint(node.x(), node.y()));
            if (!accepted) node.position(canvasPoint);
          }}
        />
      ))}
    </Group>
  );
}

function PartitionDraftLayer({ end, start, view }: { end: PointMm | null; start: PointMm | null; view: PlanViewTransform }) {
  if (!start) return null;
  const startCanvas = { x: view.x(start.x), y: view.y(start.y) };
  const endCanvas = end ? { x: view.x(end.x), y: view.y(end.y) } : null;
  return (
    <Group>
      <Circle x={startCanvas.x} y={startCanvas.y} radius={7} fill="#8A6AAE" stroke="#FFFFFF" strokeWidth={2} />
      {end && endCanvas ? (
        <Group>
          <Line points={[startCanvas.x, startCanvas.y, endCanvas.x, endCanvas.y]} stroke="#A385C4" strokeWidth={4} dash={[10, 7]} lineCap="round" />
          <DraftLengthLabel x={(startCanvas.x + endCanvas.x) / 2} y={getDraftLengthLabelY(startCanvas, endCanvas)} text={formatDraftLengthMm(start, end)} />
          <Circle x={endCanvas.x} y={endCanvas.y} radius={7} fill="#8A6AAE" stroke="#FFFFFF" strokeWidth={2} shadowColor="rgba(111, 79, 147, 0.38)" shadowBlur={8} />
        </Group>
      ) : null}
    </Group>
  );
}

function ManualZoneDraftLayer({ frames, mode, points, previewPoint, surface, view }: { frames: WallFrame[]; mode: CustomDrawingMode; points: PointMm[]; previewPoint: PointMm | null; surface: TileProject['surfaces'][number] | undefined; view: PlanViewTransform }) {
  if (!surface) return null;
  const frame = surface.type === 'wall' ? frames.find((item) => item.id === surface.id) : null;
  const toCanvas = (point: PointMm) => frame
    ? { x: frame.x + mmToCanvas(point.x), y: frame.y + mmToCanvas(point.y) }
    : { x: view.x(point.x), y: view.y(point.y) };
  const canvasPoints = points.map(toCanvas);
  const previewCanvas = previewPoint ? toCanvas(previewPoint) : null;
  const displayPoints = previewPoint ? [...canvasPoints, previewCanvas!] : canvasPoints;
  const linePoints = displayPoints.flatMap((point) => [point.x, point.y]);
  return (
    <Group listening={false}>
      {displayPoints.length > 1 ? <Line points={linePoints} closed={false} fill={points.length >= 3 && !previewPoint ? 'rgba(139, 83, 184, 0.18)' : undefined} stroke="#7B43AF" strokeWidth={4} dash={previewPoint ? [9, 6] : undefined} lineCap="round" lineJoin="round" /> : null}
      {points.slice(0, -1).map((point, index) => {
        const next = points[index + 1];
        const startCanvas = toCanvas(point);
        const endCanvas = toCanvas(next);
        return <DraftLengthLabel key={`manual-zone-length-${index}`} x={(startCanvas.x + endCanvas.x) / 2} y={getDraftLengthLabelY(startCanvas, endCanvas)} text={formatDraftLengthMm(point, next)} />;
      })}
      {previewPoint && points.length ? <DraftLengthLabel x={(canvasPoints.at(-1)!.x + previewCanvas!.x) / 2} y={getDraftLengthLabelY(canvasPoints.at(-1)!, previewCanvas!)} text={formatDraftLengthMm(points.at(-1)!, previewPoint)} /> : null}
      {canvasPoints.map((point, index) => <Circle key={`manual-zone-point-${index}`} x={point.x} y={point.y} radius={6} fill="#7B43AF" stroke="#FFFFFF" strokeWidth={2} />)}
      {previewCanvas ? <Circle x={previewCanvas.x} y={previewCanvas.y} radius={6} fill="#7B43AF" stroke="#FFFFFF" strokeWidth={2} shadowColor="rgba(111, 79, 147, 0.38)" shadowBlur={8} /> : null}
    </Group>
  );
}

function useKeepKonvaOnTop(ref: RefObject<Konva.Group | null>, enabled = true) {
  useLayoutEffect(() => {
    if (!enabled) return;
    const node = ref.current;
    if (!node) return;
    node.moveToTop();
    node.getLayer()?.batchDraw();
  });
}

function DraftLengthLabel({ error = false, onClick, text, x, y }: { error?: boolean; onClick?: () => void; text: string; x: number; y: number }) {
  const ref = useRef<Konva.Group>(null);
  useKeepKonvaOnTop(ref);
  return (
    <Group
      ref={ref}
      x={x}
      y={y}
      listening={Boolean(onClick)}
      onClick={onClick}
      onTap={onClick}
      onMouseEnter={(event) => {
        if (!onClick) return;
        const container = event.target.getStage()?.container();
        if (container) container.style.cursor = 'text';
      }}
      onMouseLeave={(event) => {
        if (!onClick) return;
        const container = event.target.getStage()?.container();
        if (container) container.style.cursor = '';
      }}
    >
      <Rect x={-54} y={-11} width={108} height={22} fill="#FFFFFF" stroke={error ? '#C85B72' : '#D9D9E2'} strokeWidth={1} cornerRadius={4} shadowColor="rgba(30, 30, 40, 0.10)" shadowBlur={5} />
      <Text x={-52} y={-7} width={104} align="center" text={text} fill={error ? '#A83F57' : '#4D4D59'} fontSize={12} />
    </Group>
  );
}

function getVisibleTilePalette(palette: TilePaletteEntry[]): TilePaletteEntry[] {
  const items = palette.slice(0, 5);
  if (items.length >= 5) return items;
  const used = new Set(items.map((item) => normalizeHexColor(item.color)));
  for (const fallback of defaultTilePalette) {
    if (items.length >= 5) break;
    if (used.has(normalizeHexColor(fallback.color))) continue;
    items.push({ ...fallback });
    used.add(normalizeHexColor(fallback.color));
  }
  return items;
}

function TileColorPicker({
  activeColor,
  canApply,
  onSelect,
  project,
}: {
  activeColor: string;
  canApply: boolean;
  onSelect: (color: string, name?: string) => void;
  project: TileProject;
}) {
  const [customOpen, setCustomOpen] = useState(false);
  const [stored, setStored] = useState(loadStoredTilePalette);
  const usedColors = useMemo(() => getUsedTileColors(project), [project]);
  const activeNormalized = normalizeHexColor(activeColor);
  const slots = getVisibleTilePalette(stored.palette);

  function commitPalette(nextPalette: TilePaletteEntry[], nextExtended: string[]) {
    setStored({ palette: nextPalette, extended: nextExtended });
    saveStoredTilePalette(nextPalette, nextExtended);
  }

  function applyColor(entry: TilePaletteEntry) {
    if (!canApply) return;
    onSelect(entry.color, entry.name);
  }

  function addCustomColor(color: string) {
    const normalized = normalizeHexColor(color);
    if (!/^#[0-9A-F]{6}$/.test(normalized)) return;
    const existing = slots.find((item) => normalizeHexColor(item.color) === normalized);
    if (existing) {
      applyColor(existing);
      setCustomOpen(false);
      return;
    }

    const usedNames = new Set(slots.map((item) => item.name));
    const entry: TilePaletteEntry = {
      id: `custom-${Date.now()}`,
      color: normalized,
      name: suggestCustomColorName(normalized, usedNames),
    };

    const unusedIndex = slots.findIndex((item) => !usedColors.has(normalizeHexColor(item.color)));
    let nextPalette: TilePaletteEntry[];
    let nextExtended = stored.extended.filter((item) => item !== normalized);

    if (unusedIndex >= 0) {
      const replaced = slots[unusedIndex];
      nextPalette = slots.map((item, index) => (index === unusedIndex ? entry : item));
      const replacedColor = normalizeHexColor(replaced.color);
      if (!nextExtended.includes(replacedColor) && replacedColor !== normalized) nextExtended = [...nextExtended, replacedColor];
    } else if (slots.length < 5) {
      nextPalette = [...slots, entry];
    } else {
      applyColor(entry);
      setCustomOpen(false);
      return;
    }

    commitPalette(nextPalette, nextExtended);
    applyColor(entry);
    setCustomOpen(false);
  }

  return (
    <div className="tile-color-picker">
      <div className="tile-color-swatch-row" role="group" aria-label="Цвет плитки">
        {slots.map((entry) => {
          const selected = activeNormalized === normalizeHexColor(entry.color);
          return (
            <button
              key={entry.id}
              type="button"
              className={selected ? 'tile-color-swatch active' : 'tile-color-swatch'}
              disabled={!canApply}
              style={{ background: entry.color }}
              aria-label="Цвет плитки"
              aria-pressed={selected}
              onClick={() => applyColor(entry)}
            />
          );
        })}
        <button
          type="button"
          className={customOpen ? 'tile-color-custom-toggle active' : 'tile-color-custom-toggle'}
          aria-expanded={customOpen}
          onClick={() => setCustomOpen((current) => !current)}
        >
          Свой цвет
        </button>
      </div>

      {customOpen ? (
        <div className="extended-pastel-palette" role="listbox" aria-label="Свои цвета">
          {stored.extended.length ? stored.extended.map((color) => (
            <button
              key={color}
              type="button"
              disabled={!canApply}
              style={{ background: color }}
              aria-label={`Добавить цвет ${color}`}
              title={color}
              onClick={() => addCustomColor(color)}
            />
          )) : <small>Все дополнительные цвета уже в списке</small>}
        </div>
      ) : null}

      {!canApply ? <small>Выберите пол, стену или зону, чтобы покрасить плитку</small> : null}
    </div>
  );
}

type MeasurementBounds = ReturnType<typeof getBoundingBox>;

function ZoneBoundsMeasurements({ bounds, surfaceBounds, toCanvas }: { bounds: MeasurementBounds; surfaceBounds: MeasurementBounds; toCanvas: (point: PointMm) => PointMm }) {
  const centerX = bounds.minX + bounds.width / 2;
  const centerY = bounds.minY + bounds.height / 2;
  const topLeft = toCanvas({ x: bounds.minX, y: bounds.minY });
  const bottomRight = toCanvas({ x: bounds.maxX, y: bounds.maxY });
  return (
    <Group listening={false}>
      <CanvasDistanceSpan start={toCanvas({ x: surfaceBounds.minX, y: centerY })} end={toCanvas({ x: bounds.minX, y: centerY })} distanceMm={bounds.minX - surfaceBounds.minX} />
      <CanvasDistanceSpan start={toCanvas({ x: bounds.maxX, y: centerY })} end={toCanvas({ x: surfaceBounds.maxX, y: centerY })} distanceMm={surfaceBounds.maxX - bounds.maxX} />
      <CanvasDistanceSpan start={toCanvas({ x: centerX, y: surfaceBounds.minY })} end={toCanvas({ x: centerX, y: bounds.minY })} distanceMm={bounds.minY - surfaceBounds.minY} />
      <CanvasDistanceSpan start={toCanvas({ x: centerX, y: bounds.maxY })} end={toCanvas({ x: centerX, y: surfaceBounds.maxY })} distanceMm={surfaceBounds.maxY - bounds.maxY} />
      <ZoneMeasurementLabel
        width={92}
        x={(topLeft.x + bottomRight.x) / 2}
        y={(topLeft.y + bottomRight.y) / 2}
        text={`${Math.round(bounds.width)} × ${Math.round(bounds.height)} мм`}
      />
    </Group>
  );
}

function CanvasDistanceSpan({ distanceMm, end, start }: { distanceMm: number; end: PointMm; start: PointMm }) {
  const distance = Math.round(distanceMm);
  if (distance < 1) return null;
  const horizontal = Math.abs(end.x - start.x) >= Math.abs(end.y - start.y);
  return (
    <Group listening={false}>
      <Line points={[start.x, start.y, end.x, end.y]} stroke="#74518F" strokeWidth={1} dash={[4, 3]} />
      <Line points={horizontal ? [start.x, start.y - 4, start.x, start.y + 4] : [start.x - 4, start.y, start.x + 4, start.y]} stroke="#74518F" strokeWidth={1} />
      <Line points={horizontal ? [end.x, end.y - 4, end.x, end.y + 4] : [end.x - 4, end.y, end.x + 4, end.y]} stroke="#74518F" strokeWidth={1} />
      <ZoneMeasurementLabel x={(start.x + end.x) / 2} y={(start.y + end.y) / 2} text={`${distance} мм`} />
    </Group>
  );
}

function ZoneMeasurementLabel({ text, width = 68, x, y }: { text: string; width?: number; x: number; y: number }) {
  return (
    <Group x={x} y={y} listening={false}>
      <Rect x={-width / 2} y={-9} width={width} height={18} fill="#FFFFFF" stroke="#CDB9DF" strokeWidth={1} cornerRadius={4} shadowColor="rgba(30, 30, 40, 0.10)" shadowBlur={4} />
      <Text x={-width / 2 + 2} y={-6} width={width - 4} align="center" text={text} fill="#6F4F93" fontSize={10} />
    </Group>
  );
}

function PolygonSideMeasurements({ closed, points, toCanvas }: { closed: boolean; points: PointMm[]; toCanvas: (point: PointMm) => PointMm }) {
  const center = points.reduce((result, point) => ({ x: result.x + point.x / points.length, y: result.y + point.y / points.length }), { x: 0, y: 0 });
  const segmentCount = closed ? points.length : points.length - 1;
  return (
    <Group listening={false}>
      {Array.from({ length: Math.max(0, segmentCount) }, (_, index) => {
        const start = points[index];
        const end = points[(index + 1) % points.length];
        const startCanvas = toCanvas(start);
        const endCanvas = toCanvas(end);
        const middle = { x: (startCanvas.x + endCanvas.x) / 2, y: (startCanvas.y + endCanvas.y) / 2 };
        const awayX = (start.x + end.x) / 2 - center.x;
        const awayY = (start.y + end.y) / 2 - center.y;
        const awayLength = Math.hypot(awayX, awayY) || 1;
        return (
          <ZoneMeasurementLabel
            key={`zone-side-${index}`}
            x={middle.x + (awayX / awayLength) * 18}
            y={middle.y + (awayY / awayLength) * 18}
            text={`${Math.round(segmentLength(start, end))} мм`}
          />
        );
      })}
    </Group>
  );
}

function getDraftLengthLabelY(start: { y: number }, end: { y: number }): number {
  const middleY = (start.y + end.y) / 2;
  return middleY < 140 ? middleY + 24 : middleY - 22;
}

function formatDraftLengthMm(start: PointMm, end: PointMm) {
  const totalMm = Math.round(Math.hypot(end.x - start.x, end.y - start.y));
  return `${totalMm} мм`;
}

function getSelectedPartitionSide(project: TileProject, surfaceId: string | null, partitionId: string): 'a' | 'b' | null {
  const sourceParts = project.surfaces.find((surface) => surface.id === surfaceId)?.sourceRef?.split(':') ?? [];
  if (sourceParts[0] !== 'partition' || sourceParts[1] !== partitionId) return null;
  return sourceParts[2] === 'a' || sourceParts[2] === 'b' ? sourceParts[2] : null;
}

function pointToCanvasPoint(point: PointMm) {
  return { x: PLAN_OFFSET_X + mmToCanvas(point.x), y: PLAN_OFFSET_Y + mmToCanvas(point.y) };
}

interface FloorLayerProps {
  block: CanvasSectionBlock;
  dimensionEntryAreaId: string | null;
  dimensionsVisible: boolean;
  hideOpenings: boolean;
  measurementMode: MeasurementMode | null;
  onDeleteObject: (objectId: string) => void;
  onDeletePartition: (partitionId: string) => void;
  onDeleteRoomArea: (areaId: string) => void;
  onEditObject: (objectId: string) => void;
  onEditSegment: (target: EditTarget) => void;
  onEditLayoutOffset: (target: EditTarget) => void;
  onMoveObject: (objectId: string, xMm: number, yMm: number, areaId?: string) => void;
  onMoveOpening: (openingId: string, xMm: number, yMm?: number) => void;
  onRotateObject: (objectId: string, rotationDeg: number) => void;
  onMovePartition: (partitionId: string, start: PointMm, end: PointMm) => void;
  onMoveWall: (areaId: string, index: number, deltaMm: number) => void;
  onMoveRoomArea: (areaId: string, deltaXmm: number, deltaYmm: number, detachingOpeningId?: string) => void;
  onSelectObject: (objectId: string | null) => void;
  onSelectOpening: (surfaceId: string, openingId: string) => void;
  onSelectPartition: (partitionId: string | null) => void;
  onSelectSurface: (surfaceId: string | null) => void;
  onSelectZone: (surfaceId: string, zoneId: string | null) => void;
  onSelectWall: (index: number | null) => void;
  onZonePolygonChange: (surfaceId: string, zoneId: string, points: PointMm[]) => void;
  onZoneShapeChange: (surfaceId: string, zoneId: string, patch: Partial<Extract<FinishZone['shape'], { type: 'rect' }>>) => void;
  project: TileProject;
  roomMoveEnabled: boolean;
  selectedObjectId: string | null;
  selectedOpeningId: string | null;
  selectedPartitionId: string | null;
  selectedSurfaceId: string | null;
  selectedZoneId: string | null;
  selectedWallIndex: number | null;
  showOpeningNames: boolean;
  calculationSelecting?: boolean;
  calculationSelectedIds?: Set<string>;
  view: PlanViewTransform;
}

function FloorLayer({ block, dimensionEntryAreaId, dimensionsVisible, hideOpenings, measurementMode, onDeleteObject, onDeletePartition, onDeleteRoomArea, onEditObject, onEditSegment, onEditLayoutOffset, onMoveObject, onMoveOpening, onRotateObject, onMovePartition, onMoveRoomArea, onMoveWall, onSelectObject, onSelectOpening, onSelectPartition, onSelectSurface, onSelectZone, onSelectWall, onZonePolygonChange, onZoneShapeChange, project, roomMoveEnabled, selectedObjectId, selectedOpeningId, selectedPartitionId, selectedSurfaceId, selectedZoneId, selectedWallIndex, showOpeningNames, calculationSelecting = false, calculationSelectedIds, view }: FloorLayerProps) {
  const [roomDragVisual, setRoomDragVisual] = useState<{ areaIds: Set<string>; x: number; y: number; rotationRad: number; rotationCenter: PointMm | null } | null>(null);
  const roomDragRequest = useRef<{ x: number; y: number } | null>(null);
  const roomDragJoint = useRef<string | undefined>(undefined);
  const [openingDragVisual, setOpeningDragVisual] = useState<{ id: string; xMm: number } | null>(null);
  const [wallDragPreview, setWallDragPreview] = useState<{ areaId: string; deltaMm: number; index: number } | null>(null);
  const [stackConflictIds, setStackConflictIds] = useState<string[]>([]);
  const [stackHint, setStackHint] = useState<string | null>(null);
  const [objectDragVisual, setObjectDragVisual] = useState<ObjectDragVisual | null>(null);
  const [partitionDragVisual, setPartitionDragVisual] = useState<PartitionDragVisual | null>(null);
  const [draggingZoneIds, setDraggingZoneIds] = useState<Record<string, true>>({});
  const [zoneDragPreview, setZoneDragPreview] = useState<{ id: string; delta: PointMm } | null>(null);
  const [scheduleObjectDragVisual, flushObjectDragVisual] = useAnimationFrameCallback(setObjectDragVisual);
  const areas = project.room.areas ?? [{ id: 'room-1', name: 'Помещение 1', contour: project.room.contour, heightMm: project.room.heightMm }];
  const renderData = useMemo(() => {
    const surfacesById = new Map(project.surfaces.map((surface) => [surface.id, surface]));
    const materialsById = new Map(project.materials.map((material) => [material.id, material]));
    const objectsByArea = new Map<string, RoomObject[]>();
    for (const object of project.objects) {
      const bucket = objectsByArea.get(object.areaId) ?? [];
      bucket.push(object);
      objectsByArea.set(object.areaId, bucket);
    }
    for (const [areaId, bucket] of objectsByArea) {
      objectsByArea.set(areaId, [...bucket].sort((first, second) => first.elevationMm - second.elevationMm || first.id.localeCompare(second.id)));
    }
    const wallIndexById = new Map<string, number>();
    project.surfaces.filter((surface) => surface.type === 'wall').forEach((surface, index) => wallIndexById.set(surface.id, index));
    return { materialsById, objectsByArea, surfacesById, wallIndexById };
  }, [project.materials, project.objects, project.surfaces]);

  function handleStackConflictChange(conflictIds: string[], hint: string | null) {
    setStackConflictIds(conflictIds);
    setStackHint(hint);
  }

  function handleObjectDragVisual(next: ObjectDragVisual | null) {
    if (next === null) flushObjectDragVisual(null);
    else scheduleObjectDragVisual(next);
  }

  function maskVisualFor(object: RoomObject) {
    if (objectDragVisual?.id === object.id) {
      return {
        xMm: objectDragVisual.xMm,
        yMm: objectDragVisual.yMm,
        rotationDeg: objectDragVisual.rotationDeg ?? object.rotationDeg ?? 0,
      };
    }
    return { xMm: object.xMm, yMm: object.yMm, rotationDeg: object.rotationDeg ?? 0 };
  }

  return (
    <Group>
      <Text x={block.x + 18} y={block.y + 16} text="Пол" fill="#5F5F70" fontSize={18} listening={false} />
      {areas.map((area, areaIndex) => {
        const floorId = areaIndex === 0 ? 'surface-floor' : `surface-floor-${area.id}`;
        const floor = renderData.surfacesById.get(floorId);
        const baseZone = floor?.zones[0];
        const material = baseZone?.materialId ? renderData.materialsById.get(baseZone.materialId) : null;
        const areaObjects = renderData.objectsByArea.get(area.id) ?? [];
        const blockedFloorObjects = areaObjects.filter((object) => object.excludeFloorTile);
        const surfaceActive = selectedSurfaceId === floorId;
        const shapeLocked = area.shapeLocked ?? (areaIndex === 0 && project.room.templateId === null);
        const layoutOpacity = calculationSelecting ? 1 : selectedSurfaceId && !surfaceActive ? 0.32 : selectedZoneId ? 0.34 : 1;
        const groupOpacity = calculationSelecting && !calculationSelectedIds?.has(floorId) ? 0.28 : 1;
        const renderContour = wallDragPreview?.areaId === area.id
          ? previewRoomAreaWall(area, wallDragPreview.index, wallDragPreview.deltaMm)
          : area.contour;
        const renderBounds = getBoundingBox(renderContour);
        const points = renderContour.flatMap((point) => [view.x(point.x), view.y(point.y)]);
        const dragTransform = getRoomDragPreviewTransform(roomDragVisual, area.id, view);
        if (!floor || !baseZone || !material) return null;
        return (
          <Group
            key={area.id}
            id={area.id}
            name="room-floor-group"
            opacity={groupOpacity}
            {...dragTransform}
            draggable={roomMoveEnabled}
            onDragStart={(event) => {
              if (event.target !== event.currentTarget) return;
              roomDragRequest.current = null;
              roomDragJoint.current = undefined;
            }}
            onDragMove={(event) => {
              if (event.target !== event.currentTarget) return;
              const node = event.currentTarget;
              const requested = { x: node.x() / view.scale, y: node.y() / view.scale };
              roomDragRequest.current = requested;
              const movement = getRoomMagnetMove(project, area.id, requested.x, requested.y, roomDragJoint.current);
              roomDragJoint.current ??= movement.detachingOpeningId;
              node.position({ x: movement.x * view.scale, y: movement.y * view.scale });
              setRoomDragVisual({ areaIds: movement.movingAreaIds, x: movement.x, y: movement.y, rotationRad: movement.rotationRad, rotationCenter: movement.rotationCenter });
            }}
            onDragEnd={(event) => {
              if (event.target !== event.currentTarget) return;
              const node = event.currentTarget;
              const deltaXmm = Math.round(roomDragRequest.current?.x ?? node.x() / view.scale);
              const deltaYmm = Math.round(roomDragRequest.current?.y ?? node.y() / view.scale);
              const detachingOpeningId = roomDragJoint.current;
              node.position({ x: 0, y: 0 });
              roomDragRequest.current = null;
              roomDragJoint.current = undefined;
              setRoomDragVisual(null);
              if (deltaXmm || deltaYmm) onMoveRoomArea(area.id, deltaXmm, deltaYmm, detachingOpeningId);
            }}
          >
            <Line points={points} closed fill="#FFFFFF" stroke="#A385C4" strokeWidth={surfaceActive ? 5 : 3} onClick={() => onSelectSurface(floorId)} onTap={() => onSelectSurface(floorId)} />
            <FloorTileLayout
              blockedObjects={blockedFloorObjects}
              contour={renderContour}
              layout={baseZone.layout}
              layoutBounds={getSharedFloorLayoutBox(project, area.id, renderContour)}
              maskPositionFor={maskVisualFor}
              material={material}
              opacity={layoutOpacity}
              view={view}
            />
            <Group name="floor-zones">
              {floor.zones.slice(1).map((zone) => {
                if (draggingZoneIds[zone.id]) return null;
                if (zone.shape.type === 'polygon') {
                  return (
                    <Line
                      key={`floor-zone-mask-${zone.id}`}
                      points={zone.shape.points.flatMap((point) => [view.x(point.x), view.y(point.y)])}
                      closed
                      fill="#FFFFFF"
                      listening={false}
                    />
                  );
                }
                return (
                  <Rect
                    key={`floor-zone-mask-${zone.id}`}
                    x={view.x(renderBounds.minX + zone.shape.xMm)}
                    y={view.y(renderBounds.minY + zone.shape.yMm)}
                    width={mmToCanvas(zone.shape.widthMm)}
                    height={mmToCanvas(zone.shape.heightMm)}
                    fill="#FFFFFF"
                    listening={false}
                  />
                );
              })}
              <Line points={points} closed stroke="#A385C4" strokeWidth={surfaceActive ? 5 : 3} listening={false} />
              {floor.zones.slice(1).map((zone) => {
                const zoneMaterial = zone.materialId ? renderData.materialsById.get(zone.materialId) : null;
                const zoneActive = selectedZoneId === zone.id;
                return zoneMaterial ? (
                  <FloorZoneLayer
                    blockedObjects={blockedFloorObjects}
                    key={zone.id}
                    maskPositionFor={maskVisualFor}
                    material={zoneMaterial}
                    onEditOffset={(edge) => onEditLayoutOffset({ type: 'layout-offset', edge, surfaceId: floorId, zoneId: zone.id })}
                    onSelect={() => onSelectZone(floorId, zone.id)}
                    onPolygonChange={(points) => onZonePolygonChange(floorId, zone.id, points)}
                    onShapeChange={(patch) => onZoneShapeChange(floorId, zone.id, patch)}
                    onDragPreview={(delta) => setZoneDragPreview(delta ? { id: zone.id, delta } : null)}
                    onDragStateChange={(dragging) => {
                      setDraggingZoneIds((prev) => {
                        if (dragging) return { ...prev, [zone.id]: true };
                        if (!prev[zone.id]) return prev;
                        const next = { ...prev };
                        delete next[zone.id];
                        return next;
                      });
                    }}
                    selected={zoneActive}
                    showEdgeCuts={measurementMode === 'tile'}
                    surfaceContour={renderContour}
                    view={view}
                    zone={zone}
                    opacity={surfaceActive && !zoneActive ? 0.48 : 1}
                  />
                ) : null;
              })}
            </Group>
            {floor.zones.slice(1).filter((zone) => zone.id === selectedZoneId).map((zone) => (
              <ZoneClearanceLabels key={`clearances-${zone.id}`} bounds={getZoneMeasurementBounds(zone, renderBounds)} contour={renderContour} delta={zoneDragPreview?.id === zone.id ? zoneDragPreview.delta : { x: 0, y: 0 }} view={view} />
            ))}
            {blockedFloorObjects.map((object) => {
              const position = maskVisualFor(object);
              return (
                <RotatedObjectRect
                  key={`floor-clear-${object.id}`}
                  fill="#FFFFFF"
                  lengthMm={object.lengthMm}
                  listening={false}
                  rotationDeg={position.rotationDeg}
                  view={view}
                  widthMm={object.widthMm}
                  xMm={position.xMm}
                  yMm={position.yMm}
                />
              );
            })}
            {(project.room.partitions ?? []).filter((partition) => (partition.areaId ?? areas[0].id) === area.id).map((partition) => (
              <FloorPartition
                key={partition.id}
                contour={renderContour}
                onDelete={() => onDeletePartition(partition.id)}
                onPreview={setPartitionDragVisual}
                onMove={(start, end) => onMovePartition(partition.id, start, end)}
                onSelect={() => onSelectPartition(partition.id)}
                partition={partition}
                partitions={project.room.partitions ?? []}
                selected={selectedPartitionId === partition.id}
                selectedSide={getSelectedPartitionSide(project, selectedSurfaceId, partition.id)}
                view={view}
              />
            ))}
            {areaObjects.map((object) => (
              <FloorRoomObject
                key={object.id}
                conflictHighlight={stackConflictIds.includes(object.id)}
                contour={renderContour}
                measurementMode={measurementMode}
                object={object}
                objects={project.objects}
                onDelete={() => onDeleteObject(object.id)}
                onMove={(xMm, yMm, areaId) => onMoveObject(object.id, xMm, yMm, areaId)}
                onRotate={(rotationDeg) => onRotateObject(object.id, rotationDeg)}
                onEdit={() => onEditObject(object.id)}
                onSelect={() => onSelectObject(object.id)}
                onStackConflictChange={handleStackConflictChange}
                onDragVisual={handleObjectDragVisual}
                project={project}
                selected={selectedObjectId === object.id}
                view={view}
              />
            ))}
            {dimensionsVisible && (dimensionEntryAreaId === area.id || selectedSurfaceId === floorId) && !selectedZoneId && !selectedOpeningId && !selectedObjectId && !selectedPartitionId ? renderContour.map((_, index) => (
              <FloorWallDimensionLabels
                key={`${floorId}-dimension-${index}`}
                areaId={area.id}
                contour={renderContour}
                index={index}
                laneOffset={0}
                compact={dimensionEntryAreaId === area.id}
                onEdit={shapeLocked || (dimensionEntryAreaId && dimensionEntryAreaId !== area.id) ? undefined : () => onEditSegment({ type: 'floor-segment', areaId: area.id, index })}
                partitions={project.room.partitions ?? []}
                view={view}
              />
            )) : null}
            {measurementMode === 'tile' && (selectedSurfaceId === floorId || dimensionEntryAreaId === area.id) && !selectedZoneId ? (
              <FloorEdgeCutLabels
                contour={renderContour}
                layout={baseZone.layout}
                material={material}
                onEditOffset={(edge) => onEditLayoutOffset({ type: 'layout-offset', edge, surfaceId: floorId, zoneId: baseZone.id })}
                view={view}
              />
            ) : null}
            {renderContour.map((point, index) => {
              const next = renderContour[(index + 1) % renderContour.length];
              const horizontal = point.y === next.y;
              const wallSurfaceId = areaIndex === 0 ? `surface-wall-${index + 1}` : `surface-wall-${area.id}-${index + 1}`;
              const wallIndex = renderData.wallIndexById.get(wallSurfaceId) ?? -1;
              const selected = selectedSurfaceId === wallSurfaceId && !selectedOpeningId;
              return (
                <Group key={`${floorId}-wall-${index}`}>
                  {selected ? (
                    <Group listening={false}>
                      <Line
                        points={[view.x(point.x), view.y(point.y), view.x(next.x), view.y(next.y)]}
                        stroke="#777777"
                        strokeWidth={15}
                        opacity={0.3}
                        shadowColor="#606060"
                        shadowBlur={18}
                        shadowOpacity={0.9}
                      />
                      <Line
                        points={[view.x(point.x), view.y(point.y), view.x(next.x), view.y(next.y)]}
                        stroke="#5E5E5E"
                        strokeWidth={3}
                        shadowColor="#4F4F4F"
                        shadowBlur={28}
                        shadowOpacity={1}
                      />
                    </Group>
                  ) : null}
                  <Line
                    points={[
                      view.x(area.contour[index].x), view.y(area.contour[index].y),
                      view.x(area.contour[(index + 1) % area.contour.length].x), view.y(area.contour[(index + 1) % area.contour.length].y),
                    ]}
                    stroke="transparent"
                    strokeWidth={28}
                    hitStrokeWidth={28}
                    opacity={1}
                    draggable={(roomMoveEnabled && !shapeLocked) || dimensionEntryAreaId === area.id}
                    dragBoundFunc={function (this: Konva.Node, pos) {
                      const fixed = this.getAbsolutePosition();
                      return horizontal ? { x: fixed.x, y: pos.y } : { x: pos.x, y: fixed.y };
                    }}
                    onDragStart={() => setWallDragPreview({ areaId: area.id, deltaMm: 0, index })}
                    onDragMove={(event) => {
                      if (!((roomMoveEnabled && !shapeLocked) || dimensionEntryAreaId === area.id)) return;
                      const node = event.currentTarget;
                      const deltaPx = horizontal ? node.y() : node.x();
                      setWallDragPreview({ areaId: area.id, deltaMm: Math.round(deltaPx / view.scale), index });
                    }}
                    onClick={(event) => { event.cancelBubble = true; if (wallIndex >= 0) onSelectWall(wallIndex); }}
                    onTap={(event) => { event.cancelBubble = true; if (wallIndex >= 0) onSelectWall(wallIndex); }}
                    onDragEnd={(event) => {
                      event.cancelBubble = true;
                      setWallDragPreview(null);
                      if ((roomMoveEnabled && !shapeLocked) || dimensionEntryAreaId === area.id) handleWallDrag(event, area.id, index, horizontal, view.scale, onMoveWall);
                    }}
                  />
                </Group>
              );
            })}
            {surfaceActive ? renderContour.map((point, index) => <Circle key={`${floorId}-point-${index}`} x={view.x(point.x)} y={view.y(point.y)} radius={6} fill="#8A6AAE" />) : null}
            {surfaceActive && !dimensionEntryAreaId ? (
              <Group
                x={view.x(renderBounds.maxX) - 38}
                y={view.y(renderBounds.minY) + 10}
                onClick={(event) => { event.cancelBubble = true; onDeleteRoomArea(area.id); }}
                onTap={(event) => { event.cancelBubble = true; onDeleteRoomArea(area.id); }}
              >
                <Rect width={28} height={28} fill="#FFFFFF" stroke="#E1B7C0" strokeWidth={1} cornerRadius={6} shadowColor="rgba(38, 24, 50, 0.18)" shadowBlur={6} />
                <Line points={[8, 8, 20, 8]} stroke="#A83F57" strokeWidth={1.8} lineCap="round" />
                <Line points={[11, 6, 17, 6]} stroke="#A83F57" strokeWidth={1.8} lineCap="round" />
                <Rect x={9} y={11} width={10} height={11} stroke="#A83F57" strokeWidth={1.6} cornerRadius={1} />
              </Group>
            ) : null}
          </Group>
        );
      })}
      {!hideOpenings ? [...areas].sort((a, b) => {
        const selectedArea = project.surfaces.find((surface) => surface.id === selectedSurfaceId)?.sourceRef?.split(':')[1];
        return Number(a.id === selectedArea) - Number(b.id === selectedArea);
      }).map((area) => (
        <Group key={`opening-overlay-${area.id}`} {...getRoomDragPreviewTransform(roomDragVisual, area.id, view)}>
          <FloorOpeningMarkers areaId={area.id} contour={wallDragPreview?.areaId === area.id ? previewRoomAreaWall(area, wallDragPreview.index, wallDragPreview.deltaMm) : area.contour} onEditDistance={onEditSegment} onMoveOpening={onMoveOpening} onSelectOpening={onSelectOpening} project={project} selectedOpeningId={selectedOpeningId} showDistances={measurementMode === 'objects'} showNames={showOpeningNames} view={view} dragVisual={openingDragVisual} onDragVisual={setOpeningDragVisual} />
        </Group>
      )) : null}
      {/* Measurements are above every room/object and wall hit area. */}
      <FloorMeasurementOverlay
        project={project} view={view} measurementMode={measurementMode}
        selectedObjectId={selectedObjectId} selectedPartitionId={selectedPartitionId}
        objectPreview={objectDragVisual} partitionPreview={partitionDragVisual}
        roomPreview={roomDragVisual} onEdit={onEditSegment}
      />
      {stackHint ? (
        <Group listening={false}>
          <Rect
            x={block.x + 18}
            y={block.y + 48}
            width={Math.min(420, block.width - 36)}
            height={56}
            fill="#FBE3E3"
            stroke="#E3A9A9"
            cornerRadius={10}
          />
          <Text
            x={block.x + 30}
            y={block.y + 58}
            width={Math.min(396, block.width - 60)}
            text={stackHint}
            fill="#C62828"
            fontSize={13}
            lineHeight={1.25}
          />
        </Group>
      ) : null}
    </Group>
  );
}

function FloorRoomObject({ conflictHighlight = false, contour, measurementMode, object, objects, onDelete, onEdit, onMove, onRotate, onSelect, onStackConflictChange, onDragVisual, project, selected, view }: {
  conflictHighlight?: boolean;
  contour: PointMm[];
  measurementMode: MeasurementMode | null;
  object: RoomObject;
  objects: RoomObject[];
  onDelete: () => void;
  onMove: (xMm: number, yMm: number, areaId: string) => void;
  onRotate: (rotationDeg: number) => void;
  onEdit: () => void;
  onSelect: () => void;
  onStackConflictChange: (conflictIds: string[], hint: string | null) => void;
  onDragVisual: (next: ObjectDragVisual | null) => void;
  project: TileProject;
  selected: boolean;
  view: PlanViewTransform;
}) {
  const [dragState, setDragState] = useState<{ areaId: string; conflictIds: string[]; elevationMm: number; x: number; y: number } | null>(null);
  const dragStateRef = useRef<{ areaId: string; conflictIds: string[]; elevationMm: number; x: number; y: number } | null>(null);
  const [rotationPreview, setRotationPreview] = useState<number | null>(null);
  const [scheduleDragState] = useAnimationFrameCallback(setDragState);
  const areas = project.room.areas ?? [];
  const displayedXmm = dragState?.x ?? object.xMm;
  const displayedYmm = dragState?.y ?? object.yMm;
  const displayedRotation = rotationPreview ?? object.rotationDeg ?? 0;
  const dragging = Boolean(dragState);
  // Room mode: only the object's own size when selected (not while dragging).
  // Wall clearances for all elevations are drawn in the shared top overlay.
  const showObjectSize = !dragging && rotationPreview === null && selected && measurementMode === 'room';
  const rotating = rotationPreview !== null;
  useEffect(() => {
    if (rotationPreview === null) return;
    if (Math.abs((object.rotationDeg ?? 0) - rotationPreview) > 0.05) return;
    setRotationPreview(null);
    onDragVisualRef.current(null);
  }, [object.rotationDeg, object.xMm, object.yMm, rotationPreview]);
  const objectRef = useRef(object);
  const objectsRef = useRef(objects);
  const areasRef = useRef(areas);
  const onMoveRef = useRef(onMove);
  const onRotateRef = useRef(onRotate);
  const onSelectRef = useRef(onSelect);
  const onStackConflictChangeRef = useRef(onStackConflictChange);
  const onDragVisualRef = useRef(onDragVisual);
  objectRef.current = object;
  objectsRef.current = objects;
  areasRef.current = areas;
  onMoveRef.current = onMove;
  onRotateRef.current = onRotate;
  onSelectRef.current = onSelect;
  onStackConflictChangeRef.current = onStackConflictChange;
  onDragVisualRef.current = onDragVisual;

  const getRequestedPosition = (node: Konva.Node) => ({
    x: objectRef.current.xMm + Math.round(node.x() / view.scale),
    y: objectRef.current.yMm + Math.round(node.y() / view.scale),
  });

  const constrainFloorDrag = (node: Konva.Node) => {
    const currentObject = objectRef.current;
    const requested = getRequestedPosition(node);
    const center = {
      x: requested.x + currentObject.lengthMm / 2,
      y: requested.y + currentObject.widthMm / 2,
    };
    const currentAreas = areasRef.current;
    const previous = dragStateRef.current;
    const previousAreaId = previous?.areaId ?? currentObject.areaId;
    const containing = currentAreas.filter((area) => (
      isPointStrictlyInsidePolygon(center, area.contour)
      || isPointOnContourBoundary(center, area.contour, 1.5)
    ));
    // While the pointer is in a door gap / wall thickness, keep the last good spot
    // instead of re-anchoring to a room corner (that made the object "fly away").
    if (!containing.length) {
      if (!previous) return;
      node.position({
        x: view.scale * (previous.x - currentObject.xMm),
        y: view.scale * (previous.y - currentObject.yMm),
      });
      return;
    }
    const targetArea = containing.find((area) => area.id === previousAreaId) ?? containing[0];
    if (!targetArea) return;
    const areaPartitions = (project.room.partitions ?? []).filter((partition) => (partition.areaId ?? targetArea.id) === targetArea.id);
    const anchor = previous
      ? { x: previous.x, y: previous.y }
      : { x: currentObject.xMm, y: currentObject.yMm };
    const clamped = slideRoomObjectPosition(
      targetArea.contour,
      currentObject,
      requested.x,
      requested.y,
      anchor,
      areaPartitions,
    );
    const others = objectsRef.current.filter((item) => item.areaId === targetArea.id && item.id !== currentObject.id);
    const stack = resolveRoomObjectStacking(
      {
        xMm: clamped.x,
        yMm: clamped.y,
        lengthMm: currentObject.lengthMm,
        widthMm: currentObject.widthMm,
        heightMm: currentObject.heightMm,
        rotationDeg: currentObject.rotationDeg ?? 0,
      },
      targetArea.heightMm ?? project.room.heightMm,
      others,
      currentObject.elevationMm,
    );
    node.position({ x: view.scale * (clamped.x - currentObject.xMm), y: view.scale * (clamped.y - currentObject.yMm) });
    const next = {
      areaId: targetArea.id,
      conflictIds: stack.conflictIds,
      elevationMm: stack.elevationMm,
      x: clamped.x,
      y: clamped.y,
    };
    dragStateRef.current = next;
    scheduleDragState(next);
    onDragVisualRef.current({ id: currentObject.id, areaId: targetArea.id, xMm: clamped.x, yMm: clamped.y, rotationDeg: currentObject.rotationDeg ?? 0 });
    onStackConflictChangeRef.current(
      stack.conflictIds,
      stack.conflictIds.length ? OBJECT_STACK_CONFLICT_HINT : null,
    );
  };

  const handleDragStart = () => {
    const start = {
      areaId: objectRef.current.areaId,
      conflictIds: [] as string[],
      elevationMm: objectRef.current.elevationMm,
      x: objectRef.current.xMm,
      y: objectRef.current.yMm,
    };
    dragStateRef.current = start;
    setDragState(start);
    onDragVisualRef.current({
      id: objectRef.current.id,
      xMm: objectRef.current.xMm,
      yMm: objectRef.current.yMm,
      rotationDeg: objectRef.current.rotationDeg ?? 0,
    });
    onSelectRef.current();
  };

  const handleDragEnd = (node: Konva.Node) => {
    const settled = dragStateRef.current;
    node.position({ x: 0, y: 0 });
    dragStateRef.current = null;
    setDragState(null);
    onDragVisualRef.current(null);
    onStackConflictChangeRef.current([], null);
    if (!settled || settled.conflictIds.length) return;
    onMoveRef.current(settled.x, settled.y, settled.areaId);
  };

  const constrainFloorDragRef = useRef(constrainFloorDrag);
  const handleDragStartRef = useRef(handleDragStart);
  const handleDragEndRef = useRef(handleDragEnd);
  constrainFloorDragRef.current = constrainFloorDrag;
  handleDragStartRef.current = handleDragStart;
  handleDragEndRef.current = handleDragEnd;

  const onDragMoveStable = useCallback((node: Konva.Node) => constrainFloorDragRef.current(node), []);
  const onDragStartStable = useCallback(() => handleDragStartRef.current(), []);
  const onDragEndStable = useCallback((node: Konva.Node) => handleDragEndRef.current(node), []);

  return (
    <>
      <FloorRoomObjectBody
        conflictHighlight={conflictHighlight}
        heightMm={object.widthMm}
        lengthMm={object.lengthMm}
        name={object.name}
        onDelete={onDelete}
        onDragEnd={onDragEndStable}
        onDragMove={onDragMoveStable}
        onDragStart={onDragStartStable}
        onEdit={onEdit}
        onRotate={(rotationDeg) => {
          onDragVisualRef.current({
            id: objectRef.current.id,
            xMm: objectRef.current.xMm,
            yMm: objectRef.current.yMm,
            rotationDeg,
          });
          setRotationPreview(rotationDeg);
          onRotateRef.current(rotationDeg);
          window.setTimeout(() => {
            const saved = objectRef.current.rotationDeg ?? 0;
            if (Math.abs(saved - rotationDeg) <= 0.05) return;
            setRotationPreview(null);
            onDragVisualRef.current(null);
          }, 0);
        }}
        onRotationPreview={(rotationDeg) => {
          setRotationPreview(rotationDeg);
          if (rotationDeg === null) {
            onDragVisualRef.current(null);
            return;
          }
          onDragVisualRef.current({
            id: objectRef.current.id,
            xMm: objectRef.current.xMm,
            yMm: objectRef.current.yMm,
            rotationDeg,
          });
        }}
        onSelect={onSelect}
        rotating={rotating}
        rotationDeg={displayedRotation}
        selected={selected}
        stacked={!dragging && object.elevationMm > 0}
        view={view}
        xMm={dragging ? object.xMm : displayedXmm}
        yMm={dragging ? object.yMm : displayedYmm}
      />
      {showObjectSize ? (
        <DraftLengthLabel
          x={view.x(displayedXmm + object.lengthMm / 2)}
          y={view.y(displayedYmm) - 56}
          text={`${object.lengthMm} × ${object.widthMm} мм`}
        />
      ) : null}
    </>
  );
}

const FloorRoomObjectBody = memo(function FloorRoomObjectBody({
  conflictHighlight = false,
  heightMm,
  lengthMm,
  name,
  onDelete,
  onDragEnd,
  onDragMove,
  onDragStart,
  onEdit,
  onRotate,
  onRotationPreview,
  onSelect,
  rotating = false,
  rotationDeg,
  selected,
  stacked = false,
  view,
  xMm,
  yMm,
}: {
  conflictHighlight?: boolean;
  heightMm: number;
  lengthMm: number;
  name: string;
  onDelete: () => void;
  onDragEnd: (node: Konva.Node) => void;
  onDragMove: (node: Konva.Node) => void;
  onDragStart: () => void;
  onEdit: () => void;
  onRotate: (rotationDeg: number) => void;
  onRotationPreview: (rotationDeg: number | null) => void;
  onSelect: () => void;
  rotating?: boolean;
  rotationDeg: number;
  selected: boolean;
  stacked?: boolean;
  view: PlanViewTransform;
  xMm: number;
  yMm: number;
}) {
  const width = mmToCanvas(lengthMm);
  const height = mmToCanvas(heightMm);
  const footprint = getBoundingBox(getRoomObjectCorners({ xMm, yMm, lengthMm, widthMm: heightMm, rotationDeg }));
  const centerX = view.x(xMm + lengthMm / 2);
  const centerY = view.y(yMm + heightMm / 2);
  const boxBottom = view.y(footprint.maxY);
  const boxCenterX = view.x((footprint.minX + footprint.maxX) / 2);
  const fill = conflictHighlight ? '#FBE3E3' : ROOM_OBJECT_FILL;
  const stroke = conflictHighlight ? '#C62828' : ROOM_OBJECT_STROKE;
  const textFill = conflictHighlight ? '#C62828' : '#FFFFFF';
  const opacity = conflictHighlight ? 0.92 : ROOM_OBJECT_OPACITY;
  // Keep the handle anchored above the object center (not the growing AABB),
  // so the ball and ↻ icon stay glued together while dragging.
  const handleDistance = Math.max(width, height) / 2 + 22;
  const rotationHandle = { x: centerX, y: centerY - handleDistance };
  const actionsY = boxBottom + 12;
  const [handlePointer, setHandlePointer] = useState<{ x: number; y: number } | null>(null);
  const lineEnd = handlePointer ?? rotationHandle;

  function rotationFromPointer(pointer: { x: number; y: number }) {
    const angle = Math.atan2(pointer.y - centerY, pointer.x - centerX) * (180 / Math.PI) + 90;
    const normalized = angle % 360;
    return normalized < 0 ? normalized + 360 : normalized;
  }

  return (
    <Group
      name="room-object"
      draggable
      onClick={(event) => { event.cancelBubble = true; onSelect(); }}
      onTap={(event) => { event.cancelBubble = true; onSelect(); }}
      onMouseDown={(event) => { event.cancelBubble = true; onSelect(); }}
      onTouchStart={(event) => { event.cancelBubble = true; onSelect(); }}
      onDragStart={(event) => {
        event.cancelBubble = true;
        event.currentTarget.getParent()?.moveToTop();
        event.currentTarget.moveToTop();
        onDragStart();
      }}
      onDragMove={(event) => { event.cancelBubble = true; onDragMove(event.currentTarget); }}
      onDragEnd={(event) => { event.cancelBubble = true; onDragEnd(event.currentTarget); }}
    >
      <Rect
        x={centerX}
        y={centerY}
        width={width}
        height={height}
        offsetX={width / 2}
        offsetY={height / 2}
        rotation={rotationDeg}
        fill={fill}
        opacity={opacity}
        stroke={stroke}
        strokeWidth={selected || conflictHighlight ? 3 : 2}
        cornerRadius={Math.min(10, width / 5, height / 5)}
      />
      {!rotating ? (
        <Text
          x={centerX}
          y={centerY}
          offsetX={Math.max(20, width - 8) / 2}
          offsetY={7}
          width={Math.max(20, width - 8)}
          align="center"
          text={name}
          fill={textFill}
          opacity={1}
          fontSize={11}
          rotation={rotationDeg}
          listening={false}
        />
      ) : null}
      {selected && !conflictHighlight ? (
        <>
          <Line
            points={[centerX, centerY, lineEnd.x, lineEnd.y]}
            stroke="#8A6AAE"
            strokeWidth={1.5}
            dash={[4, 3]}
            listening={false}
          />
          <Group
            x={rotationHandle.x}
            y={rotationHandle.y}
            draggable
            onMouseDown={(event) => { event.cancelBubble = true; }}
            onTouchStart={(event) => { event.cancelBubble = true; }}
            onDragStart={(event) => { event.cancelBubble = true; }}
            onDragMove={(event) => {
              event.cancelBubble = true;
              const node = event.currentTarget;
              const pointer = { x: node.x(), y: node.y() };
              setHandlePointer(pointer);
              onRotationPreview(rotationFromPointer(pointer));
            }}
            onDragEnd={(event) => {
              event.cancelBubble = true;
              const node = event.currentTarget;
              const nextRotation = rotationFromPointer({ x: node.x(), y: node.y() });
              setHandlePointer(null);
              node.position(rotationHandle);
              onRotate(nextRotation);
            }}
          >
            <Circle
              x={0}
              y={0}
              radius={11}
              fill="#FFFFFF"
              stroke="#D7C9E6"
              strokeWidth={1.5}
              shadowColor="rgba(38, 24, 50, 0.16)"
              shadowBlur={5}
              shadowOpacity={0.75}
            />
            <Text
              x={-9}
              y={-9}
              width={18}
              height={18}
              align="center"
              verticalAlign="middle"
              text="↻"
              fill="#6F4F93"
              fontSize={15}
              fontStyle="bold"
              listening={false}
            />
          </Group>
          {!rotating ? (
            <Group x={boxCenterX - 32} y={actionsY}>
              <Group onClick={(event) => { event.cancelBubble = true; onEdit(); }} onTap={(event) => { event.cancelBubble = true; onEdit(); }}>
                <Rect width={28} height={28} fill="#FFFFFF" stroke="#CDB9DF" cornerRadius={6} shadowColor="rgba(38, 24, 50, 0.16)" shadowBlur={6} />
                <Text x={2} y={2} width={24} height={24} align="center" verticalAlign="middle" text="✎" fill="#6F4F93" fontSize={18} />
              </Group>
              <Group x={36} onClick={(event) => { event.cancelBubble = true; onDelete(); }} onTap={(event) => { event.cancelBubble = true; onDelete(); }}>
                <Rect width={28} height={28} fill="#FFFFFF" stroke="#E1B7C0" cornerRadius={6} shadowColor="rgba(38, 24, 50, 0.16)" shadowBlur={6} />
                <Line points={[9, 9, 19, 9]} stroke="#A83F57" strokeWidth={1.7} lineCap="round" />
                <Line points={[11, 7, 17, 7]} stroke="#A83F57" strokeWidth={1.7} lineCap="round" />
                <Rect x={10} y={11} width={8} height={10} stroke="#A83F57" strokeWidth={1.5} cornerRadius={1} />
              </Group>
            </Group>
          ) : null}
        </>
      ) : null}
    </Group>
  );
});

function getObjectPairGaps(objects: RoomObject[]) {
  const items = objects.map((object) => {
    const box = getBoundingBox(getRoomObjectCorners(object));
    return { box, id: object.id };
  });
  const gaps: Array<{ key: string; start: PointMm; end: PointMm }> = [];
  for (let first = 0; first < items.length; first += 1) {
    for (let second = first + 1; second < items.length; second += 1) {
      const a = items[first];
      const b = items[second];
      const overlapY = a.box.minY < b.box.maxY && a.box.maxY > b.box.minY;
      const overlapX = a.box.minX < b.box.maxX && a.box.maxX > b.box.minX;
      if (overlapY) {
        const left = a.box.maxX <= b.box.minX ? a : b.box.maxX <= a.box.minX ? b : null;
        const right = left === a ? b : left === b ? a : null;
        if (left && right) {
          const gap = right.box.minX - left.box.maxX;
          if (gap >= 1) {
            const midY = (Math.max(left.box.minY, right.box.minY) + Math.min(left.box.maxY, right.box.maxY)) / 2;
            gaps.push({
              key: `${left.id}-${right.id}-x`,
              start: { x: left.box.maxX, y: midY },
              end: { x: right.box.minX, y: midY },
            });
          }
        }
      }
      if (overlapX) {
        const top = a.box.maxY <= b.box.minY ? a : b.box.maxY <= a.box.minY ? b : null;
        const bottom = top === a ? b : top === b ? a : null;
        if (top && bottom) {
          const gap = bottom.box.minY - top.box.maxY;
          if (gap >= 1) {
            const midX = (Math.max(top.box.minX, bottom.box.minX) + Math.min(top.box.maxX, bottom.box.maxX)) / 2;
            gaps.push({
              key: `${top.id}-${bottom.id}-y`,
              start: { x: midX, y: top.box.maxY },
              end: { x: midX, y: bottom.box.minY },
            });
          }
        }
      }
    }
  }
  return gaps;
}

function ObjectPairGapLabels({ objects, view, labelPositions }: { objects: RoomObject[]; view: PlanViewTransform; labelPositions?: Map<string, PointMm> }) {
  const gaps = getObjectPairGaps(objects);
  if (!gaps.length) return null;
  return (
    <Group listening={false}>
      {gaps.map((gap) => (
        <FloorDistanceSpan key={gap.key} start={gap.start} end={gap.end} view={view} labelPosition={labelPositions?.get(gap.key)} />
      ))}
    </Group>
  );
}
function RotatedObjectRect({
  fill,
  globalCompositeOperation,
  lengthMm,
  listening = true,
  rotationDeg = 0,
  view,
  widthMm,
  xMm,
  yMm,
}: {
  fill: string;
  globalCompositeOperation?: string;
  lengthMm: number;
  listening?: boolean;
  rotationDeg?: number;
  view: PlanViewTransform;
  widthMm: number;
  xMm: number;
  yMm: number;
}) {
  const width = mmToCanvas(lengthMm);
  const height = mmToCanvas(widthMm);
  return (
    <Rect
      x={view.x(xMm + lengthMm / 2)}
      y={view.y(yMm + widthMm / 2)}
      width={width}
      height={height}
      offsetX={width / 2}
      offsetY={height / 2}
      rotation={rotationDeg}
      fill={fill}
      globalCompositeOperation={globalCompositeOperation as 'destination-out' | undefined}
      listening={listening}
    />
  );
}

export function FloorMeasurementOverlay({ project, view, measurementMode, selectedObjectId, selectedPartitionId, objectPreview, partitionPreview, roomPreview, onEdit }: {
  project: TileProject;
  view: PlanViewTransform;
  measurementMode: MeasurementMode | null;
  selectedObjectId: string | null;
  selectedPartitionId: string | null;
  objectPreview: ObjectDragVisual | null;
  partitionPreview: PartitionDragVisual | null;
  roomPreview: { areaIds: Set<string>; x: number; y: number } | null;
  onEdit: (target: EditTarget) => void;
}) {
  const objects = project.objects.map((object) => object.id === objectPreview?.id ? { ...object, ...objectPreview } : object);
  return <Group name="floor-measurements">
    {(project.room.areas ?? []).map((area) => {
      const areaObjects = objects.filter((object) => object.areaId === area.id);
      const visibleObjects = areaObjects.filter((object) => measurementMode === 'objects' || object.id === selectedObjectId || object.id === objectPreview?.id);
      const visiblePartitions = (project.room.partitions ?? []).filter((partition) => partition.areaId === area.id && (measurementMode === 'objects' || partition.id === selectedPartitionId));
      const requests: LabelRequest[] = [];
      const reserved: PointMm[] = [];
      const addMetrics = (id: string, metrics: ReturnType<typeof getPartitionDistances>, partition = false) => {
        for (const edge of Object.keys(metrics) as ObjectDistanceEdge[]) {
          const { start, end } = metrics[edge];
          requests.push({ id: `${id}:${edge}`, position: { x: view.x((start.x + end.x) / 2), y: view.y((start.y + end.y) / 2) + (partition && (edge === 'left' || edge === 'right') ? -24 : 0) } });
        }
      };
      for (const object of visibleObjects) addMetrics(object.id, getObjectDistanceSpans(area.contour, object));
      for (const partition of visiblePartitions) {
        const live = partition.id === partitionPreview?.id ? { ...partition, ...partitionPreview } : partition;
        addMetrics(partition.id, getPartitionDistances(area.contour, live), true);
        if (partition.id === selectedPartitionId && !partitionPreview) reserved.push(getPartitionLengthLabelPosition(live, view));
      }
      if (measurementMode === 'objects') for (const gap of getObjectPairGaps(areaObjects)) requests.push({ id: gap.key, position: { x: view.x((gap.start.x + gap.end.x) / 2), y: view.y((gap.start.y + gap.end.y) / 2) } });
      const labelPositions = arrangeMeasurementLabels(requests, reserved);
      return <Group key={area.id} x={roomPreview?.areaIds.has(area.id) ? roomPreview.x * view.scale : 0} y={roomPreview?.areaIds.has(area.id) ? roomPreview.y * view.scale : 0}>
        {measurementMode === 'objects' ? <ObjectPairGapLabels objects={areaObjects} view={view} labelPositions={labelPositions} /> : null}
        {visibleObjects.map((object) => (
          <ObjectDistanceLabels key={object.id} contour={area.contour} object={object} view={view}
            labelPositions={labelPositions}
            onEditDistance={objectPreview ? undefined : (edge, labelPosition) => onEdit({ type: 'object-distance', edge, objectId: object.id, labelPosition })} />
        ))}
        {visiblePartitions.map((partition) => {
          const moving = partitionPreview?.id === partition.id;
          const live = moving ? { ...partition, ...partitionPreview } : partition;
          const position = getPartitionLengthLabelPosition(live, view);
          return <Group key={partition.id} name="partition-measurements">
            <PartitionDistanceLabels contour={area.contour} {...live} view={view}
              labelPositions={labelPositions}
              onEditDistance={moving ? undefined : (edge, labelPosition) => onEdit({ type: 'partition-distance', partitionId: partition.id, edge, labelPosition })} />
            {partition.id === selectedPartitionId && !moving ? <DimensionLabel x={position.x} y={position.y} text={`${segmentLength(live.start, live.end)} мм`}
              onClick={() => onEdit({ type: 'partition-length', partitionId: partition.id })} /> : null}
          </Group>;
        })}
      </Group>;
    })}
  </Group>;
}

function getPartitionLengthLabelPosition(partition: Pick<Partition, 'start' | 'end'>, view: PlanViewTransform) {
  const start = { x: view.x(partition.start.x), y: view.y(partition.start.y) };
  const end = { x: view.x(partition.end.x), y: view.y(partition.end.y) };
  const length = Math.hypot(end.x - start.x, end.y - start.y) || 1;
  let normal = { x: -(end.y - start.y) / length, y: (end.x - start.x) / length };
  if (normal.y > 0) normal = { x: -normal.x, y: -normal.y };
  return { x: (start.x + end.x) / 2 - normal.x * 25 + (end.x - start.x) / 4, y: (start.y + end.y) / 2 - normal.y * 25 + (end.y - start.y) / 4 };
}

function getObjectDistanceSpans(contour: PointMm[], object: RoomObject) {
  const corners = getRoomObjectCorners(object);
  const objectBox = getBoundingBox(corners);
  const box = getFloorZoneDistanceBounds(contour, {
    minX: objectBox.minX,
    minY: objectBox.minY,
    maxX: objectBox.maxX,
    maxY: objectBox.maxY,
    width: objectBox.width,
    height: objectBox.height,
  });
  const centerX = object.xMm + object.lengthMm / 2;
  const centerY = object.yMm + object.widthMm / 2;
  const span = (start: PointMm, end: PointMm) => ({ start, end, value: segmentLength(start, end), max: 15000 });
  return {
    left: span({ x: box.minX, y: centerY }, { x: objectBox.minX, y: centerY }),
    right: span({ x: objectBox.maxX, y: centerY }, { x: box.maxX, y: centerY }),
    top: span({ x: centerX, y: box.minY }, { x: centerX, y: objectBox.minY }),
    bottom: span({ x: centerX, y: objectBox.maxY }, { x: centerX, y: box.maxY }),
  };
}

function ObjectDistanceLabels({ contour, object, onEditDistance, labelPositions, view }: { contour: PointMm[]; object: RoomObject; onEditDistance?: (edge: ObjectDistanceEdge, position?: PointMm) => void; labelPositions?: Map<string, PointMm>; view: PlanViewTransform }) {
  const metrics = getObjectDistanceSpans(contour, object);
  return (
    <Group name="object-distances" listening={Boolean(onEditDistance)}>
      {(Object.keys(metrics) as ObjectDistanceEdge[]).map((edge) => {
        const labelPosition = labelPositions?.get(`${object.id}:${edge}`);
        return <FloorDistanceSpan key={edge} {...metrics[edge]} labelPosition={labelPosition} showZero view={view} onClick={onEditDistance ? () => onEditDistance(edge, labelPosition) : undefined} />;
      })}
    </Group>
  );
}

function FloorDistanceSpan({ start, end, onClick, showZero = false, view, unit = 'mm', labelOffsetY = 0, labelPosition }: { start: PointMm; end: PointMm; onClick?: () => void; showZero?: boolean; view: PlanViewTransform; unit?: 'mm' | 'cm'; labelOffsetY?: number; labelPosition?: PointMm }) {
  const distanceMm = Math.round(segmentLength(start, end));
  const visible = showZero || !(unit === 'mm' && distanceMm < 1);
  const ref = useRef<Konva.Group>(null);
  useKeepKonvaOnTop(ref, visible);
  if (!visible) return null;
  const x1 = view.x(start.x);
  const y1 = view.y(start.y);
  const x2 = view.x(end.x);
  const y2 = view.y(end.y);
  const horizontal = Math.abs(x2 - x1) >= Math.abs(y2 - y1);
  const label = unit === 'cm' ? `${Math.round(distanceMm / 10)} см` : `${distanceMm} мм`;
  const anchor = { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
  const position = labelPosition ?? { x: anchor.x, y: anchor.y + labelOffsetY };
  return (
    <Group ref={ref} listening={Boolean(onClick)}>
      <Line points={[x1, y1, x2, y2]} stroke="#7E668F" strokeWidth={1} dash={[4, 3]} listening={false} />
      <Line points={horizontal ? [x1, y1 - 4, x1, y1 + 4] : [x1 - 4, y1, x1 + 4, y1]} stroke="#7E668F" strokeWidth={1} listening={false} />
      <Line points={horizontal ? [x2, y2 - 4, x2, y2 + 4] : [x2 - 4, y2, x2 + 4, y2]} stroke="#7E668F" strokeWidth={1} listening={false} />
      {Math.hypot(position.x - anchor.x, position.y - anchor.y) > 12 ? <Line points={[anchor.x, anchor.y, position.x, position.y]} stroke="#7E668F" strokeWidth={0.7} listening={false} /> : null}
      <DimensionLabel x={position.x} y={position.y} text={label} onClick={onClick} />
    </Group>
  );
}

function PartitionDistanceLabels({ contour, end, start, thicknessMm, onEditDistance, id, labelPositions, view }: { contour: PointMm[]; end: PointMm; start: PointMm; thicknessMm: number; id: string; labelPositions?: Map<string, PointMm>; onEditDistance?: (edge: ObjectDistanceEdge, position?: PointMm) => void; view: PlanViewTransform }) {
  const metrics = getPartitionDistances(contour, { start, end, thicknessMm });
  return (
    <Group name="partition-distances" listening={Boolean(onEditDistance)}>
      {(Object.keys(metrics) as ObjectDistanceEdge[]).map((edge) => {
        const labelPosition = labelPositions?.get(`${id}:${edge}`);
        return <FloorDistanceSpan key={edge} {...metrics[edge]} showZero view={view} labelPosition={labelPosition} labelOffsetY={edge === 'left' || edge === 'right' ? -24 : 0} onClick={onEditDistance ? () => onEditDistance(edge, labelPosition) : undefined} />;
      })}
    </Group>
  );
}

function DimensionLabel({ compact = false, x, y, text, onClick }: { compact?: boolean; x: number; y: number; text: string; onClick?: () => void }) {
  const ref = useRef<Konva.Group>(null);
  useKeepKonvaOnTop(ref);
  const width = compact ? 64 : 74;
  const height = compact ? 18 : 20;
  return (
    <Group ref={ref} x={x} y={y} listening={Boolean(onClick)}
      onMouseDown={(event) => { event.cancelBubble = true; }} onTouchStart={(event) => { event.cancelBubble = true; }}
      onClick={(event) => { event.cancelBubble = true; onClick?.(); }} onTap={(event) => { event.cancelBubble = true; onClick?.(); }}>
      <Rect x={-width / 2} y={-height / 2} width={width} height={height} fill="#FFFFFF" stroke={onClick ? '#A385C4' : '#D9D9E2'} strokeWidth={1} cornerRadius={4} shadowColor="rgba(30, 30, 40, 0.1)" shadowBlur={compact ? 3 : 5} />
      <Text x={-width / 2 + 2} y={compact ? -4 : -5} width={width - 4} align="center" text={text} fill="#18181E" fontSize={compact ? 10 : 11} />
    </Group>
  );
}

function FloorWallDimensionLabels({
  areaId,
  compact,
  contour,
  index,
  laneOffset,
  onEdit,
  partitions,
  view,
}: {
  areaId: string;
  compact?: boolean;
  contour: PointMm[];
  index: number;
  laneOffset: number;
  onEdit?: () => void;
  partitions: Partition[];
  view: PlanViewTransform;
}) {
  const start = contour[index];
  const end = contour[(index + 1) % contour.length];
  const offsetLabel = (label: { x: number; y: number }, first: PointMm, second: PointMm) => {
    if (!laneOffset) return label;
    const box = getBoundingBox(contour);
    const center = { x: view.x(box.minX + box.width / 2), y: view.y(box.minY + box.height / 2) };
    if (Math.abs(second.x - first.x) >= Math.abs(second.y - first.y)) return { x: label.x, y: label.y + (label.y < center.y ? -laneOffset : laneOffset) };
    return { x: label.x + (label.x < center.x ? -laneOffset : laneOffset), y: label.y };
  };
  const attachedPoints = partitions
    .filter((partition) => (partition.areaId ?? 'room-1') === areaId && isPointOnSegment(partition.start, start, end))
    .map((partition) => partition.start)
    .filter((point) => segmentLength(start, point) > 1 && segmentLength(point, end) > 1)
    .sort((first, second) => segmentLength(start, first) - segmentLength(start, second));

  if (!attachedPoints.length) {
    const label = offsetLabel(getFloorDimensionPositions(contour, view, Boolean(compact))[index], start, end);
    return <DimensionLabel compact={compact} x={label.x} y={label.y} text={compact ? `${index + 1} · ${segmentLength(start, end)}` : `${segmentLength(start, end)} мм`} onClick={onEdit} />;
  }

  const splitPoints = [start, ...attachedPoints, end].filter((point, pointIndex, points) => pointIndex === 0 || segmentLength(points[pointIndex - 1], point) > 1);
  return (
    <Group>
      {splitPoints.slice(0, -1).map((point, partIndex) => {
        const next = splitPoints[partIndex + 1];
        const label = offsetLabel(getFloorSegmentDimensionPosition(contour, point, next, view, compact), point, next);
        return <DimensionLabel key={`wall-part-${index}-${partIndex}`} x={label.x} y={label.y} text={`${segmentLength(point, next)} мм`} />;
      })}
    </Group>
  );
}

function FloorPartition({ contour, onDelete, onPreview, onMove, onSelect, partition, partitions, selected, selectedSide, view }: {
  contour: PointMm[];
  onDelete: () => void;
  onPreview: (preview: PartitionDragVisual | null) => void;
  onMove: (start: PointMm, end: PointMm) => void;
  onSelect: () => void;
  partition: Partition;
  partitions: Partition[];
  selected: boolean;
  selectedSide: 'a' | 'b' | null;
  view: PlanViewTransform;
}) {
  const [rotationPreview, setRotationPreview] = useState<{ end: PointMm; start: PointMm } | null>(null);
  const [dragPreview, setDragPreview] = useState<{ end: PointMm; start: PointMm } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [rotationHintVisible, setRotationHintVisible] = useState(false);
  const partitionGroupRef = useRef<Konva.Group>(null);
  const lastValidDragRef = useRef<PointMm>({ x: 0, y: 0 });
  const overlayPartition = dragPreview ?? rotationPreview ?? partition;
  useLayoutEffect(() => {
    onPreview(dragPreview || rotationPreview ? { id: partition.id, ...overlayPartition } : null);
  }, [dragPreview, rotationPreview, partition.id, onPreview]);
  const renderPartition = isDragging ? partition : (rotationPreview ?? partition);
  const start = { x: view.x(renderPartition.start.x), y: view.y(renderPartition.start.y) };
  const end = { x: view.x(renderPartition.end.x), y: view.y(renderPartition.end.y) };
  const center = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const overlayStart = { x: view.x(overlayPartition.start.x), y: view.y(overlayPartition.start.y) };
  const overlayEnd = { x: view.x(overlayPartition.end.x), y: view.y(overlayPartition.end.y) };
  const overlayCenter = { x: (overlayStart.x + overlayEnd.x) / 2, y: (overlayStart.y + overlayEnd.y) / 2 };
  const stripeWidth = Math.max(8, partition.thicknessMm * view.scale);
  const lengthCanvas = Math.max(1, Math.hypot(end.x - start.x, end.y - start.y));
  const sideNormal = { x: -(end.y - start.y) / lengthCanvas, y: (end.x - start.x) / lengthCanvas };
  let upperNormal = { x: -(end.y - start.y) / lengthCanvas, y: (end.x - start.x) / lengthCanvas };
  if (upperNormal.y > 0) upperNormal = { x: -upperNormal.x, y: -upperNormal.y };
  const rotationHandle = { x: center.x + upperNormal.x * 48, y: center.y + upperNormal.y * 48 };
  const overlayLengthCanvas = Math.max(1, Math.hypot(overlayEnd.x - overlayStart.x, overlayEnd.y - overlayStart.y));
  let overlayUpperNormal = { x: -(overlayEnd.y - overlayStart.y) / overlayLengthCanvas, y: (overlayEnd.x - overlayStart.x) / overlayLengthCanvas };
  if (overlayUpperNormal.y > 0) overlayUpperNormal = { x: -overlayUpperNormal.x, y: -overlayUpperNormal.y };
  const horizontalClearance = Math.abs(overlayUpperNormal.x) > 0.01 ? 77 / Math.abs(overlayUpperNormal.x) : Number.POSITIVE_INFINITY;
  const verticalClearance = Math.abs(overlayUpperNormal.y) > 0.01 ? 32 / Math.abs(overlayUpperNormal.y) : Number.POSITIVE_INFINITY;
  const actionDistance = 25 + Math.min(horizontalClearance, verticalClearance);
  const actionPosition = { x: overlayCenter.x - overlayUpperNormal.x * actionDistance + (overlayEnd.x - overlayStart.x) / 4, y: overlayCenter.y - overlayUpperNormal.y * actionDistance + (overlayEnd.y - overlayStart.y) / 4 };

  function getRotatedPartition(pointer: { x: number; y: number }) {
    const normalAngle = Math.atan2(pointer.y - center.y, pointer.x - center.x);
    const directionAngle = normalAngle + Math.PI / 2;
    const lengthMm = segmentLength(partition.start, partition.end);
    const centerMm = { x: (partition.start.x + partition.end.x) / 2, y: (partition.start.y + partition.end.y) / 2 };
    return {
      start: { x: Math.round(centerMm.x - Math.cos(directionAngle) * lengthMm / 2), y: Math.round(centerMm.y - Math.sin(directionAngle) * lengthMm / 2) },
      end: { x: Math.round(centerMm.x + Math.cos(directionAngle) * lengthMm / 2), y: Math.round(centerMm.y + Math.sin(directionAngle) * lengthMm / 2) },
    };
  }

  return (
    <Group>
      <Group
        ref={partitionGroupRef}
        name="floor-partition"
        draggable={!isRotating}
        dragBoundFunc={(absolutePosition) => {
          const parent = partitionGroupRef.current?.getParent();
          if (!parent) return absolutePosition;
          const parentTransform = parent.getAbsoluteTransform().copy();
          const localPosition = parentTransform.copy().invert().point(absolutePosition);
          const requestedDeltaMm = {
            x: localPosition.x / view.scale,
            y: localPosition.y / view.scale,
          };
          const clampedDeltaMm = clampPartitionDragDelta(
            contour,
            partition,
            partitions,
            requestedDeltaMm,
            lastValidDragRef.current,
          );
          lastValidDragRef.current = clampedDeltaMm;
          return parentTransform.point({
            x: clampedDeltaMm.x * view.scale,
            y: clampedDeltaMm.y * view.scale,
          });
        }}
        onClick={(event) => { event.cancelBubble = true; onSelect(); }}
        onTap={(event) => { event.cancelBubble = true; onSelect(); }}
        onMouseDown={(event) => { event.cancelBubble = true; onSelect(); }}
        onTouchStart={(event) => { event.cancelBubble = true; onSelect(); }}
        onDragStart={(event) => {
          event.cancelBubble = true;
          lastValidDragRef.current = { x: 0, y: 0 };
          setDragPreview(partition);
          setIsDragging(true);
          onSelect();
        }}
        onDragMove={(event) => {
          if (event.target !== event.currentTarget) return;
          event.cancelBubble = true;
          const node = event.currentTarget;
          const deltaXmm = Math.round(node.x() / view.scale);
          const deltaYmm = Math.round(node.y() / view.scale);
          setDragPreview({
            start: { x: partition.start.x + deltaXmm, y: partition.start.y + deltaYmm },
            end: { x: partition.end.x + deltaXmm, y: partition.end.y + deltaYmm },
          });
        }}
        onDragEnd={(event) => {
          if (event.target !== event.currentTarget) return;
          event.cancelBubble = true;
          const node = event.currentTarget;
          const deltaXmm = Math.round(node.x() / view.scale);
          const deltaYmm = Math.round(node.y() / view.scale);
          node.position({ x: 0, y: 0 });
          setDragPreview(null);
          setIsDragging(false);
          if (deltaXmm || deltaYmm) onMove(
            { x: partition.start.x + deltaXmm, y: partition.start.y + deltaYmm },
            { x: partition.end.x + deltaXmm, y: partition.end.y + deltaYmm },
          );
        }}
      >
        {selectedSide ? (() => {
          const sideDirection = selectedSide === 'a' ? 1 : -1;
          const edgeOffset = stripeWidth / 2 + 2;
          const edgeStart = { x: start.x + sideNormal.x * edgeOffset * sideDirection, y: start.y + sideNormal.y * edgeOffset * sideDirection };
          const edgeEnd = { x: end.x + sideNormal.x * edgeOffset * sideDirection, y: end.y + sideNormal.y * edgeOffset * sideDirection };
          return (
            <Group listening={false}>
              <Line points={[edgeStart.x, edgeStart.y, edgeEnd.x, edgeEnd.y]} stroke="#777777" strokeWidth={12} opacity={0.3} shadowColor="#606060" shadowBlur={18} shadowOpacity={0.9} lineCap="round" />
              <Line points={[edgeStart.x, edgeStart.y, edgeEnd.x, edgeEnd.y]} stroke="#5E5E5E" strokeWidth={3} shadowColor="#4F4F4F" shadowBlur={20} shadowOpacity={1} lineCap="round" />
            </Group>
          );
        })() : null}
        <Line points={[start.x, start.y, end.x, end.y]} stroke={selected ? '#563779' : '#6F4F93'} strokeWidth={stripeWidth + (selected ? 4 : 2)} lineCap="butt" />
        <Line points={[start.x, start.y, end.x, end.y]} stroke={selected ? '#B99FD2' : '#CDB9DF'} strokeWidth={Math.max(4, stripeWidth - 2)} lineCap="butt" />
        <Line points={[start.x, start.y, end.x, end.y]} stroke="transparent" strokeWidth={24} />
        <Circle x={center.x} y={center.y} radius={7} fill="#6F4F93" stroke="#FFFFFF" strokeWidth={2} />
        {selected && !isDragging ? <Circle x={start.x} y={start.y} radius={5} fill="#6F4F93" /> : null}
        {selected && !isDragging ? <Circle x={end.x} y={end.y} radius={5} fill="#6F4F93" /> : null}
        {selected && !isDragging ? (
          <>
            <Line points={[center.x, center.y, rotationHandle.x, rotationHandle.y]} stroke="#8A6AAE" strokeWidth={1.5} dash={[4, 3]} listening={false} />
            <Circle
              x={rotationHandle.x}
              y={rotationHandle.y}
              radius={12}
              fill="#FFFFFF"
              stroke="#6F4F93"
              strokeWidth={2}
              draggable
              onDragStart={(event) => {
                event.cancelBubble = true;
                setIsRotating(true);
                setRotationHintVisible(true);
              }}
              onClick={(event) => { event.cancelBubble = true; setRotationHintVisible(true); }}
              onTap={(event) => { event.cancelBubble = true; setRotationHintVisible(true); }}
              onMouseDown={(event) => { event.cancelBubble = true; setRotationHintVisible(true); }}
              onTouchStart={(event) => { event.cancelBubble = true; setRotationHintVisible(true); }}
              onDragMove={(event) => {
                event.cancelBubble = true;
                const node = event.currentTarget;
                const rotated = getRotatedPartition({ x: node.x(), y: node.y() });
                if (isPartitionPlacementValid(contour, rotated.start, rotated.end, partitions, partition.id)) setRotationPreview(rotated);
              }}
              onDragEnd={(event) => {
                event.cancelBubble = true;
                const node = event.currentTarget;
                const rotated = getRotatedPartition({ x: node.x(), y: node.y() });
                node.position(rotationHandle);
                setIsRotating(false);
                setRotationPreview(null);
                if (isPartitionPlacementValid(contour, rotated.start, rotated.end, partitions, partition.id)) onMove(rotated.start, rotated.end);
              }}
            />
            <Text
              x={rotationHandle.x - 10}
              y={rotationHandle.y - 10}
              width={20}
              height={20}
              align="center"
              verticalAlign="middle"
              text="↻"
              fill="#6F4F93"
              fontSize={17}
              fontStyle="bold"
              listening={false}
            />
            {rotationHintVisible || isRotating ? (
              <Group listening={false}>
                <Text x={rotationHandle.x - 42} y={rotationHandle.y - 11} width={24} height={22} align="center" text="↶" fill="#6F4F93" fontSize={20} fontStyle="bold" />
                <Text x={rotationHandle.x + 18} y={rotationHandle.y - 11} width={24} height={22} align="center" text="↷" fill="#6F4F93" fontSize={20} fontStyle="bold" />
              </Group>
            ) : null}
          </>
        ) : null}
      </Group>

      {selected && !isDragging && !isRotating && rotationPreview === null ? (
        <Group x={actionPosition.x - 14} y={actionPosition.y - 14}>
          <Group onClick={(event) => { event.cancelBubble = true; onDelete(); }} onTap={(event) => { event.cancelBubble = true; onDelete(); }}>
            <Rect width={28} height={28} fill="#FFFFFF" stroke="#E1B7C0" cornerRadius={6} shadowColor="rgba(38, 24, 50, 0.16)" shadowBlur={6} />
            <Line points={[9, 9, 19, 9]} stroke="#A83F57" strokeWidth={1.7} lineCap="round" />
            <Line points={[11, 7, 17, 7]} stroke="#A83F57" strokeWidth={1.7} lineCap="round" />
            <Rect x={10} y={11} width={8} height={10} stroke="#A83F57" strokeWidth={1.5} cornerRadius={1} />
          </Group>
        </Group>
      ) : null}
    </Group>
  );
}

function FloorOpeningMarkers({
  dragVisual,
  onDragVisual,
  areaId,
  contour,
  onEditDistance,
  onMoveOpening,
  onSelectOpening,
  project,
  selectedOpeningId,
  showDistances,
  showNames,
  view,
}: {
  dragVisual: { id: string; xMm: number } | null;
  onDragVisual: (next: { id: string; xMm: number } | null) => void;
  areaId: string;
  contour: PointMm[];
  onEditDistance: (target: EditTarget) => void;
  onMoveOpening: (openingId: string, xMm: number) => void;
  onSelectOpening: (surfaceId: string, openingId: string) => void;
  project: TileProject;
  selectedOpeningId: string | null;
  showDistances: boolean;
  showNames: boolean;
  view: PlanViewTransform;
}) {
  const pairedPreview = dragVisual ? constrainConnectedOpeningPosition(project, dragVisual.id, dragVisual.xMm) : null;
  return (
    <Group>
      {contour.flatMap((point, index) => {
        const next = contour[(index + 1) % contour.length];
        const surface = project.surfaces.find((item) => item.type === 'wall' && item.sourceRef === `wall:${areaId}:${index + 1}`);
        if (!surface) return [];
        return surface.openings.map((opening) => (
          <FloorOpeningMarker
            key={`floor-opening-${opening.id}`}
            end={next}
            onEditDistance={(edge, position, value, max) => onEditDistance({ type: 'opening-distance', openingId: opening.id, edge, position, value, max })}
            onMove={(xMm) => onMoveOpening(opening.id, xMm)}
            onDragVisual={(xMm) => onDragVisual(xMm === null ? null : { id: opening.id, xMm })}
            constrainX={(xMm) => opening.connectedOpeningId ? constrainConnectedOpeningPosition(project, opening.id, xMm).xMm : xMm}
            onSelect={() => onSelectOpening(surface.id, opening.id)}
            opening={pairedPreview?.linkedId === opening.id && pairedPreview.linkedXmm !== undefined ? { ...opening, xMm: pairedPreview.linkedXmm } : opening}
            otherOpenings={surface.openings.filter((item) => item.id !== opening.id)}
            previewXmm={dragVisual?.id === opening.id ? dragVisual.xMm : undefined}
            selected={selectedOpeningId === opening.id}
            showDistances={showDistances}
            showName={showNames}
            start={point}
            surface={surface}
            view={view}
          />
        ));
      })}
    </Group>
  );
}

function FloorOpeningMarker({ end, onEditDistance, onMove, onSelect, onDragVisual, constrainX, opening, otherOpenings, previewXmm, selected, showDistances, showName, start, surface, view }: {
  onDragVisual: (xMm: number | null) => void;
  constrainX: (xMm: number) => number;
  end: PointMm;
  onEditDistance: (edge: 'start' | 'end', position: PointMm, value: number, max: number) => void;
  onMove: (xMm: number) => void;
  onSelect: () => void;
  opening: Opening;
  otherOpenings: Opening[];
  previewXmm?: number;
  selected: boolean;
  showDistances: boolean;
  showName: boolean;
  start: PointMm;
  surface: TileProject['surfaces'][number];
  view: PlanViewTransform;
}) {
  const groupRef = useRef<Konva.Group>(null);
  const wallLength = Math.max(1, segmentLength(start, end));
  const vectorX = (end.x - start.x) / wallLength;
  const vectorY = (end.y - start.y) / wallLength;
  const startOffset = Math.max(0, Math.min(opening.xMm, Math.max(0, wallLength - opening.widthMm)));
  const endOffset = Math.max(startOffset, Math.min(opening.xMm + opening.widthMm, wallLength));
  const openingStart = { x: start.x + vectorX * startOffset, y: start.y + vectorY * startOffset };
  const openingEnd = { x: start.x + vectorX * endOffset, y: start.y + vectorY * endOffset };
  const labelX = (view.x(openingStart.x) + view.x(openingEnd.x)) / 2;
  const labelY = (view.y(openingStart.y) + view.y(openingEnd.y)) / 2;
  const guideOffsetX = -vectorY * 22;
  const guideOffsetY = vectorX * 22;
  const guideStartOffset = Math.max(0, Math.min(previewXmm ?? opening.xMm, Math.max(0, wallLength - opening.widthMm)));
  const guideEndOffset = Math.max(guideStartOffset, Math.min(guideStartOffset + opening.widthMm, wallLength));
  const guideOpeningStart = { x: start.x + vectorX * guideStartOffset, y: start.y + vectorY * guideStartOffset };
  const guideOpeningEnd = { x: start.x + vectorX * guideEndOffset, y: start.y + vectorY * guideEndOffset };
  const wallStartCanvas = { x: view.x(start.x) + guideOffsetX, y: view.y(start.y) + guideOffsetY };
  const openingStartCanvas = { x: view.x(guideOpeningStart.x) + guideOffsetX, y: view.y(guideOpeningStart.y) + guideOffsetY };
  const openingEndCanvas = { x: view.x(guideOpeningEnd.x) + guideOffsetX, y: view.y(guideOpeningEnd.y) + guideOffsetY };
  const wallEndCanvas = { x: view.x(end.x) + guideOffsetX, y: view.y(end.y) + guideOffsetY };
  const maxDistanceMm = Math.max(0, Math.round(wallLength - opening.widthMm));
  const startDistanceMm = Math.round(guideStartOffset);
  const endDistanceMm = Math.round(Math.max(0, wallLength - guideEndOffset));

  function resolvedXForDelta(deltaCanvasX: number, deltaCanvasY: number) {
    const deltaMm = (deltaCanvasX * vectorX + deltaCanvasY * vectorY) / view.scale;
    return constrainX(constrainOpeningPosition(surface, opening, otherOpenings, opening.xMm + deltaMm, opening.yMm).xMm);
  }

  return (
    <>
      <Group
      ref={groupRef}
      draggable
      dragBoundFunc={(absolutePosition) => {
        const parent = groupRef.current?.getParent();
        if (!parent) return absolutePosition;
        const transform = parent.getAbsoluteTransform().copy();
        const local = transform.copy().invert().point(absolutePosition);
        const resolvedX = resolvedXForDelta(local.x, local.y);
        const deltaCanvas = (resolvedX - opening.xMm) * view.scale;
        return transform.point({ x: vectorX * deltaCanvas, y: vectorY * deltaCanvas });
      }}
      onClick={(event) => { event.cancelBubble = true; onSelect(); }}
      onTap={(event) => { event.cancelBubble = true; onSelect(); }}
      onMouseDown={(event) => { event.cancelBubble = true; onSelect(); }}
      onTouchStart={(event) => { event.cancelBubble = true; onSelect(); }}
      onMouseEnter={(event) => {
        const container = event.target.getStage()?.container();
        if (container) container.style.cursor = 'grab';
      }}
      onMouseLeave={(event) => {
        const container = event.target.getStage()?.container();
        if (container) container.style.cursor = '';
      }}
      onDragStart={(event) => {
        event.cancelBubble = true;
        onSelect();
        const container = event.target.getStage()?.container();
        if (container) container.style.cursor = 'grabbing';
      }}
      onDragMove={(event) => {
        event.cancelBubble = true;
        onDragVisual(resolvedXForDelta(event.currentTarget.x(), event.currentTarget.y()));
      }}
      onDragEnd={(event) => {
        event.cancelBubble = true;
        const node = event.currentTarget;
        const resolvedX = resolvedXForDelta(node.x(), node.y());
        node.position({ x: 0, y: 0 });
        const container = event.target.getStage()?.container();
        if (container) container.style.cursor = 'grab';
        onMove(resolvedX);
        onDragVisual(null);
      }}
    >
      <Line
        points={[view.x(openingStart.x), view.y(openingStart.y), view.x(openingEnd.x), view.y(openingEnd.y)]}
        stroke="rgba(111, 79, 147, 0.01)"
        strokeWidth={30}
        lineCap="round"
      />
      <Line
        points={[view.x(openingStart.x), view.y(openingStart.y), view.x(openingEnd.x), view.y(openingEnd.y)]}
        stroke={selected ? '#563779' : '#765594'}
        strokeWidth={selected ? 14 : 10}
        lineCap="round"
        opacity={selected ? 0.94 : 0.68}
        shadowColor={selected ? '#6F4F93' : undefined}
        shadowBlur={selected ? 8 : 0}
      />
      {showName && opening.kind !== 'window' ? <Text x={labelX - 38} y={labelY - 25} width={76} align="center" text={getOpeningDisplayName(opening)} fill="#563779" fontSize={11} listening={false} /> : null}
      </Group>
      {selected || showDistances ? (
        <>
          <FloorOpeningDistanceGuide
            start={wallStartCanvas}
            end={openingStartCanvas}
            value={startDistanceMm}
            onEdit={(position) => onEditDistance('start', position, startDistanceMm, maxDistanceMm)}
          />
          <FloorOpeningDistanceGuide
            start={openingEndCanvas}
            end={wallEndCanvas}
            value={endDistanceMm}
            onEdit={(position) => onEditDistance('end', position, endDistanceMm, maxDistanceMm)}
          />
        </>
      ) : null}
    </>
  );
}

function FloorOpeningDistanceGuide({ end, onEdit, start, value }: {
  end: PointMm;
  onEdit: (position: PointMm) => void;
  start: PointMm;
  value: number;
}) {
  const middle = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const horizontal = Math.abs(end.x - start.x) >= Math.abs(end.y - start.y);
  return (
    <Group
      onClick={(event) => { event.cancelBubble = true; onEdit(middle); }}
      onTap={(event) => { event.cancelBubble = true; onEdit(middle); }}
    >
      <Line points={[start.x, start.y, end.x, end.y]} stroke="#765594" strokeWidth={1.2} dash={[5, 4]} />
      <Line points={horizontal ? [start.x, start.y - 4, start.x, start.y + 4] : [start.x - 4, start.y, start.x + 4, start.y]} stroke="#765594" strokeWidth={1.2} />
      <Line points={horizontal ? [end.x, end.y - 4, end.x, end.y + 4] : [end.x - 4, end.y, end.x + 4, end.y]} stroke="#765594" strokeWidth={1.2} />
      <Group x={middle.x} y={middle.y}>
        <Rect x={-31} y={-10} width={62} height={20} fill="#FFFFFF" stroke="#CDB9DF" strokeWidth={1} cornerRadius={5} shadowColor="rgba(38, 24, 50, 0.12)" shadowBlur={4} />
        <Text x={-29} y={-6} width={58} align="center" text={`${value} мм`} fill="#4E4458" fontSize={10} />
      </Group>
    </Group>
  );
}

function WallsLayer({
  block,
  dimensionsVisible,
  tileOffsetsVisible,
  objectDistancesVisible,
  frames,
  sections,
  onChangeHeight,
  onDeleteObject,
  onDeleteOpening,
  onEditObject,
  onEditLayoutOffset,
  onEditSegment,
  onMoveOpening,
  onMoveObjectOnWall,
  onRenameArea,
  onResizeOpening,
  onResetOpening,
  onSelectObject,
  onSelectOpening,
  onSelectWall,
  onSelectZone,
  onZonePolygonChange,
  onZoneShapeChange,
  project,
  relatedZoneWallIds,
  selectedOpeningId,
  selectedObjectId,
  selectedSurfaceId,
  selectedZoneId,
  selectedWallIndex,
  showOpeningNames,
  calculationSelecting = false,
  calculationSelectedIds,
  onToggleArea,
}: {
  block: CanvasSectionBlock;
  dimensionsVisible: boolean;
  tileOffsetsVisible: boolean;
  objectDistancesVisible: boolean;
  frames: WallFrame[];
  sections: WallAreaSection[];
  onChangeHeight: (areaId: string, value: string) => void;
  onDeleteObject: (objectId: string) => void;
  onDeleteOpening: (openingId: string) => void;
  onEditLayoutOffset: (target: EditTarget) => void;
  onEditSegment: (target: EditTarget) => void;
  onMoveOpening: (openingId: string, xMm: number, yMm?: number) => void;
  onMoveObjectOnWall: (objectId: string, surfaceId: string, offsetMm: number, elevationMm: number) => void;
  onRenameArea: (areaId: string) => void;
  onEditObject: (objectId: string) => void;
  onResizeOpening: (openingId: string, patch: Pick<Opening, 'xMm' | 'yMm' | 'widthMm' | 'heightMm'>) => void;
  onResetOpening: (openingId: string) => void;
  onSelectObject: (objectId: string | null) => void;
  onSelectOpening: (surfaceId: string, openingId: string) => void;
  onSelectWall: (index: number | null) => void;
  onSelectZone: (surfaceId: string, zoneId: string | null) => void;
  onZonePolygonChange: (surfaceId: string, zoneId: string, points: PointMm[]) => void;
  onZoneShapeChange: (surfaceId: string, zoneId: string, patch: Partial<Extract<FinishZone['shape'], { type: 'rect' }>>) => void;
  project: TileProject;
  relatedZoneWallIds: string[];
  selectedOpeningId: string | null;
  selectedObjectId: string | null;
  selectedSurfaceId: string | null;
  selectedZoneId: string | null;
  selectedWallIndex: number | null;
  showOpeningNames: boolean;
  calculationSelecting?: boolean;
  calculationSelectedIds?: Set<string>;
  onToggleArea: (areaId: string) => void;
}) {
  const [stackConflictIds, setStackConflictIds] = useState<string[]>([]);
  const [stackHint, setStackHint] = useState<string | null>(null);
  const [objectPreview, setObjectPreview] = useState<{ id: string; surfaceId: string; offsetMm: number; elevationMm: number } | null>(null);
  const [zoneDragPreview, setZoneDragPreview] = useState<{ id: string; delta: PointMm } | null>(null);
  const [scheduleObjectPreview, flushObjectPreview] = useAnimationFrameCallback(setObjectPreview);
  const firstFramesByArea = frames.filter((frame, index) => frames.findIndex((item) => item.areaId === frame.areaId) === index);
  const renderData = useMemo(() => {
    const areasById = new Map((project.room.areas ?? []).map((area) => [area.id, area]));
    const materialsById = new Map(project.materials.map((material) => [material.id, material]));
    const surfacesById = new Map(project.surfaces.map((surface) => [surface.id, surface]));
    const projectionsBySurface = new Map<string, Array<{ object: RoomObject; projection: { offsetMm: number; widthMm: number } }>>();
    for (const frame of frames) {
      const projections = project.objects.flatMap((object) => {
        const projection = getRoomObjectWallProjection(project, frame.id, object);
        return projection ? [{ object, projection }] : [];
      });
      projectionsBySurface.set(frame.id, projections);
    }
    return { areasById, materialsById, projectionsBySurface, surfacesById };
  }, [frames, project]);

  function resizeWallHeightFromPointer(event: Konva.KonvaEventObject<DragEvent>, areaFrame: WallFrame, heightMarkerX: number) {
    event.cancelBubble = true;
    const node = event.currentTarget;
    const pointer = node.getStage()?.getPointerPosition();
    const parent = node.getParent();
    if (!pointer || !parent) return;
    const localPointer = parent.getAbsoluteTransform().copy().invert().point(pointer);
    const nextHeightMm = Math.max(1800, Math.min(4500, Math.round(canvasToMm(localPointer.y - areaFrame.y))));
    node.position({ x: heightMarkerX, y: areaFrame.y + mmToCanvas(nextHeightMm) });
    if (nextHeightMm !== areaFrame.heightMm) onChangeHeight(areaFrame.areaId, String(nextHeightMm));
  }

  return (
    <Group>
      <Text x={block.x + 18} y={block.y + 16} text="Стены" fill="#6B6B80" fontSize={18} listening={false} />
      {sections.map((section) => (
        <Group
          key={`wall-section-${section.areaId}`}
          onClick={(event) => { event.cancelBubble = true; onToggleArea(section.areaId); }}
          onTap={(event) => { event.cancelBubble = true; onToggleArea(section.areaId); }}
        >
          <Rect
            x={section.x}
            y={section.headerY}
            width={section.width}
            height={72}
            fill={section.expanded ? '#F2EBF9' : '#F8F5FB'}
            stroke="#CDB9DF"
            strokeWidth={1}
            cornerRadius={8}
            shadowColor="rgba(45, 31, 58, 0.08)"
            shadowBlur={5}
          />
          <Text x={section.x + 16} y={section.headerY + 26} text={section.name} fill="#4E4458" fontSize={15} />
          <Text
            x={section.x + section.width - 72}
            y={section.headerY + 25}
            width={24}
            align="center"
            text="✎"
            fill="#8A6AAE"
            fontSize={17}
            onClick={(event) => { event.cancelBubble = true; onRenameArea(section.areaId); }}
            onTap={(event) => { event.cancelBubble = true; onRenameArea(section.areaId); }}
          />
          <Text x={section.x + section.width - 34} y={section.headerY + 27} width={20} align="center" text={section.expanded ? '▲' : '▼'} fill="#8A6AAE" fontSize={13} />
        </Group>
      ))}
      {frames.map((frame) => {
        const active = selectedSurfaceId === frame.id;
        const relatedToZone = relatedZoneWallIds.includes(frame.id);
        const layoutOpacity = calculationSelecting ? 1 : selectedSurfaceId && !active ? 0.38 : 1;
        const groupOpacity = calculationSelecting && !calculationSelectedIds?.has(frame.id) ? 0.28 : 1;
        const surface = renderData.surfacesById.get(frame.id);
        const titleWidth = Math.max(frame.width, 150);
        const material = surface?.zones[0]?.materialId ? renderData.materialsById.get(surface.zones[0]?.materialId) : null;
        const layout = surface?.zones[0]?.layout;
        const frameAreaLocked = renderData.areasById.get(frame.areaId)?.shapeLocked ?? false;
        const wallObjectProjections = renderData.projectionsBySurface.get(frame.id) ?? [];
        const wallObjectBlockers = wallObjectProjections.flatMap(({ object, projection }) => object.excludeWallTile ? [{ type: 'rect' as const, xMm: projection.offsetMm, yMm: Math.max(0, frame.heightMm - object.elevationMm - object.heightMm), widthMm: projection.widthMm, heightMm: object.heightMm }] : []);
        return (
          <Group
            key={frame.id}
            opacity={groupOpacity}
            onClick={(event) => {
              if (!event.target.findAncestor('.wall-opening')) onSelectWall(frame.index);
            }}
            onTap={(event) => {
              if (!event.target.findAncestor('.wall-opening')) onSelectWall(frame.index);
            }}
          >
            <Rect
              x={frame.x}
              y={frame.y}
              width={frame.width}
              height={frame.height}
              fill="#FFFFFF"
            />
            {material && layout && surface?.zones[0] ? (
              <WallTileLayout
                frame={frame}
                layout={layout}
                material={material}
                onEditOffset={(edge) => onEditLayoutOffset({ type: 'layout-offset', edge, surfaceId: frame.id, zoneId: surface.zones[0]!.id })}
                objectBlockers={wallObjectBlockers}
                opacity={layoutOpacity}
                showEdgeCuts={tileOffsetsVisible && active && !selectedZoneId && !selectedOpeningId && !selectedObjectId}
              />
            ) : null}
            {surface?.zones.slice(1).map((zone) => {
              const zoneMaterial = zone.materialId ? renderData.materialsById.get(zone.materialId) : null;
              if (!zoneMaterial) return null;
              return (
                <WallZoneLayer
                  frame={frame}
                  key={zone.id}
                  material={zoneMaterial}
                  objectBlockers={wallObjectBlockers}
                  onEditOffset={(edge) => onEditLayoutOffset({ type: 'layout-offset', edge, surfaceId: frame.id, zoneId: zone.id })}
                  onPolygonChange={(points) => onZonePolygonChange(frame.id, zone.id, points)}
                  onSelect={() => onSelectZone(frame.id, zone.id)}
                  onShapeChange={(patch) => onZoneShapeChange(frame.id, zone.id, patch)}
                  onDragPreview={(delta) => setZoneDragPreview(delta ? { id: zone.id, delta } : null)}
                  opacity={active && selectedZoneId !== zone.id ? 0.48 : 1}
                  openings={surface.openings}
                  selected={selectedZoneId === zone.id}
                  showEdgeCuts={tileOffsetsVisible}
                  zone={zone}
                />
              );
            })}
            {surface?.zones.slice(1).filter((zone) => zone.id === selectedZoneId).map((zone) => (
              <ZoneClearanceLabels
                key={`clearances-${zone.id}`}
                bounds={getZoneMeasurementBounds(zone)}
                contour={[{ x: 0, y: 0 }, { x: frame.widthMm, y: 0 }, { x: frame.widthMm, y: frame.heightMm }, { x: 0, y: frame.heightMm }]}
                delta={zoneDragPreview?.id === zone.id ? zoneDragPreview.delta : { x: 0, y: 0 }}
                view={{ scale: PX_PER_MM, x: (value) => frame.x + mmToCanvas(value), y: (value) => frame.y + mmToCanvas(value), toPoint: (x, y) => ({ x: canvasToMm(x - frame.x), y: canvasToMm(y - frame.y) }) }}
              />
            ))}
            {surface ? (
              <WallOpeningMarkers
                frame={frame}
                onDeleteOpening={onDeleteOpening}
                onMoveOpening={onMoveOpening}
                onResizeOpening={onResizeOpening}
                onResetOpening={onResetOpening}
                onSelectOpening={(openingId) => onSelectOpening(frame.id, openingId)}
                openings={surface.openings}
                selectedOpeningId={selectedOpeningId}
                showOpeningNames={showOpeningNames}
              />
            ) : null}
            {wallObjectProjections.flatMap(({ object, projection }) => object.excludeWallTile ? [(
              <Rect
                key={`wall-clear-${frame.id}-${object.id}`}
                x={frame.x + mmToCanvas(projection.offsetMm)}
                y={frame.y + mmToCanvas(Math.max(0, frame.heightMm - object.elevationMm - object.heightMm))}
                width={mmToCanvas(projection.widthMm)}
                height={mmToCanvas(object.heightMm)}
                fill="#FFFFFF"
                listening={false}
              />
            )] : [])}
            {wallObjectProjections.map(({ object, projection }) => (
                <WallRoomObject
                  key={`wall-object-${frame.id}-${object.id}`}
                  conflictHighlight={stackConflictIds.includes(object.id)}
                  frame={frame}
                  object={object}
                  onDelete={() => onDeleteObject(object.id)}
                  onEdit={() => onEditObject(object.id)}
                  onMove={(offsetMm, elevationMm) => onMoveObjectOnWall(object.id, frame.id, offsetMm, elevationMm)}
                  onPreview={(position) => position ? scheduleObjectPreview({ ...position, id: object.id, surfaceId: frame.id }) : flushObjectPreview(null)}
                  onSelect={() => onSelectObject(object.id)}
                  onStackConflictChange={(conflictIds, hint) => {
                    setStackConflictIds(conflictIds);
                    setStackHint(hint);
                  }}
                  projection={projection}
                  selected={selectedObjectId === object.id}
                  siblings={wallObjectProjections
                    .filter((item) => item.object.id !== object.id)
                    .map((item) => ({
                      elevationMm: item.object.elevationMm,
                      heightMm: item.object.heightMm,
                      id: item.object.id,
                      offsetMm: item.projection.offsetMm,
                      widthMm: item.projection.widthMm,
                    }))}
                />
            ))}
            <Rect
              x={frame.x}
              y={frame.y}
              width={frame.width}
              height={frame.height}
              stroke={active ? '#A385C4' : relatedToZone ? '#C4B0D6' : '#D0D0D8'}
              strokeWidth={active ? 4 : relatedToZone ? 2.5 : 1}
              listening={false}
            />
            <Text
              x={frame.x - (titleWidth - frame.width) / 2}
              y={tileOffsetsVisible && active ? frame.y - 48 : frame.y - 21}
              width={titleWidth}
              align="center"
              text={frame.name}
              fill="#6B6B80"
              fontSize={13}
              wrap="none"
              listening={false}
            />
            {dimensionsVisible && active && !selectedZoneId && !selectedOpeningId && !selectedObjectId ? (
              <DimensionLabel
                x={frame.x + frame.width / 2}
                y={frame.y + frame.height + 50}
                text={`${frame.widthMm} мм`}
                onClick={frameAreaLocked ? undefined : () => onEditSegment({ type: 'wall-segment', areaId: frame.areaId, index: frame.segmentIndex, surfaceId: frame.id })}
              />
            ) : null}
          </Group>
        );
      })}
      {objectDistancesVisible ? frames.map((frame) => {
        const objects = (renderData.projectionsBySurface.get(frame.id) ?? []).map(({ object, projection }) => {
          const live = objectPreview?.id === object.id && objectPreview.surfaceId === frame.id ? objectPreview : { ...projection, elevationMm: object.elevationMm };
          return { ...object, rotationDeg: 0, xMm: live.offsetMm, yMm: Math.max(0, frame.heightMm - live.elevationMm - object.heightMm), lengthMm: projection.widthMm, widthMm: Math.min(object.heightMm, frame.heightMm) };
        });
        const contour = [{ x: 0, y: 0 }, { x: frame.widthMm, y: 0 }, { x: frame.widthMm, y: frame.heightMm }, { x: 0, y: frame.heightMm }];
        const view: PlanViewTransform = { scale: PX_PER_MM, x: (x) => frame.x + mmToCanvas(x), y: (y) => frame.y + mmToCanvas(y), toPoint: (x, y) => ({ x: canvasToMm(x - frame.x), y: canvasToMm(y - frame.y) }) };
        const requests = objects.flatMap((object) => Object.entries(getObjectDistanceSpans(contour, object)).map(([edge, metric]) => ({ id: `${object.id}:${edge}`, position: { x: view.x((metric.start.x + metric.end.x) / 2), y: view.y((metric.start.y + metric.end.y) / 2) } })));
        for (const gap of getObjectPairGaps(objects)) requests.push({ id: gap.key, position: { x: view.x((gap.start.x + gap.end.x) / 2), y: view.y((gap.start.y + gap.end.y) / 2) } });
        const labelPositions = arrangeMeasurementLabels(requests);
        return <Group key={`wall-distances-${frame.id}`} listening={false}>
          <ObjectPairGapLabels objects={objects} view={view} labelPositions={labelPositions} />
          {objects.map((object) => <ObjectDistanceLabels key={object.id} object={object} contour={contour} view={view} labelPositions={labelPositions} />)}
        </Group>;
      }) : null}
      {dimensionsVisible && !selectedZoneId && !selectedOpeningId && !selectedObjectId ? firstFramesByArea.filter((areaFrame) => frames.some((frame) => frame.areaId === areaFrame.areaId && frame.id === selectedSurfaceId)).map((areaFrame) => {
        const heightMarkerX = areaFrame.x - 90;
        return (
          <Group key={`height-${areaFrame.areaId}`}>
            <Line points={[heightMarkerX, areaFrame.y, heightMarkerX, areaFrame.y + areaFrame.height]} stroke="#8F8FA3" strokeWidth={1.5} />
            <Line points={[heightMarkerX - 6, areaFrame.y, heightMarkerX + 6, areaFrame.y]} stroke="#8F8FA3" strokeWidth={1.5} />
            <Line points={[heightMarkerX - 6, areaFrame.y + areaFrame.height, heightMarkerX + 6, areaFrame.y + areaFrame.height]} stroke="#8F8FA3" strokeWidth={1.5} />
            <DimensionLabel x={heightMarkerX - 54} y={areaFrame.y + areaFrame.height / 2} text={`${areaFrame.heightMm} мм`} onClick={() => onEditSegment({ type: 'wall-height', areaId: areaFrame.areaId })} />
            <Circle
              x={heightMarkerX}
              y={areaFrame.y + areaFrame.height}
              radius={6}
              fill="#FFFFFF"
              stroke="#6F4F93"
              strokeWidth={2}
              draggable
              onMouseDown={(event) => { event.cancelBubble = true; }}
              onTouchStart={(event) => { event.cancelBubble = true; }}
              onDragStart={(event) => { event.cancelBubble = true; }}
              onDragMove={(event) => resizeWallHeightFromPointer(event, areaFrame, heightMarkerX)}
              onDragEnd={(event) => resizeWallHeightFromPointer(event, areaFrame, heightMarkerX)}
            />
          </Group>
        );
      }) : null}
      {selectedOpeningId ? frames.flatMap((frame) => {
        const surface = renderData.surfacesById.get(frame.id);
        const opening = surface?.openings.find((item) => item.id === selectedOpeningId);
        if (!opening) return [];
        return [(
          <WallOpening
            key={`selected-opening-overlay-${opening.id}`}
            frame={frame}
            opening={opening}
            siblingOpenings={(surface?.openings ?? []).filter((item) => item.id !== opening.id)}
            onDelete={() => onDeleteOpening(opening.id)}
            onMove={(xMm, yMm) => onMoveOpening(opening.id, xMm, yMm)}
            onResize={(patch) => onResizeOpening(opening.id, patch)}
            onReset={() => onResetOpening(opening.id)}
            onSelect={() => onSelectOpening(frame.id, opening.id)}
            selected
            showName={showOpeningNames}
          />
        )];
      }) : null}
      {stackHint ? (
        <Group listening={false}>
          <Rect
            x={block.x + 18}
            y={block.y + 48}
            width={Math.min(420, block.width - 36)}
            height={56}
            fill="#FBE3E3"
            stroke="#E3A9A9"
            cornerRadius={10}
          />
          <Text
            x={block.x + 30}
            y={block.y + 58}
            width={Math.min(396, block.width - 60)}
            text={stackHint}
            fill="#C62828"
            fontSize={13}
            lineHeight={1.25}
          />
        </Group>
      ) : null}
    </Group>
  );
}

function WallRoomObject({ conflictHighlight = false, frame, object, onDelete, onEdit, onMove, onPreview, onSelect, onStackConflictChange, projection, selected, siblings }: {
  conflictHighlight?: boolean;
  frame: WallFrame;
  object: RoomObject;
  onDelete: () => void;
  onEdit: () => void;
  onMove: (offsetMm: number, elevationMm: number) => void;
  onPreview: (position: { offsetMm: number; elevationMm: number } | null) => void;
  onSelect: () => void;
  onStackConflictChange: (conflictIds: string[], hint: string | null) => void;
  projection: { offsetMm: number; widthMm: number };
  selected: boolean;
  siblings: Array<{ elevationMm: number; heightMm: number; id: string; offsetMm: number; widthMm: number }>;
}) {
  const width = Math.max(8, mmToCanvas(projection.widthMm));
  const heightMm = Math.min(object.heightMm, frame.heightMm);
  const height = Math.max(8, mmToCanvas(heightMm));
  const x = frame.x + mmToCanvas(projection.offsetMm);
  const y = frame.y + frame.height - mmToCanvas(object.elevationMm + heightMm);
  const lastValidRef = useRef({ offsetMm: projection.offsetMm, elevationMm: object.elevationMm, x, y });

  function constrainWallDrag(node: Konva.Node) {
    const nextX = Math.max(frame.x, Math.min(node.x(), frame.x + frame.width - width));
    const rawY = Math.max(frame.y, Math.min(node.y(), frame.y + frame.height - height));
    const offsetMm = Math.round(canvasToMm(nextX - frame.x));
    const topMm = Math.round(canvasToMm(rawY - frame.y));
    const requestedElevation = Math.max(0, frame.heightMm - topMm - heightMm);
    const stack = resolveWallObjectStacking(heightMm, frame.heightMm, offsetMm, projection.widthMm, requestedElevation, siblings);
    if (stack.conflictIds.length) {
      node.position({ x: lastValidRef.current.x, y: lastValidRef.current.y });
      onStackConflictChange(stack.conflictIds, OBJECT_STACK_CONFLICT_HINT);
      return lastValidRef.current;
    }
    const nextY = frame.y + frame.height - mmToCanvas(stack.elevationMm + heightMm);
    node.position({ x: nextX, y: nextY });
    const settled = { offsetMm, elevationMm: stack.elevationMm, x: nextX, y: nextY };
    lastValidRef.current = settled;
    onStackConflictChange([], null);
    return settled;
  }

  const fill = conflictHighlight ? '#FBE3E3' : ROOM_OBJECT_FILL;
  const stroke = conflictHighlight ? '#C62828' : ROOM_OBJECT_STROKE;
  const textFill = conflictHighlight ? '#C62828' : '#FFFFFF';

  return (
    <Group
      name="wall-room-object"
      x={x}
      y={y}
      draggable
      onClick={(event) => { event.cancelBubble = true; onSelect(); }}
      onTap={(event) => { event.cancelBubble = true; onSelect(); }}
      onMouseDown={(event) => { event.cancelBubble = true; onSelect(); }}
      onTouchStart={(event) => { event.cancelBubble = true; onSelect(); }}
      onDragStart={(event) => {
        event.cancelBubble = true;
        lastValidRef.current = { offsetMm: projection.offsetMm, elevationMm: object.elevationMm, x: event.currentTarget.x(), y: event.currentTarget.y() };
        onSelect();
      }}
      onDragMove={(event) => { event.cancelBubble = true; onPreview(constrainWallDrag(event.currentTarget)); }}
      onDragEnd={(event) => {
        event.cancelBubble = true;
        const position = constrainWallDrag(event.currentTarget);
        onPreview(null);
        onStackConflictChange([], null);
        onMove(position.offsetMm, position.elevationMm);
      }}
    >
      <Rect width={width} height={height} fill={fill} opacity={conflictHighlight ? 0.92 : ROOM_OBJECT_OPACITY} stroke={stroke} strokeWidth={selected || conflictHighlight ? 3 : 2} cornerRadius={6} />
      <Text x={4} y={Math.max(4, height / 2 - 7)} width={Math.max(20, width - 8)} align="center" text={object.name} fill={textFill} fontSize={11} listening={false} />
      {selected && !conflictHighlight ? <DraftLengthLabel x={width / 2} y={-18} text={`${projection.widthMm} × ${object.heightMm} мм`} /> : null}
      {selected && !conflictHighlight ? (
        <Group x={width / 2 - 32} y={height + 9}>
          <Group onClick={(event) => { event.cancelBubble = true; onEdit(); }} onTap={(event) => { event.cancelBubble = true; onEdit(); }}>
            <Rect width={28} height={28} fill="#FFFFFF" stroke="#CDB9DF" cornerRadius={6} shadowColor="rgba(38, 24, 50, 0.16)" shadowBlur={6} />
            <Text x={2} y={2} width={24} height={24} align="center" verticalAlign="middle" text="✎" fill="#6F4F93" fontSize={18} />
          </Group>
          <Group x={36} onClick={(event) => { event.cancelBubble = true; onDelete(); }} onTap={(event) => { event.cancelBubble = true; onDelete(); }}>
            <Rect width={28} height={28} fill="#FFFFFF" stroke="#E1B7C0" cornerRadius={6} shadowColor="rgba(38, 24, 50, 0.16)" shadowBlur={6} />
            <Line points={[9, 9, 19, 9]} stroke="#A83F57" strokeWidth={1.7} lineCap="round" />
            <Line points={[11, 7, 17, 7]} stroke="#A83F57" strokeWidth={1.7} lineCap="round" />
            <Rect x={10} y={11} width={8} height={10} stroke="#A83F57" strokeWidth={1.5} cornerRadius={1} />
          </Group>
        </Group>
      ) : null}
    </Group>
  );
}

function WallTileLayout({
  frame,
  layout,
  material,
  onEditOffset,
  objectBlockers,
  opacity,
  showEdgeCuts,
}: {
  frame: WallFrame;
  layout: SurfaceLayout;
  material: TileMaterial;
  onEditOffset: (edge: keyof LayoutEdgeCuts) => void;
  objectBlockers: Array<{ type: 'rect'; xMm: number; yMm: number; widthMm: number; heightMm: number }>;
  opacity: number;
  showEdgeCuts: boolean;
}) {
  const result = generateRectLayout({
    heightMm: frame.heightMm,
    layout,
    tileHeightMm: material.heightMm,
    tileWidthMm: material.widthMm,
    widthMm: frame.widthMm,
  });

  return (
    <Group opacity={opacity}>
      <Group clipX={frame.x} clipY={frame.y} clipWidth={frame.width} clipHeight={frame.height} listening={false}>
      <TilePiecesCanvas pieces={result.pieces} originX={frame.x} originY={frame.y} color={material.swatch.value} variant="wall" />
      {objectBlockers.map((blocker, index) => (
        <Rect
          key={`object-mask-${index}`}
          x={frame.x + mmToCanvas(blocker.xMm)}
          y={frame.y + mmToCanvas(blocker.yMm)}
          width={mmToCanvas(blocker.widthMm)}
          height={mmToCanvas(blocker.heightMm)}
          fill="#FFFFFF"
          globalCompositeOperation="destination-out"
          listening={false}
        />
      ))}
      {result.truncated ? <Text x={frame.x + 12} y={frame.y + frame.height - 28} text="Сетка упрощена" fill="#6F4F93" fontSize={13} /> : null}
      </Group>
      {showEdgeCuts ? <EdgeCutLabels edgeCuts={result.edgeOffsets} height={frame.height} onEditOffset={onEditOffset} width={frame.width} x={frame.x} y={frame.y} /> : null}
    </Group>
  );
}

// Openings must always paint over every tile layer on the wall (base zone and
// any hand-drawn extra zones) — a door, passage or window is a hole, not a
// surface to tile — so this renders last, after all WallZoneLayer output.
function WallOpeningMarkers({
  frame,
  onDeleteOpening,
  onMoveOpening,
  onResizeOpening,
  onResetOpening,
  onSelectOpening,
  openings,
  selectedOpeningId,
  showOpeningNames,
}: {
  frame: WallFrame;
  onDeleteOpening: (openingId: string) => void;
  onMoveOpening: (openingId: string, xMm: number, yMm?: number) => void;
  onResizeOpening: (openingId: string, patch: Pick<Opening, 'xMm' | 'yMm' | 'widthMm' | 'heightMm'>) => void;
  onResetOpening: (openingId: string) => void;
  onSelectOpening: (openingId: string) => void;
  openings: Opening[];
  selectedOpeningId: string | null;
  showOpeningNames: boolean;
}) {
  return (
    <>
      {openings.map((opening) => (
        opening.id === selectedOpeningId ? null :
        <WallOpening
          key={opening.id}
          frame={frame}
          opening={opening}
          siblingOpenings={openings.filter((item) => item.id !== opening.id)}
          onDelete={() => onDeleteOpening(opening.id)}
          onMove={(xMm, yMm) => onMoveOpening(opening.id, xMm, yMm)}
          onResize={(patch) => onResizeOpening(opening.id, patch)}
          onReset={() => onResetOpening(opening.id)}
          onSelect={() => onSelectOpening(opening.id)}
          selected={selectedOpeningId === opening.id}
          showName={showOpeningNames}
        />
      ))}
    </>
  );
}

function WallOpening({
  frame,
  onDelete,
  onMove,
  onResize,
  onReset,
  onSelect,
  opening,
  selected,
  showName,
  siblingOpenings,
}: {
  frame: WallFrame;
  onDelete: () => void;
  onMove: (xMm: number, yMm?: number) => void;
  onResize: (patch: Pick<Opening, 'xMm' | 'yMm' | 'widthMm' | 'heightMm'>) => void;
  onReset: () => void;
  onSelect: () => void;
  opening: Opening;
  selected: boolean;
  showName: boolean;
  siblingOpenings: Opening[];
}) {
  const openingGroupRef = useRef<Konva.Group>(null);
  const [dragPreview, setDragPreview] = useState<{ xMm: number; yMm: number } | null>(null);
  const lastValidPositionRef = useRef({ xMm: opening.xMm, yMm: opening.yMm });
  const openingWidth = mmToCanvas(opening.widthMm);
  const openingHeight = mmToCanvas(opening.heightMm);
  const openingXmm = Math.max(0, Math.min(opening.xMm, Math.max(0, frame.widthMm - opening.widthMm)));
  const openingYmm = Math.max(0, Math.min(opening.yMm, Math.max(0, frame.heightMm - opening.heightMm)));
  const displayedXmm = dragPreview?.xMm ?? openingXmm;
  const displayedYmm = dragPreview?.yMm ?? openingYmm;
  const openingY = frame.y + mmToCanvas(openingYmm);
  const leftDistanceMm = Math.round(displayedXmm);
  const rightDistanceMm = Math.round(Math.max(0, frame.widthMm - displayedXmm - opening.widthMm));
  const topDistanceMm = Math.round(displayedYmm);
  const bottomDistanceMm = Math.round(Math.max(0, frame.heightMm - displayedYmm - opening.heightMm));

  useEffect(() => {
    if (!selected) return;
    openingGroupRef.current?.moveToTop();
    openingGroupRef.current?.getLayer()?.batchDraw();
  }, [selected]);

  return (
    <Group
      ref={openingGroupRef}
      name="wall-opening"
      x={frame.x + mmToCanvas(openingXmm)}
      y={openingY}
      draggable
      onDragStart={(event) => {
        event.cancelBubble = true;
        event.currentTarget.moveToTop();
        lastValidPositionRef.current = { xMm: openingXmm, yMm: openingYmm };
        setDragPreview({ xMm: openingXmm, yMm: openingYmm });
        onSelect();
      }}
      onDragMove={(event) => {
        event.cancelBubble = true;
        const node = event.currentTarget;
        const requestedXmm = canvasToMm(node.x() - frame.x);
        const requestedYmm = opening.kind === 'window' ? canvasToMm(node.y() - frame.y) : openingYmm;
        const constrained = constrainOpeningPosition(
          { widthMm: frame.widthMm, heightMm: frame.heightMm },
          { ...opening, xMm: lastValidPositionRef.current.xMm, yMm: lastValidPositionRef.current.yMm },
          siblingOpenings,
          requestedXmm,
          requestedYmm,
        );
        lastValidPositionRef.current = constrained;
        const x = frame.x + mmToCanvas(constrained.xMm);
        const y = opening.kind === 'window' ? frame.y + mmToCanvas(constrained.yMm) : openingY;
        node.position({ x, y });
        setDragPreview({ xMm: constrained.xMm, yMm: constrained.yMm });
      }}
      onDragEnd={(event) => {
        event.cancelBubble = true;
        const node = event.currentTarget;
        const { xMm, yMm } = lastValidPositionRef.current;
        node.position({ x: frame.x + mmToCanvas(xMm), y: opening.kind === 'window' ? frame.y + mmToCanvas(yMm) : openingY });
        onMove(xMm, opening.kind === 'window' ? yMm : undefined);
        setDragPreview(null);
      }}
      onMouseDown={(event) => {
        event.cancelBubble = true;
        event.currentTarget.moveToTop();
        onSelect();
      }}
      onTouchStart={(event) => {
        event.cancelBubble = true;
        onSelect();
      }}
      onClick={(event) => {
        event.cancelBubble = true;
        onSelect();
      }}
      onTap={(event) => {
        event.cancelBubble = true;
        onSelect();
      }}
      onMouseEnter={(event) => {
        const stage = event.target.getStage();
        if (stage) stage.container().style.cursor = 'ew-resize';
      }}
      onMouseLeave={(event) => {
        const stage = event.target.getStage();
        if (stage) stage.container().style.cursor = 'default';
      }}
    >
      <Rect
        width={openingWidth}
        height={openingHeight}
        fill={selected ? '#EEE2F8' : '#FFFFFF'}
        stroke={selected ? '#6F4F93' : '#A385C4'}
        strokeWidth={selected ? 3 : 1.5}
        dash={[8, 6]}
      />
      {showName ? <Text y={8} width={openingWidth} align="center" text={getOpeningDisplayName(opening)} fill="#6F4F93" fontSize={12} listening={false} /> : null}
      {selected ? (
        <>
        <Group x={-70} y={4}>
          <Group
            onClick={(event) => {
              event.cancelBubble = true;
              onReset();
            }}
            onTap={(event) => {
              event.cancelBubble = true;
              onReset();
            }}
          >
            <Rect width={28} height={28} fill="#FFFFFF" stroke="#CDB9DF" strokeWidth={1} cornerRadius={6} shadowColor="rgba(38, 24, 50, 0.16)" shadowBlur={6} />
            <Text x={2} y={2} width={24} height={24} align="center" verticalAlign="middle" text="↺" fill="#6F4F93" fontSize={20} />
          </Group>
          <Group
            x={36}
            onClick={(event) => {
              event.cancelBubble = true;
              onDelete();
            }}
            onTap={(event) => {
              event.cancelBubble = true;
              onDelete();
            }}
          >
            <Rect width={28} height={28} fill="#FFFFFF" stroke="#E1B7C0" strokeWidth={1} cornerRadius={6} shadowColor="rgba(38, 24, 50, 0.16)" shadowBlur={6} />
            <Line points={[9, 9, 19, 9]} stroke="#A83F57" strokeWidth={1.7} lineCap="round" />
            <Line points={[11, 7, 17, 7]} stroke="#A83F57" strokeWidth={1.7} lineCap="round" />
            <Rect x={10} y={11} width={8} height={10} stroke="#A83F57" strokeWidth={1.5} cornerRadius={1} />
          </Group>
        </Group>
          <OpeningDistanceLabels
            bottomDistanceMm={bottomDistanceMm}
            frameHeight={frame.height}
            frameWidth={frame.width}
            leftDistanceMm={leftDistanceMm}
            openingHeight={openingHeight}
            openingWidth={openingWidth}
            rightDistanceMm={rightDistanceMm}
            topDistanceMm={topDistanceMm}
            xInFrame={mmToCanvas(displayedXmm)}
            yInFrame={mmToCanvas(displayedYmm)}
          />
        </>
      ) : null}
    </Group>
  );
}

function OpeningDistanceLabels({ bottomDistanceMm, frameHeight, frameWidth, leftDistanceMm, openingHeight, openingWidth, rightDistanceMm, topDistanceMm, xInFrame, yInFrame }: {
  bottomDistanceMm: number;
  frameHeight: number;
  frameWidth: number;
  leftDistanceMm: number;
  openingHeight: number;
  openingWidth: number;
  rightDistanceMm: number;
  topDistanceMm: number;
  xInFrame: number;
  yInFrame: number;
}) {
  const unit = String.fromCharCode(1084, 1084);
  const horizontalCenter = openingHeight / 2;
  const verticalCenter = openingWidth / 2;
  const leftEdge = -xInFrame;
  const rightEdge = frameWidth - xInFrame;
  const topEdge = -yInFrame;
  const bottomEdge = frameHeight - yInFrame;
  return (
    <Group listening={false}>
      <OpeningRadialDistanceGuide start={{ x: leftEdge, y: horizontalCenter }} end={{ x: 0, y: horizontalCenter }} text={`${leftDistanceMm} ${unit}`} />
      <OpeningRadialDistanceGuide start={{ x: openingWidth, y: horizontalCenter }} end={{ x: rightEdge, y: horizontalCenter }} text={`${rightDistanceMm} ${unit}`} />
      <OpeningRadialDistanceGuide start={{ x: verticalCenter, y: topEdge }} end={{ x: verticalCenter, y: 0 }} text={`${topDistanceMm} ${unit}`} />
      <OpeningRadialDistanceGuide start={{ x: verticalCenter, y: openingHeight }} end={{ x: verticalCenter, y: bottomEdge }} text={`${bottomDistanceMm} ${unit}`} />
    </Group>
  );
}

function OpeningRadialDistanceGuide({ end, start, text }: { end: PointMm; start: PointMm; text: string }) {
  const ref = useRef<Konva.Group>(null);
  useKeepKonvaOnTop(ref);
  const horizontal = Math.abs(end.x - start.x) >= Math.abs(end.y - start.y);
  const middleX = (start.x + end.x) / 2;
  const middleY = (start.y + end.y) / 2;
  return (
    <Group ref={ref} listening={false}>
      <Line points={[start.x, start.y, end.x, end.y]} stroke="#765594" strokeWidth={1.2} dash={[5, 4]} />
      <Line points={horizontal ? [start.x, start.y - 4, start.x, start.y + 4] : [start.x - 4, start.y, start.x + 4, start.y]} stroke="#765594" strokeWidth={1.2} />
      <Line points={horizontal ? [end.x, end.y - 4, end.x, end.y + 4] : [end.x - 4, end.y, end.x + 4, end.y]} stroke="#765594" strokeWidth={1.2} />
      <Group x={middleX} y={middleY}>
        <Rect x={-27} y={-8} width={54} height={16} fill="#FFFFFF" stroke="#CDB9DF" strokeWidth={1} cornerRadius={4} />
        <Text x={-25} y={-5} width={50} align="center" text={text} fill="#4E4458" fontSize={9} />
      </Group>
    </Group>
  );
}

type OpeningResizeHandle = 'left' | 'right' | 'tl' | 'tr' | 'bl' | 'br';

function getOpeningDisplayName(opening: Opening): string {
  if (opening.kind === 'window') return 'Окно';
  return `${opening.kind === 'door' ? 'Дверь' : 'Проход'} ${opening.number ?? ''}`.trim();
}

function OpeningResizeHandles({ height, onResize, opening, width }: { height: number; onResize: (patch: Pick<Opening, 'xMm' | 'yMm' | 'widthMm' | 'heightMm'>) => void; opening: Opening; width: number }) {
  const dragSessions = useRef<Record<string, { opening: Opening; pointerX: number; pointerY: number; scaleX: number; scaleY: number }>>({});
  const [scheduleResize, flushResize] = useAnimationFrameCallback(onResize);
  const handles: Array<{ key: OpeningResizeHandle; x: number; y: number }> = opening.kind === 'window'
    ? [
        { key: 'tl', x: 0, y: 0 },
        { key: 'tr', x: width, y: 0 },
        { key: 'bl', x: 0, y: height },
        { key: 'br', x: width, y: height },
      ]
    : opening.kind === 'door'
      ? [{ key: 'tl', x: 0, y: 0 }, { key: 'tr', x: width, y: 0 }]
      : [{ key: 'left', x: 0, y: height / 2 }, { key: 'right', x: width, y: height / 2 }];

  function applyPointer(handle: OpeningResizeHandle, node: Konva.Node, finish = false) {
    const session = dragSessions.current[handle];
    const pointer = node.getStage()?.getPointerPosition();
    if (!session || !pointer) return;
    const deltaXmm = canvasToMm((pointer.x - session.pointerX) / session.scaleX);
    const deltaYmm = canvasToMm((pointer.y - session.pointerY) / session.scaleY);
    const patch = getOpeningResizePatch(session.opening, handle, deltaXmm, deltaYmm);
    if (finish) flushResize(patch);
    else scheduleResize(patch);
  }

  return (
    <Group>
      {handles.map((handle) => (
        <Circle
          key={handle.key}
          x={handle.x}
          y={handle.y}
          radius={7}
          fill="#FFFFFF"
          stroke="#6F4F93"
          strokeWidth={2}
          draggable
          onDragStart={(event) => {
            event.cancelBubble = true;
            const node = event.currentTarget;
            const pointer = node.getStage()?.getPointerPosition();
            if (!pointer) return;
            const scale = node.getAbsoluteScale();
            dragSessions.current[handle.key] = { opening: { ...opening }, pointerX: pointer.x, pointerY: pointer.y, scaleX: scale.x || 1, scaleY: scale.y || 1 };
          }}
          onMouseDown={(event) => { event.cancelBubble = true; }}
          onTouchStart={(event) => { event.cancelBubble = true; }}
          onDragMove={(event) => {
            event.cancelBubble = true;
            applyPointer(handle.key, event.currentTarget);
          }}
          onDragEnd={(event) => {
            event.cancelBubble = true;
            const node = event.currentTarget;
            applyPointer(handle.key, node, true);
            node.position({ x: handle.x, y: handle.y });
            delete dragSessions.current[handle.key];
          }}
        />
      ))}
    </Group>
  );
}

function getOpeningResizePatch(opening: Opening, handle: OpeningResizeHandle, deltaXmm: number, deltaYmm: number): Pick<Opening, 'xMm' | 'yMm' | 'widthMm' | 'heightMm'> {
  const left = handle === 'left' || handle === 'tl' || handle === 'bl';
  const right = handle === 'right' || handle === 'tr' || handle === 'br';
  const top = handle === 'tl' || handle === 'tr';
  const bottom = handle === 'bl' || handle === 'br';
  if (opening.kind === 'passage') {
    return {
      xMm: left ? opening.xMm + deltaXmm : opening.xMm,
      yMm: opening.yMm,
      widthMm: opening.widthMm + (left ? -deltaXmm : right ? deltaXmm : 0),
      heightMm: opening.heightMm,
    };
  }
  if (opening.kind === 'door') {
    return {
      xMm: left ? opening.xMm + deltaXmm : opening.xMm,
      yMm: opening.yMm + deltaYmm,
      widthMm: opening.widthMm + (left ? -deltaXmm : right ? deltaXmm : 0),
      heightMm: opening.heightMm - deltaYmm,
    };
  }
  return {
    xMm: left ? opening.xMm + deltaXmm : opening.xMm,
    yMm: top ? opening.yMm + deltaYmm : opening.yMm,
    widthMm: opening.widthMm + (left ? -deltaXmm : right ? deltaXmm : 0),
    heightMm: opening.heightMm + (top ? -deltaYmm : bottom ? deltaYmm : 0),
  };
}

export function WallZoneLayer({
  frame,
  material,
  objectBlockers,
  onEditOffset,
  onDragPreview,
  onPolygonChange,
  onSelect,
  onShapeChange,
  opacity,
  openings,
  selected,
  showEdgeCuts,
  zone,
}: {
  frame: WallFrame;
  material: TileMaterial;
  objectBlockers: Array<{ type: 'rect'; xMm: number; yMm: number; widthMm: number; heightMm: number }>;
  onEditOffset: (edge: keyof LayoutEdgeCuts) => void;
  onDragPreview: (delta: PointMm | null) => void;
  onPolygonChange: (points: PointMm[]) => void;
  onSelect: () => void;
  onShapeChange: (patch: Partial<Extract<FinishZone['shape'], { type: 'rect' }>>) => void;
  opacity: number;
  openings: Opening[];
  selected: boolean;
  showEdgeCuts: boolean;
  zone: FinishZone;
}) {
  const [polygonDragDelta, setPolygonDragDelta] = useState<PointMm | null>(null);
  const [rectDragDelta, setRectDragDelta] = useState<PointMm | null>(null);
  const polygonDragDeltaRef = useRef<PointMm>({ x: 0, y: 0 });
  const polygonDragSessionRef = useRef<PolygonDragSession | null>(null);
  const shape = zone.shape;
  // Draw complete tiles, then clip them on canvas. Calculation fragments of
  // concave polygons are not tile edges and must never become visible seams.
  if (shape.type === 'polygon') {
    const bounds = getBoundingBox(shape.points);
    const result = generateRectLayout({
      heightMm: bounds.height,
      widthMm: bounds.width,
      layout: zone.layout,
      tileHeightMm: material.heightMm,
      tileWidthMm: material.widthMm,
    });
    const displayedDelta = polygonDragDelta ?? { x: 0, y: 0 };
    const points = shape.points.flatMap((point) => [frame.x + mmToCanvas(point.x), frame.y + mmToCanvas(point.y)]);
    return (
      <Group
        draggable
        x={mmToCanvas(displayedDelta.x)}
        y={mmToCanvas(displayedDelta.y)}
        opacity={opacity}
        onMouseEnter={(event) => {
          const container = event.target.getStage()?.container();
          if (container) container.style.cursor = 'move';
        }}
        onMouseLeave={(event) => {
          const container = event.target.getStage()?.container();
          if (container) container.style.cursor = 'default';
        }}
        onClick={(event) => { event.cancelBubble = true; onSelect(); }}
        onTap={(event) => { event.cancelBubble = true; onSelect(); }}
        onMouseDown={(event) => { event.cancelBubble = true; onSelect(); }}
        onTouchStart={(event) => { event.cancelBubble = true; onSelect(); }}
        onDragStart={(event) => {
          event.cancelBubble = true;
          event.currentTarget.moveToTop();
          polygonDragSessionRef.current = createPolygonDragSession(event.currentTarget);
          polygonDragDeltaRef.current = { x: 0, y: 0 };
          setPolygonDragDelta({ x: 0, y: 0 });
          onDragPreview({ x: 0, y: 0 });
          onSelect();
        }}
        onDragMove={(event) => {
          event.cancelBubble = true;
          const node = event.currentTarget;
          const requested = getPolygonPointerDelta(node, polygonDragSessionRef.current) ?? polygonDragDeltaRef.current;
          const delta = constrainPolygonDeltaToRect(zone.shape.type === 'polygon' ? zone.shape.points : [], frame.widthMm, frame.heightMm, requested);
          node.position({ x: mmToCanvas(delta.x), y: mmToCanvas(delta.y) });
          polygonDragDeltaRef.current = delta;
          setPolygonDragDelta(delta);
          onDragPreview(delta);
        }}
        onDragEnd={(event) => {
          event.cancelBubble = true;
          if (zone.shape.type !== 'polygon') return;
          const node = event.currentTarget;
          const requested = getPolygonPointerDelta(node, polygonDragSessionRef.current) ?? polygonDragDeltaRef.current;
          const finalDelta = constrainPolygonDeltaToRect(zone.shape.points, frame.widthMm, frame.heightMm, requested, polygonDragDeltaRef.current);
          node.position({ x: 0, y: 0 });
          polygonDragSessionRef.current = null;
          polygonDragDeltaRef.current = { x: 0, y: 0 };
          setPolygonDragDelta(null);
          onDragPreview(null);
          if (finalDelta.x || finalDelta.y) onPolygonChange(translatePolygon(zone.shape.points, finalDelta.x, finalDelta.y));
        }}
      >
        <Group listening={false} clipFunc={(context) => {
          context.beginPath();
          context.moveTo(frame.x + mmToCanvas(shape.points[0].x), frame.y + mmToCanvas(shape.points[0].y));
          shape.points.slice(1).forEach((point) => context.lineTo(frame.x + mmToCanvas(point.x), frame.y + mmToCanvas(point.y)));
          context.closePath();
        }}>
          <Rect x={frame.x + mmToCanvas(bounds.minX)} y={frame.y + mmToCanvas(bounds.minY)} width={mmToCanvas(bounds.width)} height={mmToCanvas(bounds.height)} fill="#FFFFFF" listening={false} />
          <TilePiecesCanvas
            pieces={result.pieces}
            originX={frame.x + mmToCanvas(bounds.minX)}
            originY={frame.y + mmToCanvas(bounds.minY)}
            color={material.swatch.value}
            variant="floor"
          />
          <WallZoneOpeningMasks frame={frame} openings={openings} delta={displayedDelta} />
          {objectBlockers.map((blocker, index) => (
            <Rect
              key={`wall-zone-object-${index}`}
              x={frame.x + mmToCanvas(blocker.xMm)}
              y={frame.y + mmToCanvas(blocker.yMm)}
              width={mmToCanvas(blocker.widthMm)}
              height={mmToCanvas(blocker.heightMm)}
              fill="#FFFFFF"
              globalCompositeOperation="destination-out"
              listening={false}
            />
          ))}
        </Group>
        <Line points={points} closed fill="rgba(242, 235, 249, 0.12)" stroke={selected ? '#6F4F93' : '#A385C4'} strokeWidth={selected ? 3 : 1.5} dash={selected ? undefined : [8, 6]} />
        {selected && showEdgeCuts && !polygonDragDelta ? (
          <EdgeCutLabels
            edgeCuts={result.edgeOffsets}
            height={mmToCanvas(bounds.height)}
            onEditOffset={onEditOffset}
            width={mmToCanvas(bounds.width)}
            x={frame.x + mmToCanvas(bounds.minX)}
            y={frame.y + mmToCanvas(bounds.minY)}
          />
        ) : null}
      </Group>
    );
  }
  const result = generateRectLayout({
    heightMm: shape.heightMm,
    layout: zone.layout,
    tileHeightMm: material.heightMm,
    tileWidthMm: material.widthMm,
    widthMm: shape.widthMm,
  });
  const x = frame.x + mmToCanvas(shape.xMm);
  const y = frame.y + mmToCanvas(shape.yMm);
  const width = mmToCanvas(shape.widthMm);
  const height = mmToCanvas(shape.heightMm);

  return (
    <Group
      opacity={opacity}
      draggable={selected}
      onClick={(event) => {
        event.cancelBubble = true;
        onSelect();
      }}
      onTap={(event) => {
        event.cancelBubble = true;
        onSelect();
      }}
      onMouseDown={(event) => { event.cancelBubble = true; onSelect(); }}
      onTouchStart={(event) => { event.cancelBubble = true; onSelect(); }}
      onDragStart={(event) => {
        event.cancelBubble = true;
        event.currentTarget.moveToTop();
        setRectDragDelta({ x: 0, y: 0 });
        onDragPreview({ x: 0, y: 0 });
      }}
      onDragMove={(event) => {
        event.cancelBubble = true;
        const node = event.currentTarget;
        constrainZoneDrag(node, shape, frame.widthMm, frame.heightMm);
        setRectDragDelta({ x: Math.round(canvasToMm(node.x())), y: Math.round(canvasToMm(node.y())) });
        onDragPreview({ x: Math.round(canvasToMm(node.x())), y: Math.round(canvasToMm(node.y())) });
      }}
      onDragEnd={(event) => {
        event.cancelBubble = true;
        if (event.target !== event.currentTarget) return;
        const node = event.currentTarget;
        constrainZoneDrag(node, shape, frame.widthMm, frame.heightMm);
        const nextX = shape.xMm + canvasToMm(node.x());
        const nextY = shape.yMm + canvasToMm(node.y());
        node.position({ x: 0, y: 0 });
        setRectDragDelta(null);
        onDragPreview(null);
        onShapeChange({ xMm: nextX, yMm: nextY });
      }}
    >
      <Group clipX={x} clipY={y} clipWidth={width} clipHeight={height} listening={false}>
        <Rect x={x} y={y} width={width} height={height} fill="#FFFFFF" listening={false} />
        <TilePiecesCanvas pieces={result.pieces} originX={x} originY={y} color={material.swatch.value} variant="floor" />
        <WallZoneOpeningMasks frame={frame} openings={openings} delta={rectDragDelta ?? { x: 0, y: 0 }} />
        {objectBlockers.map((blocker, index) => (
          <Rect
            key={`wall-zone-object-mask-${index}`}
            x={frame.x + mmToCanvas(blocker.xMm)}
            y={frame.y + mmToCanvas(blocker.yMm)}
            width={mmToCanvas(blocker.widthMm)}
            height={mmToCanvas(blocker.heightMm)}
            fill="#FFFFFF"
            globalCompositeOperation="destination-out"
            listening={false}
          />
        ))}
      </Group>
      <Rect x={x} y={y} width={width} height={height} fill="rgba(242, 235, 249, 0.16)" stroke={selected ? '#6F4F93' : '#A385C4'} strokeWidth={selected ? 3 : 1.5} dash={selected ? undefined : [8, 6]} />
      {selected ? <ZoneResizeHandles height={height} onResize={onShapeChange} shape={shape} surfaceHeightMm={frame.heightMm} surfaceWidthMm={frame.widthMm} width={width} x={x} y={y} /> : null}
      {selected && showEdgeCuts && !rectDragDelta ? <EdgeCutLabels edgeCuts={result.edgeOffsets} height={height} onEditOffset={onEditOffset} width={width} x={x} y={y} /> : null}
    </Group>
  );
}

type SurfaceLayout = TileProject['surfaces'][number]['zones'][number]['layout'];

function WallZoneOpeningMasks({ frame, openings, delta }: { frame: WallFrame; openings: Opening[]; delta: PointMm }) {
  // Openings stay in the wall frame while the zone moves. Mask after painting
  // the tiles so a hole cannot split neighboring tiles into artificial seams.
  return <Group name="zone-opening-masks" listening={false}>{openings.map((opening) => (
    <Rect key={opening.id} x={frame.x + mmToCanvas(opening.xMm - delta.x)} y={frame.y + mmToCanvas(opening.yMm - delta.y)} width={mmToCanvas(opening.widthMm)} height={mmToCanvas(opening.heightMm)} fill="#FFFFFF" listening={false} />
  ))}</Group>;
}

function FloorTileLayout({ blockedObjects, contour, layout, layoutBounds, maskPositionFor, material, opacity, view }: {
  blockedObjects: RoomObject[];
  contour: PointMm[];
  layout: SurfaceLayout;
  layoutBounds?: ReturnType<typeof getBoundingBox>;
  maskPositionFor?: (object: RoomObject) => { rotationDeg: number; xMm: number; yMm: number };
  material: TileMaterial;
  opacity: number;
  view: PlanViewTransform;
}) {
  const box = layoutBounds ?? getBoundingBox(contour);
  // Render whole tiles and clip the finished layout by the room contour. The
  // polygon layout engine may split one tile into several calculation pieces
  // for concave rooms; outlining those pieces exposes artificial inner seams.
  const result = generateRectLayout({
    heightMm: box.height,
    layout,
    tileHeightMm: material.heightMm,
    tileWidthMm: material.widthMm,
    widthMm: box.width,
  });

  return (
    <Group
      opacity={opacity}
      listening={false}
      clipFunc={(context) => {
        if (!contour.length) return;
        context.beginPath();
        context.moveTo(view.x(contour[0].x), view.y(contour[0].y));
        for (const point of contour.slice(1)) context.lineTo(view.x(point.x), view.y(point.y));
        context.closePath();
      }}
    >
      <TilePiecesCanvas pieces={result.pieces} originX={view.x(box.minX)} originY={view.y(box.minY)} color={material.swatch.value} variant="floor" />
      {blockedObjects.map((object) => {
        const position = maskPositionFor?.(object) ?? { xMm: object.xMm, yMm: object.yMm, rotationDeg: object.rotationDeg ?? 0 };
        return (
          <RotatedObjectRect
            key={`floor-object-mask-${object.id}`}
            fill="#FFFFFF"
            globalCompositeOperation="destination-out"
            lengthMm={object.lengthMm}
            listening={false}
            rotationDeg={position.rotationDeg}
            view={view}
            widthMm={object.widthMm}
            xMm={position.xMm}
            yMm={position.yMm}
          />
        );
      })}
      {result.truncated ? <Text x={54} y={112} text="Сетка упрощена" fill="#6F4F93" fontSize={13} /> : null}
    </Group>
  );
}

function FloorZoneLayer({
  blockedObjects,
  maskPositionFor,
  material,
  onEditOffset,
  onDragPreview,
  onDragStateChange,
  onPolygonChange,
  onSelect,
  onShapeChange,
  opacity,
  selected,
  showEdgeCuts,
  surfaceContour,
  view,
  zone,
}: {
  blockedObjects: RoomObject[];
  maskPositionFor?: (object: RoomObject) => { rotationDeg: number; xMm: number; yMm: number };
  material: TileMaterial;
  onEditOffset: (edge: keyof LayoutEdgeCuts) => void;
  onDragPreview: (delta: PointMm | null) => void;
  onDragStateChange?: (dragging: boolean) => void;
  onPolygonChange: (points: PointMm[]) => void;
  onSelect: () => void;
  onShapeChange: (patch: Partial<Extract<FinishZone['shape'], { type: 'rect' }>>) => void;
  opacity: number;
  selected: boolean;
  showEdgeCuts: boolean;
  surfaceContour: PointMm[];
  view: PlanViewTransform;
  zone: FinishZone;
}) {
  const [polygonDragDelta, setPolygonDragDelta] = useState<PointMm | null>(null);
  const [rectDragDelta, setRectDragDelta] = useState<PointMm | null>(null);
  const polygonDragDeltaRef = useRef<PointMm>({ x: 0, y: 0 });
  const polygonDragSessionRef = useRef<PolygonDragSession | null>(null);
  const shape = zone.shape;
  if (shape.type === 'polygon') {
    const displayedDelta = polygonDragDelta ?? { x: 0, y: 0 };
    const canvasPoints = shape.points.flatMap((point) => [view.x(point.x), view.y(point.y)]);
    return (
      <Group
        draggable={selected}
        x={mmToCanvas(displayedDelta.x)}
        y={mmToCanvas(displayedDelta.y)}
        onClick={(event) => { event.cancelBubble = true; onSelect(); }}
        onTap={(event) => { event.cancelBubble = true; onSelect(); }}
        onMouseDown={(event) => { event.cancelBubble = true; onSelect(); }}
        onTouchStart={(event) => { event.cancelBubble = true; onSelect(); }}
        onDragStart={(event) => {
          if (!selected) return;
          event.cancelBubble = true;
          event.currentTarget.moveToTop();
          polygonDragSessionRef.current = createPolygonDragSession(event.currentTarget);
          polygonDragDeltaRef.current = { x: 0, y: 0 };
          setPolygonDragDelta({ x: 0, y: 0 });
          onDragPreview({ x: 0, y: 0 });
          onDragStateChange?.(true);
          onSelect();
        }}
        onDragMove={(event) => {
          if (!selected) return;
          event.cancelBubble = true;
          const node = event.currentTarget;
          const requested = getPolygonPointerDelta(node, polygonDragSessionRef.current) ?? polygonDragDeltaRef.current;
          const delta = constrainPolygonDeltaToContour(shape.points, surfaceContour, requested);
          node.position({ x: mmToCanvas(delta.x), y: mmToCanvas(delta.y) });
          polygonDragDeltaRef.current = delta;
          setPolygonDragDelta(delta);
          onDragPreview(delta);
        }}
        onDragEnd={(event) => {
          if (!selected) return;
          event.cancelBubble = true;
          const node = event.currentTarget;
          const requested = getPolygonPointerDelta(node, polygonDragSessionRef.current) ?? polygonDragDeltaRef.current;
          const finalDelta = constrainPolygonDeltaToContour(shape.points, surfaceContour, requested, polygonDragDeltaRef.current);
          node.position({ x: 0, y: 0 });
          polygonDragSessionRef.current = null;
          polygonDragDeltaRef.current = { x: 0, y: 0 };
          setPolygonDragDelta(null);
          onDragPreview(null);
          onDragStateChange?.(false);
          if (finalDelta.x || finalDelta.y) onPolygonChange(translatePolygon(shape.points, finalDelta.x, finalDelta.y));
        }}
      >
        <FloorTileLayout blockedObjects={blockedObjects} contour={shape.points} layout={zone.layout} maskPositionFor={maskPositionFor} material={material} opacity={opacity} view={view} />
        <Line points={canvasPoints} closed fill="rgba(242, 235, 249, 0.10)" stroke={selected ? '#6F4F93' : '#A385C4'} strokeWidth={selected ? 3 : 1.5} dash={selected ? undefined : [8, 6]} />
        {selected && !zone.locked ? <PolygonZoneHandles points={shape.points} surfaceContour={surfaceContour} view={view} onChange={onPolygonChange} /> : null}
        {selected && showEdgeCuts && !polygonDragDelta ? (
          <FloorEdgeCutLabels contour={shape.points} layout={zone.layout} material={material} onEditOffset={onEditOffset} view={view} />
        ) : null}
      </Group>
    );
  }

  const surfaceBox = getBoundingBox(surfaceContour);
  const bounds = {
    minX: surfaceBox.minX + shape.xMm,
    minY: surfaceBox.minY + shape.yMm,
    maxX: surfaceBox.minX + shape.xMm + shape.widthMm,
    maxY: surfaceBox.minY + shape.yMm + shape.heightMm,
    width: shape.widthMm,
    height: shape.heightMm,
  };
  const result = generateRectLayout({
    heightMm: shape.heightMm,
    layout: zone.layout,
    tileHeightMm: material.heightMm,
    tileWidthMm: material.widthMm,
    widthMm: shape.widthMm,
  });
  const x = view.x(bounds.minX);
  const y = view.y(bounds.minY);
  const width = mmToCanvas(shape.widthMm);
  const height = mmToCanvas(shape.heightMm);

  return (
    <Group
      opacity={opacity}
      draggable={selected}
      onClick={(event) => { event.cancelBubble = true; onSelect(); }}
      onTap={(event) => { event.cancelBubble = true; onSelect(); }}
      onMouseDown={(event) => { event.cancelBubble = true; onSelect(); }}
      onTouchStart={(event) => { event.cancelBubble = true; onSelect(); }}
      onDragStart={(event) => {
        if (!selected) return;
        event.cancelBubble = true;
        event.currentTarget.moveToTop();
        setRectDragDelta({ x: 0, y: 0 });
        onDragPreview({ x: 0, y: 0 });
        onDragStateChange?.(true);
        onSelect();
      }}
      onDragMove={(event) => {
        if (!selected) return;
        event.cancelBubble = true;
        const node = event.currentTarget;
        constrainZoneDrag(node, shape, surfaceBox.width, surfaceBox.height);
        setRectDragDelta({ x: Math.round(canvasToMm(node.x())), y: Math.round(canvasToMm(node.y())) });
        onDragPreview({ x: Math.round(canvasToMm(node.x())), y: Math.round(canvasToMm(node.y())) });
      }}
      onDragEnd={(event) => {
        if (!selected) return;
        event.cancelBubble = true;
        if (event.target !== event.currentTarget) return;
        const node = event.currentTarget;
        constrainZoneDrag(node, shape, surfaceBox.width, surfaceBox.height);
        const nextX = shape.xMm + canvasToMm(node.x());
        const nextY = shape.yMm + canvasToMm(node.y());
        node.position({ x: 0, y: 0 });
        setRectDragDelta(null);
        onDragPreview(null);
        onDragStateChange?.(false);
        onShapeChange({ xMm: nextX, yMm: nextY });
      }}
    >
      <Group clipX={x} clipY={y} clipWidth={width} clipHeight={height} listening={false}>
        <TilePiecesCanvas pieces={result.pieces} originX={x} originY={y} color={material.swatch.value} variant="wall" />
        {blockedObjects.map((object) => {
          const position = maskPositionFor?.(object) ?? { xMm: object.xMm, yMm: object.yMm, rotationDeg: object.rotationDeg ?? 0 };
          return (
            <RotatedObjectRect
              key={`floor-zone-object-mask-${object.id}`}
              fill="#FFFFFF"
              globalCompositeOperation="destination-out"
              lengthMm={object.lengthMm}
              listening={false}
              rotationDeg={position.rotationDeg}
              view={view}
              widthMm={object.widthMm}
              xMm={position.xMm}
              yMm={position.yMm}
            />
          );
        })}
      </Group>
      <Rect x={x} y={y} width={width} height={height} fill="rgba(242, 235, 249, 0.16)" stroke={selected ? '#6F4F93' : '#A385C4'} strokeWidth={selected ? 3 : 1.5} dash={selected ? undefined : [8, 6]} />
      {selected ? <ZoneResizeHandles height={height} onResize={onShapeChange} shape={shape} surfaceHeightMm={surfaceBox.height} surfaceWidthMm={surfaceBox.width} width={width} x={x} y={y} /> : null}
      {selected && showEdgeCuts && !rectDragDelta ? <EdgeCutLabels edgeCuts={result.edgeOffsets} height={height} onEditOffset={onEditOffset} width={width} x={x} y={y} /> : null}
    </Group>
  );
}

function getZoneMeasurementBounds(zone: FinishZone, origin = { minX: 0, minY: 0 }) {
  const shape = zone.shape;
  return shape.type === 'polygon' ? getBoundingBox(shape.points) : getBoundingBox([
    { x: origin.minX + shape.xMm, y: origin.minY + shape.yMm },
    { x: origin.minX + shape.xMm + shape.widthMm, y: origin.minY + shape.yMm + shape.heightMm },
  ]);
}

export function ZoneClearanceLabels({ bounds, contour, delta, view }: {
  bounds: ReturnType<typeof getBoundingBox>;
  contour: PointMm[];
  delta: PointMm;
  view: PlanViewTransform;
}) {
  const ref = useRef<Konva.Group>(null);
  useKeepKonvaOnTop(ref);
  const live = { ...bounds, minX: bounds.minX + delta.x, maxX: bounds.maxX + delta.x, minY: bounds.minY + delta.y, maxY: bounds.maxY + delta.y };
  const walls = getFloorZoneDistanceBounds(contour, live);
  const cx = (live.minX + live.maxX) / 2;
  const cy = (live.minY + live.maxY) / 2;
  const spans = [
    { id: 'left', start: { x: walls.minX, y: cy }, end: { x: live.minX, y: cy } },
    { id: 'right', start: { x: live.maxX, y: cy }, end: { x: walls.maxX, y: cy } },
    { id: 'top', start: { x: cx, y: walls.minY }, end: { x: cx, y: live.minY } },
    { id: 'bottom', start: { x: cx, y: live.maxY }, end: { x: cx, y: walls.maxY } },
  ];
  const positions = arrangeMeasurementLabels(spans.map(({ id, start, end }) => ({ id, position: { x: view.x((start.x + end.x) / 2), y: view.y((start.y + end.y) / 2) } })));
  // Keep measurements above every zone/object without changing tile stacking.
  // This is a sibling of the draggable shapes, so wall endpoints stay fixed.
  return (
    <Group ref={ref} name="zone-clearances" listening={false}>
      {spans.map(({ id, start, end }) => <FloorDistanceSpan key={id} start={start} end={end} view={view} showZero labelPosition={positions.get(id)} />)}
    </Group>
  );
}

function PolygonZoneHandles({
  onChange,
  points,
  surfaceContour,
  view,
}: {
  onChange: (points: PointMm[]) => void;
  points: PointMm[];
  surfaceContour: PointMm[];
  view: PlanViewTransform;
}) {
  function movePoint(event: Konva.KonvaEventObject<DragEvent>, index: number) {
    event.cancelBubble = true;
    const node = event.currentTarget;
    const nextPoint = view.toPoint(node.x(), node.y());
    const nextPoints = points.map((point, pointIndex) => (pointIndex === index ? nextPoint : point));
    if (!isValidFloorZonePolygon(nextPoints, surfaceContour)) {
      node.position({ x: view.x(points[index].x), y: view.y(points[index].y) });
      return;
    }
    onChange(nextPoints);
  }

  return (
    <Group>
      {points.map((point, index) => (
        <Circle
          key={`polygon-zone-handle-${index}`}
          x={view.x(point.x)}
          y={view.y(point.y)}
          radius={7}
          fill="#FFFFFF"
          stroke="#6F4F93"
          strokeWidth={2}
          draggable
          onMouseDown={(event) => { event.cancelBubble = true; }}
          onTouchStart={(event) => { event.cancelBubble = true; }}
          onDragStart={(event) => { event.cancelBubble = true; }}
          onDragMove={(event) => movePoint(event, index)}
          onDragEnd={(event) => movePoint(event, index)}
          onMouseEnter={(event) => {
            const container = event.target.getStage()?.container();
            if (container) container.style.cursor = 'move';
          }}
          onMouseLeave={(event) => {
            const container = event.target.getStage()?.container();
            if (container) container.style.cursor = 'default';
          }}
        />
      ))}
    </Group>
  );
}

function isValidFloorZonePolygon(points: PointMm[], surfaceContour: PointMm[]): boolean {
  if (points.length < 3 || points.some((point) => !pointInPolygonOrBoundary(point, surfaceContour))) return false;
  if (points.some((point, index) => segmentLength(point, points[(index + 1) % points.length]) < 100)) return false;
  if (points.some((point, index) => !isSegmentInsidePolygon(surfaceContour, point, points[(index + 1) % points.length]))) return false;

  for (let first = 0; first < points.length; first += 1) {
    const firstNext = (first + 1) % points.length;
    for (let second = first + 1; second < points.length; second += 1) {
      const secondNext = (second + 1) % points.length;
      if (first === second || firstNext === second || secondNext === first) continue;
      if (segmentsCross(points[first], points[firstNext], points[second], points[secondNext])) return false;
    }
  }
  return true;
}

function translatePolygon(points: PointMm[], deltaXmm: number, deltaYmm: number): PointMm[] {
  return points.map((point) => ({
    x: Math.round(point.x + deltaXmm),
    y: Math.round(point.y + deltaYmm),
  }));
}

type PolygonDragSession = {
  pointerX: number;
  pointerY: number;
  scaleX: number;
  scaleY: number;
};

function createPolygonDragSession(node: Konva.Node): PolygonDragSession | null {
  const pointer = node.getStage()?.getPointerPosition();
  if (!pointer) return null;
  const scale = node.getAbsoluteScale();
  return {
    pointerX: pointer.x,
    pointerY: pointer.y,
    scaleX: Math.max(0.0001, Math.abs(scale.x)),
    scaleY: Math.max(0.0001, Math.abs(scale.y)),
  };
}

function getPolygonPointerDelta(node: Konva.Node, session: PolygonDragSession | null): PointMm | null {
  const pointer = node.getStage()?.getPointerPosition();
  if (!pointer || !session) return null;
  return {
    x: Math.round(canvasToMm((pointer.x - session.pointerX) / session.scaleX)),
    y: Math.round(canvasToMm((pointer.y - session.pointerY) / session.scaleY)),
  };
}

function constrainPolygonDeltaToRect(
  points: PointMm[],
  surfaceWidthMm: number,
  surfaceHeightMm: number,
  requested: PointMm,
  fallback: PointMm = { x: 0, y: 0 },
): PointMm {
  if (!points.length) return fallback;
  const bounds = getBoundingBox(points);
  return {
    x: Math.round(Math.max(-bounds.minX, Math.min(surfaceWidthMm - bounds.maxX, requested.x))),
    y: Math.round(Math.max(-bounds.minY, Math.min(surfaceHeightMm - bounds.maxY, requested.y))),
  };
}

function constrainPolygonDeltaToContour(
  points: PointMm[],
  surfaceContour: PointMm[],
  requested: PointMm,
  fallback: PointMm = { x: 0, y: 0 },
): PointMm {
  if (!points.length || surfaceContour.length < 3) return fallback;
  const requestedPoints = translatePolygon(points, requested.x, requested.y);
  if (isValidFloorZonePolygon(requestedPoints, surfaceContour)) return requested;

  let low = 0;
  let high = 1;
  let best = isValidFloorZonePolygon(translatePolygon(points, fallback.x, fallback.y), surfaceContour)
    ? fallback
    : { x: 0, y: 0 };
  for (let iteration = 0; iteration < 18; iteration += 1) {
    const ratio = (low + high) / 2;
    const candidate = {
      x: Math.round(fallback.x + (requested.x - fallback.x) * ratio),
      y: Math.round(fallback.y + (requested.y - fallback.y) * ratio),
    };
    if (isValidFloorZonePolygon(translatePolygon(points, candidate.x, candidate.y), surfaceContour)) {
      best = candidate;
      low = ratio;
    } else {
      high = ratio;
    }
  }
  return best;
}

function constrainZoneDrag(node: Konva.Node, shape: Extract<FinishZone['shape'], { type: 'rect' }>, surfaceWidthMm: number, surfaceHeightMm: number) {
  const minDeltaXmm = -shape.xMm;
  const maxDeltaXmm = surfaceWidthMm - shape.xMm - shape.widthMm;
  const minDeltaYmm = -shape.yMm;
  const maxDeltaYmm = surfaceHeightMm - shape.yMm - shape.heightMm;
  node.position({
    x: mmToCanvas(Math.max(minDeltaXmm, Math.min(maxDeltaXmm, canvasToMm(node.x())))),
    y: mmToCanvas(Math.max(minDeltaYmm, Math.min(maxDeltaYmm, canvasToMm(node.y())))),
  });
}

function ZoneResizeHandles({
  height,
  onResize,
  shape,
  surfaceHeightMm,
  surfaceWidthMm,
  width,
  x,
  y,
}: {
  height: number;
  onResize: (patch: Partial<Extract<FinishZone['shape'], { type: 'rect' }>>) => void;
  shape: Extract<FinishZone['shape'], { type: 'rect' }>;
  surfaceHeightMm: number;
  surfaceWidthMm: number;
  width: number;
  x: number;
  y: number;
}) {
  const dragSessions = useRef<Record<string, { shape: Extract<FinishZone['shape'], { type: 'rect' }>; startX: number; startY: number }>>({});
  const [scheduleResize, flushResize] = useAnimationFrameCallback(onResize);
  const handles = [
    { cursor: 'nwse-resize', id: 'tl', x, y },
    { cursor: 'nesw-resize', id: 'tr', x: x + width, y },
    { cursor: 'nwse-resize', id: 'br', x: x + width, y: y + height },
    { cursor: 'nesw-resize', id: 'bl', x, y: y + height },
  ];

  function resizeFromPointer(event: Konva.KonvaEventObject<DragEvent>, handle: (typeof handles)[number], finish = false) {
    event.cancelBubble = true;
    const node = event.currentTarget;
    const session = dragSessions.current[handle.id] ?? { shape: { ...shape }, startX: handle.x, startY: handle.y };
    dragSessions.current[handle.id] = session;
    const dx = canvasToMm(node.x() - session.startX);
    const dy = canvasToMm(node.y() - session.startY);
    const patch = getZoneResizePatch(session.shape, handle.id, dx, dy, surfaceWidthMm, surfaceHeightMm);
    if (finish) flushResize(patch);
    else scheduleResize(patch);
    if (finish) delete dragSessions.current[handle.id];
  }

  return (
    <>
      {handles.map((handle) => (
        <Circle
          key={handle.id}
          x={handle.x}
          y={handle.y}
          radius={6}
          fill="#FFFFFF"
          stroke="#6F4F93"
          strokeWidth={2}
          draggable
          onMouseDown={(event) => { event.cancelBubble = true; }}
          onTouchStart={(event) => { event.cancelBubble = true; }}
          onDragStart={(event) => {
            event.cancelBubble = true;
            dragSessions.current[handle.id] = { shape: { ...shape }, startX: handle.x, startY: handle.y };
          }}
          onDragMove={(event) => resizeFromPointer(event, handle)}
          onMouseEnter={(event) => {
            const container = event.target.getStage()?.container();
            if (container) container.style.cursor = handle.cursor;
          }}
          onMouseLeave={(event) => {
            const container = event.target.getStage()?.container();
            if (container) container.style.cursor = 'default';
          }}
          onDragEnd={(event) => {
            resizeFromPointer(event, handle, true);
          }}
        />
      ))}
    </>
  );
}

function getZoneResizePatch(
  shape: Extract<FinishZone['shape'], { type: 'rect' }>,
  handleId: string,
  rawDeltaXmm: number,
  rawDeltaYmm: number,
  surfaceWidthMm: number,
  surfaceHeightMm: number,
): Partial<Extract<FinishZone['shape'], { type: 'rect' }>> {
  const minSizeMm = 100;
  const clampDelta = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(value)));
  const growsLeft = handleId === 'tl' || handleId === 'bl';
  const growsTop = handleId === 'tl' || handleId === 'tr';
  const deltaX = growsLeft
    ? clampDelta(rawDeltaXmm, -shape.xMm, shape.widthMm - minSizeMm)
    : clampDelta(rawDeltaXmm, -(shape.widthMm - minSizeMm), surfaceWidthMm - shape.xMm - shape.widthMm);
  const deltaY = growsTop
    ? clampDelta(rawDeltaYmm, -shape.yMm, shape.heightMm - minSizeMm)
    : clampDelta(rawDeltaYmm, -(shape.heightMm - minSizeMm), surfaceHeightMm - shape.yMm - shape.heightMm);

  if (handleId === 'tl') return { heightMm: shape.heightMm - deltaY, widthMm: shape.widthMm - deltaX, xMm: shape.xMm + deltaX, yMm: shape.yMm + deltaY };
  if (handleId === 'tr') return { heightMm: shape.heightMm - deltaY, widthMm: shape.widthMm + deltaX, yMm: shape.yMm + deltaY };
  if (handleId === 'br') return { heightMm: shape.heightMm + deltaY, widthMm: shape.widthMm + deltaX };
  return { heightMm: shape.heightMm + deltaY, widthMm: shape.widthMm - deltaX, xMm: shape.xMm + deltaX };
}

function FloorEdgeCutLabels({ contour, layout, material, onEditOffset, view }: { contour: PointMm[]; layout: SurfaceLayout; material: TileMaterial; onEditOffset: (edge: keyof LayoutEdgeCuts) => void; view: PlanViewTransform }) {
  const box = getBoundingBox(contour);
  const result = generatePolygonLayout({
    layout,
    points: contour,
    tileHeightMm: material.heightMm,
    tileWidthMm: material.widthMm,
  });
  return <EdgeCutLabels edgeCuts={result.edgeOffsets} height={mmToCanvas(box.height)} onEditOffset={onEditOffset} width={mmToCanvas(box.width)} x={view.x(box.minX)} y={view.y(box.minY)} />;
}

function EdgeCutLabels({ edgeCuts, height, onEditOffset, width, x, y }: { edgeCuts: LayoutEdgeCuts; height: number; onEditOffset: (edge: keyof LayoutEdgeCuts) => void; width: number; x: number; y: number }) {
  const top = edgeCuts.top ?? 0;
  const bottom = edgeCuts.bottom ?? 0;
  const left = edgeCuts.left ?? 0;
  const right = edgeCuts.right ?? 0;
  return (
    <Group>
      <SmallMetricLabel x={x + width / 2} y={y - 20} text={`${top} мм`} onClick={() => onEditOffset('top')} />
      <SmallMetricLabel x={x + width / 2} y={y + height + 20} text={`${bottom} мм`} onClick={() => onEditOffset('bottom')} />
      <SmallMetricLabel x={x - 42} y={y + height / 2} text={`${left} мм`} onClick={() => onEditOffset('left')} />
      <SmallMetricLabel x={x + width + 42} y={y + height / 2} text={`${right} мм`} onClick={() => onEditOffset('right')} />
    </Group>
  );
}

function SmallMetricLabel({ onClick, x, y, text }: { onClick?: () => void; x: number; y: number; text: string }) {
  const ref = useRef<Konva.Group>(null);
  useKeepKonvaOnTop(ref);
  return (
    <Group ref={ref} x={x} y={y} listening={Boolean(onClick)} onClick={onClick} onTap={onClick}>
      <Rect x={-34} y={-10} width={68} height={20} fill="#FFFFFF" stroke="#A385C4" strokeWidth={1} cornerRadius={4} shadowColor="rgba(30, 30, 40, 0.10)" shadowBlur={6} />
      <Text x={-32} y={-6} width={64} align="center" text={text} fill="#6F4F93" fontSize={11} />
    </Group>
  );
}

/**
 * Draws a complete tile layout in three canvas paths instead of creating one
 * Konva node per tile. Large rooms can contain more than a thousand pieces;
 * keeping only the interactive overlays as nodes makes zooming and dragging
 * substantially lighter while preserving the exact fills and seams.
 */
function TilePiecesCanvas({ color, originX, originY, pieces, variant }: {
  color: string;
  originX: number;
  originY: number;
  pieces: LayoutTilePiece[];
  variant: 'floor' | 'wall';
}) {
  return (
    <>
      {(['full', 'cut', 'critical'] as const).map((kind) => (
        <Shape
          key={kind}
          listening={false}
          perfectDrawEnabled={false}
          fill={variant === 'floor' ? getFloorLayoutPieceFill(kind, color) : getLayoutPieceFill(kind, color)}
          stroke={getLayoutPieceStroke(kind)}
          strokeWidth={1}
          sceneFunc={(context, shape) => {
            context.beginPath();
            for (const piece of pieces) {
              if (piece.kind !== kind) continue;
              if (piece.polygon?.length) {
                context.moveTo(originX + mmToCanvas(piece.polygon[0].x), originY + mmToCanvas(piece.polygon[0].y));
                for (const point of piece.polygon.slice(1)) context.lineTo(originX + mmToCanvas(point.x), originY + mmToCanvas(point.y));
                context.closePath();
              } else {
                context.rect(
                  originX + mmToCanvas(piece.xMm),
                  originY + mmToCanvas(piece.yMm),
                  Math.max(1, mmToCanvas(piece.widthMm)),
                  Math.max(1, mmToCanvas(piece.heightMm)),
                );
              }
            }
            context.fillStrokeShape(shape);
          }}
        />
      ))}
    </>
  );
}

function getLayoutPieceFill(kind: 'full' | 'cut' | 'critical', color = '#F2EBF9') {
  if (kind === 'critical') return mixHexColor(color, '#6F4F93', 0.34);
  if (kind === 'cut') return mixHexColor(color, '#A385C4', 0.2);
  return color;
}

function getFloorLayoutPieceFill(kind: 'full' | 'cut' | 'critical', color = '#F2EBF9') {
  if (kind === 'critical') return mixHexColor(color, '#6F4F93', 0.32);
  if (kind === 'cut') return mixHexColor(color, '#FFFFFF', 0.3);
  return color;
}

function mixHexColor(first: string, second: string, ratio: number): string {
  const parse = (value: string) => /^#[0-9a-f]{6}$/i.test(value) ? [1, 3, 5].map((index) => Number.parseInt(value.slice(index, index + 2), 16)) : [242, 235, 249];
  const left = parse(first);
  const right = parse(second);
  return `#${left.map((value, index) => Math.round(value * (1 - ratio) + right[index] * ratio).toString(16).padStart(2, '0')).join('')}`;
}

function getLayoutPieceStroke(kind: 'full' | 'cut' | 'critical') {
  if (kind === 'critical') return '#6F4F93';
  if (kind === 'cut') return '#A385C4';
  return '#B9A2CF';
}

function getZoneShapeLabel(zone: FinishZone): string {
  if (zone.shape.type === 'polygon') {
    const bounds = getBoundingBox(zone.shape.points);
    return `По контуру · ${Math.round(bounds.width)} × ${Math.round(bounds.height)} мм`;
  }
  return `${zone.shape.widthMm} × ${zone.shape.heightMm} мм`;
}

function getZoneAreaId(project: TileProject, surface: TileProject['surfaces'][number], fallbackAreaIndex = 0): string {
  const sourceParts = surface.sourceRef?.split(':') ?? [];
  if (sourceParts[0] === 'floor' || sourceParts[0] === 'wall') return sourceParts[1] ?? project.room.areas?.[fallbackAreaIndex]?.id ?? 'room-1';
  if (sourceParts[0] === 'partition') {
    const partition = project.room.partitions?.find((item) => item.id === sourceParts[1]);
    return partition?.areaId ?? project.room.areas?.[fallbackAreaIndex]?.id ?? 'room-1';
  }
  return project.room.areas?.[fallbackAreaIndex]?.id ?? 'room-1';
}

function TemplatePickerDialog({ onSelect, selectedTemplateId }: { onSelect: (templateId: string) => void; selectedTemplateId: string }) {
  return (
    <div className="modal-backdrop template-picker-backdrop" role="presentation">
      <section className="confirm-dialog template-picker-dialog" role="dialog" aria-modal="true" aria-labelledby="template-picker-title">
        <h2 id="template-picker-title">Выберите форму помещения</h2>
        <TemplateGrid onSelect={onSelect} selectedTemplateId={selectedTemplateId} />
      </section>
    </div>
  );
}

function TemplateGrid({ onSelect, selectedTemplateId }: { onSelect: (templateId: string) => void; selectedTemplateId: string }) {
  const firstTemplate = templates.find((template) => template.id === 'rectangle');
  const customTemplate = templates.find((template) => template.id === 'custom');
  const orderedTemplates = [
    firstTemplate,
    customTemplate,
    ...templates.filter((template) => template.id !== 'rectangle' && template.id !== 'custom'),
  ].filter((template): template is RoomTemplate => Boolean(template));
  return (
    <div className="template-grid">
      {orderedTemplates.map((template) => (
        <button
          type="button"
          className={template.id === selectedTemplateId ? 'template-card active' : 'template-card'}
          key={template.id}
          onClick={() => onSelect(template.id)}
        >
          <RoomIcon templateId={template.id} />
          <span>{template.name}</span>
          <small>{template.id === 'custom' ? 'Своя форма' : 'Редактируется на холсте'}</small>
        </button>
      ))}
    </div>
  );
}

function getWallSurfaceAreaId(surface: TileProject['surfaces'][number] | undefined): string | null {
  const parts = surface?.sourceRef?.split(':') ?? [];
  return parts[0] === 'wall' ? parts[1] ?? null : null;
}

function getOpeningRoomAreaId(project: TileProject, opening: Opening): string | null {
  return getWallSurfaceAreaId(project.surfaces.find((surface) => surface.id === opening.surfaceId));
}

export function RoomTools({
  disabled,
  editingOpeningId,
  onAddDoor,
  onAddPassage,
  onAddPartition,
  onAddRoom,
  onAddWindow,
  onCancelOpening,
  onDeleteOpening,
  onDeletePartition,
  onEditOpening,
  onEditPartitionLength,
  onOpeningSurfaceChange,
  onSelectOpening,
  onSelectPartition,
  onSubmitOpening,
  openingEditorKind,
  openingSurfaceId,
  partitionDrawingActive,
  project,
  selectedOpeningId,
  selectedPartitionId,
}: {
  disabled: boolean;
  editingOpeningId: string | null;
  onAddDoor: () => void;
  onAddPassage: () => void;
  onAddPartition: () => void;
  onAddRoom: () => void;
  onAddWindow: () => void;
  onCancelOpening: () => void;
  onDeleteOpening: (openingId: string) => void;
  onDeletePartition: (partitionId: string) => void;
  onEditOpening: (openingId: string) => void;
  onEditPartitionLength: (partitionId: string, value: string) => void;
  onOpeningSurfaceChange: (surfaceId: string) => void;
  onSelectOpening: (surfaceId: string, openingId: string) => void;
  onSelectPartition: (partitionId: string | null) => void;
  onSubmitOpening: (kind: Opening['kind'], dimensions: { widthMm: number; heightMm?: number }, surfaceId: string, openingId: string | null) => boolean;
  openingEditorKind: Opening['kind'] | null;
  openingSurfaceId: string | null;
  partitionDrawingActive: boolean;
  project: TileProject;
  selectedOpeningId: string | null;
  selectedPartitionId: string | null;
}) {
  const areas = project.room.areas ?? [];
  const wallSurfaces = project.surfaces.filter((surface) => surface.type === 'wall');
  const editingOpening = project.room.openings?.find((opening) => opening.id === editingOpeningId) ?? null;
  const selectedSurface = wallSurfaces.find((surface) => surface.id === openingSurfaceId) ?? wallSurfaces[0];
  const [widthMm, setWidthMm] = useState('800');
  const [heightMm, setHeightMm] = useState('2100');
  const [infoItemId, setInfoItemId] = useState<string | null>(null);
  const [openAreaId, setOpenAreaId] = useState<string | null>(() => areas[0]?.id ?? null);
  const [editingPartitionId, setEditingPartitionId] = useState<string | null>(null);
  const [partitionLengthMm, setPartitionLengthMm] = useState('1000');

  useEffect(() => {
    if (!openingEditorKind) return;
    if (editingOpening) {
      setWidthMm(String(editingOpening.widthMm));
      setHeightMm(String(editingOpening.heightMm));
      return;
    }
    const defaultWidth = openingEditorKind === 'door' ? 800 : openingEditorKind === 'window' ? 1000 : 900;
    const defaultHeight = openingEditorKind === 'door' ? 2100 : openingEditorKind === 'window' ? 1000 : selectedSurface?.heightMm ?? 2500;
    setWidthMm(String(Math.min(defaultWidth, selectedSurface?.widthMm ?? defaultWidth)));
    setHeightMm(String(Math.min(defaultHeight, selectedSurface?.heightMm ?? defaultHeight)));
  }, [editingOpening?.id, openingEditorKind, selectedSurface?.id]);

  useEffect(() => {
    if (openAreaId === null || areas.some((area) => area.id === openAreaId)) return;
    setOpenAreaId(areas[0]?.id ?? null);
  }, [areas, openAreaId]);

  const editorTitle = openingEditorKind === 'door' ? 'Дверь' : openingEditorKind === 'window' ? 'Окно' : 'Проход';

  return (
    <div className="panel-stack room-plan-panel">
      <section className="panel-module">
        <h1 className="panel-module-title">План помещений</h1>
        <div className="panel-card panel-section">
          <div className="panel-action-grid panel-action-grid-wide-first">
            <button type="button" disabled={disabled} onClick={onAddRoom}>Добавить помещение</button>
            <button type="button" className={partitionDrawingActive ? 'active' : ''} disabled={disabled} onClick={onAddPartition}>Перегородка</button>
            <button type="button" className={openingEditorKind === 'door' ? 'active' : ''} disabled={disabled} onClick={onAddDoor}>Дверь</button>
            <button type="button" className={openingEditorKind === 'passage' ? 'active' : ''} disabled={disabled} onClick={onAddPassage}>Проход</button>
            <button type="button" className={openingEditorKind === 'window' ? 'active' : ''} disabled={disabled} onClick={onAddWindow}>Окно</button>
          </div>
        </div>
      </section>

      {openingEditorKind && selectedSurface ? (
        <section className="panel-module structure-editor-module">
          <h1 className="panel-module-title">{editingOpening ? `Изменить: ${editorTitle}` : `Новый элемент: ${editorTitle}`}</h1>
          <div className="panel-card panel-section">
            <form className="object-editor structure-editor" onSubmit={(event) => {
              event.preventDefault();
              const saved = onSubmitOpening(openingEditorKind, {
                widthMm: Number(widthMm),
                ...(openingEditorKind === 'passage' ? {} : { heightMm: Number(heightMm) }),
              }, selectedSurface.id, editingOpeningId);
              if (saved) onCancelOpening();
            }}>
              <label className="object-editor-wide">
                Стена
                <select value={selectedSurface.id} disabled={Boolean(editingOpening)} onChange={(event) => onOpeningSurfaceChange(event.target.value)}>
                  {wallSurfaces.map((surface) => {
                    const areaId = getWallSurfaceAreaId(surface);
                    const area = areas.find((item) => item.id === areaId);
                    const wallNumber = surface.sourceRef?.split(':')[2] ?? '';
                    return <option key={surface.id} value={surface.id}>{area?.name ?? 'Помещение'} · Стена {wallNumber}</option>;
                  })}
                </select>
              </label>
              <label>Ширина, мм<input type="number" min={Math.min(300, selectedSurface.widthMm)} max={selectedSurface.widthMm} step="1" value={widthMm} onChange={(event) => setWidthMm(event.target.value)} required /></label>
              {openingEditorKind !== 'passage' ? <label>Высота, мм<input type="number" min={Math.min(300, selectedSurface.heightMm)} max={selectedSurface.heightMm} step="1" value={heightMm} onChange={(event) => setHeightMm(event.target.value)} required /></label> : null}
              <div className="object-editor-actions object-editor-wide">
                <button type="button" className="secondary" onClick={onCancelOpening}>Отмена</button>
                <button type="submit">{editingOpening ? 'Сохранить изменения' : 'Создать'}</button>
              </div>
            </form>
          </div>
        </section>
      ) : null}

      {editingPartitionId ? (
        <section className="panel-module structure-editor-module">
          <h1 className="panel-module-title">Изменить перегородку</h1>
          <div className="panel-card panel-section">
            <form className="object-editor structure-editor" onSubmit={(event) => {
              event.preventDefault();
              onEditPartitionLength(editingPartitionId, partitionLengthMm);
              setEditingPartitionId(null);
            }}>
              <label className="object-editor-wide">Длина, мм<input type="number" min="250" max="15000" step="1" value={partitionLengthMm} onChange={(event) => setPartitionLengthMm(event.target.value)} required /></label>
              <div className="object-editor-actions object-editor-wide">
                <button type="button" className="secondary" onClick={() => setEditingPartitionId(null)}>Отмена</button>
                <button type="submit">Сохранить изменения</button>
              </div>
            </form>
          </div>
        </section>
      ) : null}

      <section className="panel-module panel-module-fill structure-list-module">
        <h1 className="panel-module-title">Элементы помещений</h1>
        <div className="panel-card panel-section panel-card-fill">
          <div className="panel-groups">
            {areas.map((area) => {
              const openings = (project.room.openings ?? []).filter((opening) => getOpeningRoomAreaId(project, opening) === area.id);
              const partitions = (project.room.partitions ?? []).filter((partition) => (partition.areaId ?? areas[0]?.id) === area.id);
              const count = openings.length + partitions.length;
              return (
                <details className="panel-group" key={area.id} open={openAreaId === area.id}>
                  <summary onClick={(event) => {
                    event.preventDefault();
                    setOpenAreaId((current) => current === area.id ? null : area.id);
                  }}><span>{area.name}</span><small>{count}</small></summary>
                  <div className="panel-group-list">
                    {openings.map((opening) => (
                      <article key={opening.id} className={selectedOpeningId === opening.id ? 'selected' : ''}>
                        <button type="button" className="panel-item-name" onClick={() => onSelectOpening(opening.surfaceId, opening.id)}>{getOpeningDisplayName(opening)}</button>
                        <div className="panel-item-actions">
                          <button type="button" aria-label="Информация" onClick={() => setInfoItemId((current) => current === opening.id ? null : opening.id)}>i</button>
                          <button type="button" aria-label="Изменить" onClick={() => onEditOpening(opening.id)}>✎</button>
                          <button type="button" className="danger-lite" aria-label="Удалить" onClick={() => onDeleteOpening(opening.id)}>×</button>
                        </div>
                        {infoItemId === opening.id ? <div className="panel-item-info"><span>{opening.widthMm} × {opening.heightMm} мм</span><small>{opening.connectedOpeningId ? 'Соединяет два помещения' : `Установлено на стене ${opening.surfaceId}`}</small></div> : null}
                      </article>
                    ))}
                    {partitions.map((partition) => (
                      <article key={partition.id} className={selectedPartitionId === partition.id ? 'selected' : ''}>
                        <button type="button" className="panel-item-name" onClick={() => onSelectPartition(partition.id)}>{partition.name}</button>
                        <div className="panel-item-actions">
                          <button type="button" aria-label="Информация" onClick={() => setInfoItemId((current) => current === partition.id ? null : partition.id)}>i</button>
                          <button type="button" aria-label="Изменить" onClick={() => { setEditingPartitionId(partition.id); setPartitionLengthMm(String(segmentLength(partition.start, partition.end))); onCancelOpening(); }}>✎</button>
                          <button type="button" className="danger-lite" aria-label="Удалить" onClick={() => onDeletePartition(partition.id)}>×</button>
                        </div>
                        {infoItemId === partition.id ? <div className="panel-item-info"><span>{segmentLength(partition.start, partition.end)} × {partition.heightMm} × {partition.thicknessMm} мм</span><small>Длина × высота × толщина</small></div> : null}
                      </article>
                    ))}
                    {!count ? <p>В этом помещении пока нет элементов.</p> : null}
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function RoomIcon({ templateId }: { templateId: string }) {
  const pointsByTemplate: Record<string, string> = {
    rectangle: '18,18 74,18 74,58 18,58',
    square: '24,16 68,16 68,60 24,60',
    narrow: '34,12 58,12 58,64 34,64',
    'l-shape': '18,18 74,18 74,58 46,58 46,38 18,38',
    projection: '18,18 74,18 74,52 58,52 58,64 34,64 34,52 18,52',
    custom: '18,18 74,18 64,34 74,58 18,58 28,38',
  };
  return (
    <svg className="shape-icon" viewBox="0 0 92 76" aria-hidden="true">
      <polygon points={pointsByTemplate[templateId] ?? pointsByTemplate.rectangle} />
    </svg>
  );
}

function TilePresetCard({ active, onSelect, tile }: { active: boolean; onSelect: () => void; tile: TileSizePreset }) {
  const width = tile.widthMm ?? 600;
  const height = tile.heightMm ?? 600;
  const ratio = Math.min(42 / width, 42 / height);
  const rectWidth = Math.max(10, width * ratio);
  const rectHeight = Math.max(10, height * ratio);
  return (
    <button type="button" className={active ? 'tile-card active' : 'tile-card'} onClick={onSelect}>
      <span className="tile-card-preview">
        <span style={{ width: rectWidth, height: rectHeight }} />
      </span>
      <strong>{tile.label}</strong>
    </button>
  );
}

const GROUT_PRESETS_MM = [0, 0.5, 1, 2, 3];

function formatGroutLabel(groutMm: number) {
  const value = Number.isInteger(groutMm) ? String(groutMm) : groutMm.toFixed(1).replace(/\.0$/, '');
  return `${value} мм`;
}

function GroutControl({
  disabled,
  groutMm,
  onGroutChange,
  onOpenChange,
  open,
}: {
  disabled: boolean;
  groutMm: number;
  onGroutChange: (groutMm: number) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const [customOpen, setCustomOpen] = useState(false);
  const isPreset = GROUT_PRESETS_MM.some((value) => Math.abs(value - groutMm) < 0.05);

  return (
    <section className="panel-module grout-module">
      <h1 className="panel-module-title">Размер швов</h1>
      <details
        className="panel-card panel-section layout-options-select grout-options-select"
        open={open}
        onToggle={(event) => {
          onOpenChange(event.currentTarget.open);
          if (!event.currentTarget.open) setCustomOpen(false);
        }}
      >
        <summary className="layout-options-summary">
          <strong>{formatGroutLabel(groutMm)}</strong>
        </summary>
        <div className="layout-page single-page">
          <div className="layout-secondary-grid grout-pattern-grid">
            {GROUT_PRESETS_MM.map((value) => (
              <button
                key={value}
                type="button"
                className={Math.abs(value - groutMm) < 0.05 ? 'active' : ''}
                disabled={disabled}
                onClick={() => {
                  setCustomOpen(false);
                  onGroutChange(value);
                }}
              >
                {formatGroutLabel(value)}
              </button>
            ))}
            <button
              type="button"
              className={!isPreset || customOpen ? 'active' : ''}
              disabled={disabled}
              onClick={() => setCustomOpen(true)}
            >
              Свой
            </button>
          </div>
          {customOpen || !isPreset ? (
            <label className="grout-custom-field">
              Свой вариант
              <input
                type="number"
                min={0}
                max={50}
                step={0.1}
                value={groutMm}
                disabled={disabled}
                onChange={(event) => onGroutChange(Number(event.currentTarget.value))}
              />
              <span>мм</span>
            </label>
          ) : null}
        </div>
      </details>
    </section>
  );
}

function LayoutControl({
  material,
  openSection,
  onOpenSectionChange,
  onOriginModeChange,
  onOffsetReset,
  onOffsetStep,
  onPatternChange,
  onStaggerChange,
  onToggleLayoutDrag,
  onToggleLayoutRotate,
  onTurnReset,
  onTurnChange,
  surface,
  zone,
}: {
  material: TileMaterial | null | undefined;
  openSection: TilePanelSection | null;
  onOpenSectionChange: (section: TilePanelSection | null | ((current: TilePanelSection | null) => TilePanelSection | null)) => void;
  onOriginModeChange: (originMode: SurfaceLayout['originMode']) => void;
  onOffsetReset: () => void;
  onOffsetStep: (deltaXmm: number, deltaYmm: number) => void;
  onPatternChange: (pattern: LayoutPattern) => void;
  onStaggerChange: (stagger: LayoutStagger) => void;
  onToggleLayoutDrag: (enabled: boolean) => void;
  onToggleLayoutRotate: (enabled: boolean) => void;
  onTurnReset: () => void;
  onTurnChange: (degrees: number) => void;
  surface: TileProject['surfaces'][number] | null | undefined;
  zone: FinishZone | null | undefined;
}) {
  const modes: Array<{ label: string; title: string; value: SurfaceLayout['originMode'] }> = [
    { label: '↖', title: 'Левый верх', value: 'corner-tl' },
    { label: '↑', title: 'Сверху', value: 'corner-t' },
    { label: '↗', title: 'Правый верх', value: 'corner-tr' },
    { label: '←', title: 'Слева', value: 'corner-l' },
    { label: '•', title: 'Плитка в центре', value: 'tile-center' },
    { label: '→', title: 'Справа', value: 'corner-r' },
    { label: '↙', title: 'Левый низ', value: 'corner-bl' },
    { label: '↓', title: 'Снизу', value: 'corner-b' },
    { label: '↘', title: 'Правый низ', value: 'corner-br' },
  ];
  const popularPatterns: Array<{ label: string; preview: 'brick' | 'deck' | 'diagonal' | 'herringbone' | 'straight'; value: LayoutPattern }> = [
    { label: 'Прямая укладка', preview: 'straight', value: 'straight' },
    { label: 'Кладка под кирпич', preview: 'brick', value: 'brick' },
    { label: 'Диагональная кладка', preview: 'diagonal', value: 'diagonal' },
    { label: 'Укладка ёлочка', preview: 'herringbone', value: 'herringbone' },
    { label: 'Палубная укладка', preview: 'deck', value: 'wood-random' },
  ];
  const offsetPatterns: Array<{ label: string; value: LayoutStagger }> = [
    { label: 'Без смещения', value: 'none' },
    { label: '1/2', value: 'half' },
    { label: '1/3', value: 'third' },
    { label: '1/4', value: 'quarter' },
  ];
  const selectedPattern = popularPatterns.find((pattern) => pattern.value === zone?.layout.pattern);
  const selectedOffset = offsetPatterns.find((pattern) => pattern.value === (zone?.layout.stagger ?? getLegacyLayoutStagger(zone?.layout.pattern)));

  return (
    <>
      <section className="panel-module layout-module">
        <h1 className="panel-module-title">Укладка</h1>
        <details
          className="panel-card panel-section layout-options-select"
          open={openSection === 'laying'}
        >
          <summary className="layout-options-summary" onClick={(event) => {
            event.preventDefault();
            onOpenSectionChange((current) => current === 'laying' ? null : 'laying');
          }}>
            <strong>{selectedPattern?.label ?? 'Популярные варианты'}</strong>
          </summary>
          <div className="layout-page single-page">
            <div className="layout-secondary-grid laying-pattern-grid">
              {popularPatterns.map((pattern) => (
                <button key={pattern.value} type="button" className={zone?.layout.pattern === pattern.value ? 'layout-pattern-option active' : 'layout-pattern-option'} disabled={!zone} onClick={() => onPatternChange(pattern.value)}>
                  <LayoutPatternPreview pattern={pattern.preview} />
                  <span>{pattern.label}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="layout-reset-button"
              disabled={!zone}
              onClick={() => {
                onOriginModeChange('corner-tl');
                onPatternChange('straight');
                onStaggerChange('none');
                onOffsetReset();
                onToggleLayoutDrag(false);
                onToggleLayoutRotate(false);
                onTurnReset();
              }}
            >
              Сбросить
            </button>
            <LayoutMetrics material={material} surface={surface} zone={zone} />
          </div>
        </details>
      </section>
      <section className="panel-module offset-module">
        <h1 className="panel-module-title">Смещение</h1>
        <details
          className="panel-card panel-section layout-options-select offset-options-select"
          open={openSection === 'offset'}
        >
          <summary className="layout-options-summary" onClick={(event) => {
            event.preventDefault();
            onOpenSectionChange((current) => current === 'offset' ? null : 'offset');
          }}><strong>{selectedOffset?.label ?? 'Выберите долю смещения'}</strong></summary>
          <div className="layout-page single-page">
            <div className="layout-secondary-grid offset-pattern-grid">
              {offsetPatterns.map((pattern) => (
                <button key={pattern.value} type="button" className={(zone?.layout.stagger ?? getLegacyLayoutStagger(zone?.layout.pattern)) === pattern.value ? 'active' : ''} disabled={!zone} onClick={() => onStaggerChange(pattern.value)}>{pattern.label}</button>
              ))}
            </div>
            <div className="layout-control layout-move-card">
              <TileRotationControl
                key={`${surface?.id ?? ''}:${zone?.id ?? ''}`}
                disabled={!zone}
                degrees={zone?.layout.turnDeg ?? 0}
                onApply={(degrees) => {
                  onToggleLayoutRotate(false);
                  onTurnChange(degrees);
                }}
              />
              <div className="layout-offset-control">
                <button type="button" aria-label="Сдвинуть влево вверх" disabled={!zone} onClick={() => onOffsetStep(-10, -10)}>↖</button>
                <button type="button" aria-label="Сдвинуть вверх" disabled={!zone} onClick={() => onOffsetStep(0, -10)}><ArrowUp size={15} /></button>
                <button type="button" aria-label="Сдвинуть вправо вверх" disabled={!zone} onClick={() => onOffsetStep(10, -10)}>↗</button>
                <button type="button" aria-label="Сдвинуть влево" disabled={!zone} onClick={() => onOffsetStep(-10, 0)}><ArrowLeft size={15} /></button>
                <button type="button" aria-label="Сбросить смещение" disabled={!zone} onClick={onOffsetReset}><RotateCcw size={15} /></button>
                <button type="button" aria-label="Сдвинуть вправо" disabled={!zone} onClick={() => onOffsetStep(10, 0)}><ArrowRight size={15} /></button>
                <button type="button" aria-label="Сдвинуть влево вниз" disabled={!zone} onClick={() => onOffsetStep(-10, 10)}>↙</button>
                <button type="button" aria-label="Сдвинуть вниз" disabled={!zone} onClick={() => onOffsetStep(0, 10)}><ArrowDown size={15} /></button>
                <button type="button" aria-label="Сдвинуть вправо вниз" disabled={!zone} onClick={() => onOffsetStep(10, 10)}>↘</button>
              </div>
            </div>
          </div>
        </details>
      </section>
      <section className="panel-module origin-module">
        <h1 className="panel-module-title">Точка старта</h1>
        <details className="panel-card panel-section layout-options-select origin-options-select" open={openSection === 'origin'}>
          <summary className="layout-options-summary" onClick={(event) => {
            event.preventDefault();
            onOpenSectionChange((current) => current === 'origin' ? null : 'origin');
          }}><strong>{zone?.layout.originMode === 'joint-center' ? 'Шов в центре' : modes.find((mode) => mode.value === zone?.layout.originMode)?.title ?? 'Выберите точку старта'}</strong></summary>
          <div className="layout-page single-page origin-options-content">
            <div className="center-mode-grid">
              <button type="button" className={zone?.layout.originMode === 'tile-center' ? 'active' : ''} disabled={!zone} onClick={() => onOriginModeChange('tile-center')}>Плитка в центре</button>
              <button type="button" className={zone?.layout.originMode === 'joint-center' ? 'active' : ''} disabled={!zone} onClick={() => onOriginModeChange('joint-center')}>Шов в центре</button>
            </div>
            <div className="origin-mode-grid">
              {modes.map((mode) => (
                <button key={mode.value} type="button" title={mode.title} aria-label={mode.title} className={zone?.layout.originMode === mode.value ? 'active' : ''} disabled={!zone} onClick={() => onOriginModeChange(mode.value)}>{mode.label}</button>
              ))}
            </div>
          </div>
        </details>
      </section>
    </>
  );
}

function getLegacyLayoutStagger(pattern: LayoutPattern | undefined): LayoutStagger {
  if (pattern === 'half-offset') return 'half';
  if (pattern === 'third-offset') return 'third';
  if (pattern === 'quarter-offset') return 'quarter';
  return 'none';
}

function LayoutPatternPreview({ pattern }: { pattern: 'brick' | 'deck' | 'diagonal' | 'herringbone' | 'straight' }) {
  if (pattern === 'herringbone') {
    const commands: string[] = [];
    for (let row = -8; row <= 8; row += 1) {
      const y = row * 5;
      const rowStart = -row * 5;
      for (let pair = -5; pair <= 5; pair += 1) {
        const x = rowStart + pair * 20;
        commands.push(`M${x} ${y}h10v5h-10z`, `M${x + 10} ${y}h5v10h-5z`);
      }
    }
    return (
      <svg className="layout-pattern-preview" viewBox="0 0 54 30" aria-hidden="true">
        <g transform="rotate(45 27 15)"><path d={commands.join('')} /></g>
      </svg>
    );
  }
  const paths = {
    straight: 'M18 0V30M36 0V30M0 10H54M0 20H54',
    brick: 'M0 10H54M0 20H54M18 0V10M36 0V10M9 10V20M27 10V20M45 10V20M18 20V30M36 20V30',
    deck: 'M9 0V30M18 0V30M27 0V30M36 0V30M45 0V30M0 7H9M0 25H9M9 16H18M18 5H27M18 24H27M27 12H36M36 21H45M45 8H54M45 27H54',
    diagonal: 'M-8 8L14-14M-8 26L32-14M-2 32L44-14M16 32L58-10M34 32L58 8M52 32L58 26M-4-4L32 32M14-4L50 32M32-4L58 22',
  } satisfies Record<Exclude<typeof pattern, 'herringbone'>, string>;
  return (
    <svg className="layout-pattern-preview" viewBox="0 0 54 30" aria-hidden="true">
      <path d={paths[pattern]} />
    </svg>
  );
}

function LayoutMetrics({ material, surface, zone }: { material: TileMaterial | null | undefined; surface: TileProject['surfaces'][number] | null | undefined; zone: FinishZone | null | undefined }) {
  if (!surface || !zone || !material) return <p>Выберите пол или стену.</p>;
  const stats = getZoneLayoutResult(surface, zone, material);
  return (
    <div className="layout-metrics">
      <span>{stats.minCutMm ? `Мин. подрезка ${Math.round(stats.minCutMm)} мм` : 'Без подрезок'}</span>
      <span>{stats.criticalCount ? `Критичных ${stats.criticalCount}` : 'Критичных нет'}</span>
    </div>
  );
}

export function ZonesPanel({
  activeSurface,
  activeZone,
  onCreateZone,
  onDeleteZone,
  onSaveZone,
  onSelectZone,
  manualDrawingActive,
  editingManualZoneId = null,
  onCancelManualZone,
  onStartManualZone,
  onEditManualZone,
  project,
  selectedSurfaceId,
  selectedZoneId,
  selectionRevision = 0,
}: {
  activeSurface: TileProject['surfaces'][number] | null | undefined;
  activeZone: FinishZone | null | undefined;
  onCreateZone: (widthMm: number, lengthMm: number, name: string) => string | null;
  onDeleteZone: (surfaceId?: string | null, zoneId?: string | null) => void;
  onSaveZone: (surfaceId: string, zoneId: string, name: string, shape: Partial<Extract<FinishZone['shape'], { type: 'rect' }>>) => string | null;
  onSelectZone: (surfaceId: string, zoneId: string | null) => void;
  manualDrawingActive: boolean;
  editingManualZoneId?: string | null;
  onCancelManualZone: () => void;
  onStartManualZone: () => void;
  onEditManualZone: (surfaceId: string, zoneId: string) => void;
  project: TileProject;
  selectedSurfaceId: string | null;
  selectedZoneId: string | null;
  selectionRevision?: number;
}) {
  const surface = activeSurface?.type === 'floor' || activeSurface?.type === 'wall' ? activeSurface : null;
  const [editingZone, setEditingZone] = useState<{ surfaceId: string; zoneId: string } | null>(null);
  const editingSurface = project.surfaces.find((item) => item.id === editingZone?.surfaceId);
  const editedZone = editingSurface?.zones.find((item) => item.id === editingZone?.zoneId);
  const editedManualZone = project.surfaces.flatMap((item) => item.zones).find((zone) => zone.id === editingManualZoneId);
  const [name, setName] = useState('');
  const [width, setWidth] = useState('500');
  const [length, setLength] = useState('800');
  const [position, setPosition] = useState({ xMm: 0, yMm: 0 });
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setError(null); }, [surface?.id]);
  useEffect(() => {
    if (manualDrawingActive) setEditingZone(null);
  }, [manualDrawingActive]);
  useEffect(() => {
    if (editingZone && !editedZone) resetForm();
  }, [editingZone, editedZone]);

  function editZone(surfaceId: string, zone: FinishZone) {
    onCancelManualZone();
    onSelectZone(surfaceId, zone.id);
    setError(null);
    if (zone.shape.type === 'polygon') { setEditingZone(null); onEditManualZone(surfaceId, zone.id); return; }
    if (zone.shape.type !== 'rect') return;
    setEditingZone({ surfaceId, zoneId: zone.id });
    setName(zone.name);
    setWidth(String(zone.shape.widthMm));
    setLength(String(zone.shape.heightMm));
    setPosition({ xMm: zone.shape.xMm, yMm: zone.shape.yMm });
  }

  function resetForm() {
    setEditingZone(null); setName(''); setError(null); setWidth('500'); setLength('800');
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (manualDrawingActive) return;
    const widthMm = Number(width);
    const heightMm = Number(length);
    if (![widthMm, heightMm].every((value) => Number.isInteger(value) && value >= 100 && value <= 15000)) { setError('Введите размеры от 100 до 15000 мм целыми числами.'); return; }
    const message = editingSurface && editedZone?.shape.type === 'rect'
      ? onSaveZone(editingSurface.id, editedZone.id, name.trim() || editedZone.name, { widthMm, heightMm, ...position })
      : onCreateZone(widthMm, heightMm, name);
    setError(message);
    if (!message) resetForm();
  }
  const [zoneDialog, setZoneDialog] = useState<{ mode: 'info' | 'edit'; surfaceId: string; zoneId: string } | null>(null);
  const dialogSurface = zoneDialog ? project.surfaces.find((candidate) => candidate.id === zoneDialog.surfaceId) : null;
  const dialogZone = dialogSurface?.zones.find((zone) => zone.id === zoneDialog?.zoneId) ?? null;
  const areas = project.room.areas ?? [];
  const zonesByArea = areas.map((area, areaIndex) => {
    const surfaces = project.surfaces.filter((candidate) => {
      if (candidate.type !== 'floor' && candidate.type !== 'wall') return false;
      return getZoneAreaId(project, candidate, areaIndex) === area.id;
    });
    return { area, zones: surfaces.flatMap((candidate) => candidate.zones.slice(1).map((zone) => ({ surface: candidate, zone }))) };
  });
  const selectedZoneAreaId = zonesByArea.find(({ zones }) => zones.some(({ zone }) => zone.id === selectedZoneId))?.area.id ?? null;
  const [expandedAreaId, setExpandedAreaId] = useState<string | null>(() => selectedZoneAreaId ?? areas[0]?.id ?? null);
  const zoneListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedZoneAreaId) setExpandedAreaId(selectedZoneAreaId);
  }, [selectedZoneAreaId, selectedZoneId, selectionRevision]);

  useEffect(() => {
    if (selectedZoneAreaId && expandedAreaId === selectedZoneAreaId) {
      zoneListRef.current?.querySelector<HTMLElement>('article[aria-current="true"]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    }
  }, [expandedAreaId, selectedZoneAreaId, selectedZoneId, selectionRevision]);

  function openZoneDialog(surfaceId: string, zoneId: string, mode: 'info' | 'edit') {
    onCancelManualZone();
    onSelectZone(surfaceId, zoneId);
    setZoneDialog({ mode, surfaceId, zoneId });
  }

  return (
    <div className="panel-stack zones-panel">
      <section className="panel-module">
        <h1 className="panel-module-title">{editingZone || editedManualZone ? 'Редактирование зоны' : 'Новая зона'}</h1>
        <div className="panel-card panel-section">
          <form className="object-editor zone-editor" onSubmit={submit}>
            <p className="panel-hint object-editor-wide">{editingSurface ? getZoneSurfaceLabel(project, editingSurface) : surface ? getZoneSurfaceLabel(project, surface) : 'Выберите пол или стену на схеме.'}</p>
            <label className="object-editor-wide">Название<input maxLength={60} value={editedManualZone?.name ?? name} onChange={(event) => setName(event.target.value)} placeholder={`Зона ${surface?.zones.length ?? 1}`} disabled={manualDrawingActive} /></label>
            <label>Ширина, мм<input type="number" min={100} max={15000} step={1} value={width} onChange={(event) => setWidth(event.target.value)} disabled={manualDrawingActive} required /></label>
            <label>Длина, мм<input type="number" min={100} max={15000} step={1} value={length} onChange={(event) => setLength(event.target.value)} disabled={manualDrawingActive} required /></label>
            {editingSurface ? <>
              <label>Отступ слева, мм<input type="number" min={0} step={1} value={position.xMm} onChange={(event) => setPosition({ ...position, xMm: Number(event.target.value) })} required /></label>
              <label>Отступ справа, мм<input type="number" min={0} step={1} value={editingSurface.widthMm - position.xMm - Number(width)} onChange={(event) => setPosition({ ...position, xMm: editingSurface.widthMm - Number(width) - Number(event.target.value) })} required /></label>
              <label>Отступ сверху, мм<input type="number" min={0} step={1} value={position.yMm} onChange={(event) => setPosition({ ...position, yMm: Number(event.target.value) })} required /></label>
              <label>Отступ снизу, мм<input type="number" min={0} step={1} value={editingSurface.heightMm - position.yMm - Number(length)} onChange={(event) => setPosition({ ...position, yMm: editingSurface.heightMm - Number(length) - Number(event.target.value) })} required /></label>
            </> : null}
            {error ? <p role="alert" className="error-text object-editor-wide">{error}</p> : null}
            <div className="object-editor-actions object-editor-wide">
              {editingZone ? <button type="button" className="secondary" onClick={resetForm}>Отмена</button> : <button type="button" aria-pressed={manualDrawingActive} disabled={!surface} className={manualDrawingActive ? 'active' : 'secondary'} onClick={manualDrawingActive ? onCancelManualZone : () => { resetForm(); onStartManualZone(); }}>Нарисуй сам</button>}
              <button type="submit" disabled={manualDrawingActive || (!surface && !editingZone)}>{editingZone ? 'Сохранить изменения' : 'Создать'}</button>
            </div>
          </form>
        </div>
      </section>
      <section className="panel-module panel-module-fill">
        <h1 className="panel-module-title">Список зон</h1>
        <div className="panel-card panel-section panel-card-fill">
          <div className="panel-groups" ref={zoneListRef}>
            {zonesByArea.map(({ area, zones }) => (
              <details
                className="panel-group"
                key={area.id}
                open={expandedAreaId === area.id}
              >
                <summary
                  onClick={(event) => {
                    event.preventDefault();
                    setExpandedAreaId((current) => (current === area.id ? null : area.id));
                  }}
                >
                  <span>{area.name}</span>
                  <small>{zones.length}</small>
                </summary>
                <div className="panel-group-list">
                  {zones.length ? zones.map(({ surface: zoneSurface, zone }) => (
                    <article key={zone.id} className={selectedZoneId === zone.id ? 'selected' : ''} aria-current={selectedZoneId === zone.id ? 'true' : undefined}>
                      <button type="button" className="panel-item-name" onClick={() => { onCancelManualZone(); onSelectZone(zoneSurface.id, zone.id); }}>{zone.name || 'Зона без названия'}</button>
                      <small className="panel-item-meta">{zoneSurface.type === 'floor' ? 'Пол' : zoneSurface.name} · {getZoneShapeLabel(zone)}</small>
                      <div className="panel-item-actions">
                        <button type="button" aria-label="Информация" onClick={() => openZoneDialog(zoneSurface.id, zone.id, 'info')}>i</button>
                        <button type="button" aria-label="Изменить" onClick={() => editZone(zoneSurface.id, zone)}>✎</button>
                        <button type="button" aria-label="Удалить" className="danger-lite" onClick={() => onDeleteZone(zoneSurface.id, zone.id)}>×</button>
                      </div>
                    </article>
                  )) : <p>Зон пока нет</p>}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
      {zoneDialog && dialogSurface && dialogZone ? zoneDialog.mode === 'info' ? (
        <ZoneInfoDialog project={project} surface={dialogSurface} zone={dialogZone} onClose={() => setZoneDialog(null)} />
      ) : (
        <ZoneEditDialog surface={dialogSurface} zone={dialogZone} onClose={() => setZoneDialog(null)} onSave={(name, shape) => { onSaveZone(dialogSurface.id, dialogZone.id, name, shape); setZoneDialog(null); }} />
      ) : null}
    </div>
  );
}

function getZoneRectMetrics(surface: TileProject['surfaces'][number], zone: FinishZone) {
  if (zone.shape.type !== 'rect') return null;
  return {
    bottom: Math.max(0, Math.round(surface.heightMm - zone.shape.yMm - zone.shape.heightMm)),
    height: Math.round(zone.shape.heightMm),
    left: Math.max(0, Math.round(zone.shape.xMm)),
    right: Math.max(0, Math.round(surface.widthMm - zone.shape.xMm - zone.shape.widthMm)),
    top: Math.max(0, Math.round(zone.shape.yMm)),
    width: Math.round(zone.shape.widthMm),
  };
}

function ZoneInfoDialog({ onClose, project, surface, zone }: { onClose: () => void; project: TileProject; surface: TileProject['surfaces'][number]; zone: FinishZone }) {
  const metrics = getZoneRectMetrics(surface, zone);
  const material = zone.materialId ? project.materials.find((item) => item.id === zone.materialId) : null;
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="confirm-dialog zone-details-dialog" role="dialog" aria-modal="true" aria-labelledby="zone-info-title">
        <h2 id="zone-info-title">Информация о зоне</h2>
        <dl className="zone-details-grid">
          <div><dt>Название</dt><dd>{zone.name || 'Зона без названия'}</dd></div>
          <div><dt>Поверхность</dt><dd>{getZoneSurfaceLabel(project, surface)}</dd></div>
          <div><dt>Плитка</dt><dd>{material?.label ?? material?.name ?? 'Не выбрана'}</dd></div>
          {metrics ? <><div><dt>Ширина</dt><dd>{metrics.width} мм</dd></div><div><dt>Длина</dt><dd>{metrics.height} мм</dd></div><div><dt>Отступ сверху</dt><dd>{metrics.top} мм</dd></div><div><dt>Отступ снизу</dt><dd>{metrics.bottom} мм</dd></div><div><dt>Отступ слева</dt><dd>{metrics.left} мм</dd></div><div><dt>Отступ справа</dt><dd>{metrics.right} мм</dd></div></> : <div><dt>Размер</dt><dd>{getZoneShapeLabel(zone)}</dd></div>}
        </dl>
        <div className="confirm-actions"><button type="button" className="confirm-submit" onClick={onClose}>Закрыть</button></div>
      </section>
    </div>
  );
}

function ZoneEditDialog({ onClose, onSave, surface, zone }: { onClose: () => void; onSave: (name: string, shape: Partial<Extract<FinishZone['shape'], { type: 'rect' }>>) => void; surface: TileProject['surfaces'][number]; zone: FinishZone }) {
  const initial = getZoneRectMetrics(surface, zone);
  const [name, setName] = useState(zone.name);
  const [values, setValues] = useState(initial ?? { bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0 });
  const [error, setError] = useState<string | null>(null);

  function change(field: keyof typeof values, rawValue: string) {
    const value = Math.max(0, Math.round(Number(rawValue) || 0));
    setValues((current) => {
      const next = { ...current, [field]: value };
      if (field === 'width' || field === 'left') next.right = Math.max(0, surface.widthMm - next.left - next.width);
      if (field === 'right') next.left = Math.max(0, surface.widthMm - next.right - next.width);
      if (field === 'height' || field === 'top') next.bottom = Math.max(0, surface.heightMm - next.top - next.height);
      if (field === 'bottom') next.top = Math.max(0, surface.heightMm - next.bottom - next.height);
      return next;
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!initial) { setError('Размер этой зоны можно менять непосредственно на схеме.'); return; }
    if (values.width < 100 || values.height < 100 || values.left + values.width > surface.widthMm || values.top + values.height > surface.heightMm) {
      setError('Зона должна быть не меньше 100 мм и полностью находиться внутри выбранной поверхности.');
      return;
    }
    onSave(name.trim() || 'Зона без названия', { xMm: values.left, yMm: values.top, widthMm: values.width, heightMm: values.height });
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="confirm-dialog zone-details-dialog" role="dialog" aria-modal="true" aria-labelledby="zone-edit-title" onSubmit={submit}>
        <h2 id="zone-edit-title">Изменить зону</h2>
        <div className="zone-edit-fields">
          <label className="wide">Название<input type="text" maxLength={60} value={name} onChange={(event) => setName(event.currentTarget.value)} /></label>
          <label>Ширина, мм<input type="number" min={100} step={1} value={values.width} onChange={(event) => change('width', event.currentTarget.value)} /></label>
          <label>Длина, мм<input type="number" min={100} step={1} value={values.height} onChange={(event) => change('height', event.currentTarget.value)} /></label>
          <label>Отступ сверху, мм<input type="number" min={0} step={1} value={values.top} onChange={(event) => change('top', event.currentTarget.value)} /></label>
          <label>Отступ снизу, мм<input type="number" min={0} step={1} value={values.bottom} onChange={(event) => change('bottom', event.currentTarget.value)} /></label>
          <label>Отступ слева, мм<input type="number" min={0} step={1} value={values.left} onChange={(event) => change('left', event.currentTarget.value)} /></label>
          <label>Отступ справа, мм<input type="number" min={0} step={1} value={values.right} onChange={(event) => change('right', event.currentTarget.value)} /></label>
        </div>
        {error ? <p className="error-text">{error}</p> : null}
        <div className="confirm-actions"><button type="button" className="confirm-cancel" onClick={onClose}>Отмена</button><button type="submit" className="confirm-submit">Сохранить</button></div>
      </form>
    </div>
  );
}

function getZoneSurfaceLabel(project: TileProject, surface: TileProject['surfaces'][number]): string {
  const sourceParts = surface.sourceRef?.split(':') ?? [];
  const area = project.room.areas?.find((item) => item.id === sourceParts[1]);
  const roomName = area?.name ?? 'Помещение';
  if (surface.type === 'floor') return `${roomName} · Пол`;
  if (sourceParts[0] === 'partition') return surface.name;
  return `${roomName} · ${surface.name}`;
}

function CalculationDialog({
  calculation,
  onClose,
  project,
}: {
  calculation: ReturnType<typeof calculateProject>;
  onClose: () => void;
  project: TileProject;
}) {
  const selectedSurfaces = project.surfaces.filter((surface) => calculation.zones.some((zone) => zone.surfaceId === surface.id));
  const hasSelectedFloors = selectedSurfaces.some((surface) => surface.type === 'floor');
  const hasSelectedWalls = selectedSurfaces.some((surface) => surface.type === 'wall');
  const [materialsOpen, setMaterialsOpen] = useState(true);
  const [pdfIncludeFloor, setPdfIncludeFloor] = useState(hasSelectedFloors);
  const [pdfIncludeWalls, setPdfIncludeWalls] = useState(hasSelectedWalls);
  const selectedRooms = [...new Set(selectedSurfaces.map((surface) => {
    const areaId = surface.sourceRef?.split(':')[1];
    return project.room.areas?.find((area) => area.id === areaId)?.name ?? (surface.type === 'floor' ? 'Помещение' : null);
  }).filter((name): name is string => Boolean(name)))];

  function downloadPdf() {
    if (!pdfIncludeFloor && !pdfIncludeWalls) return;
    exportProjectPdf(project, calculation, {
      includeFloor: pdfIncludeFloor && hasSelectedFloors,
      includeWalls: pdfIncludeWalls && hasSelectedWalls,
      surfaceIds: selectedSurfaces.map((surface) => surface.id),
    });
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="confirm-dialog calculation-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="calculation-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="calculation-dialog-head">
          <h2 id="calculation-title">Расчёт плитки</h2>
          <button type="button" className="calculation-close" aria-label="Закрыть" onClick={onClose}>×</button>
        </header>

        <p className="calculation-selected">
          Помещений: {calculation.roomCount}{selectedRooms.length ? ` (${selectedRooms.join(', ')})` : ''} · Полов: {calculation.floorCount} · Стен: {calculation.wallCount}
        </p>

        <div className="calculation-summary">
          <span>
            <strong>{calculation.roomCount}</strong>
            помещений
          </span>
          <span>
            <strong>{calculation.floorCount}</strong>
            полов
          </span>
          <span>
            <strong>{calculation.wallCount}</strong>
            стен
          </span>
          <span>
            <strong>{calculation.totalAreaM2.toFixed(2)} м²</strong>
            плитки
          </span>
        </div>

        <details className="calculation-section" open={materialsOpen} onToggle={(event) => setMaterialsOpen(event.currentTarget.open)}>
          <summary>Использованная плитка <small>{calculation.materials.length}</small></summary>
          <div className="calculation-section-body">
            {calculation.materials.length ? calculation.materials.map((item) => (
              <article key={item.material.id} className="calculation-card">
                <span className="calculation-color-chip" style={{ background: item.material.swatch.value }} />
                <div className="calculation-card-copy">
                  <strong>{item.material.name}</strong>
                  <small>{item.material.label ?? `${item.material.widthMm} × ${item.material.heightMm} мм`}</small>
                </div>
                <b>{item.areaM2.toFixed(2)} м²</b>
              </article>
            )) : <p className="calculation-empty">Пока нет плитки для расчёта.</p>}
          </div>
        </details>

        <div className="calculation-total">
          <div>
            <span>Итого</span>
            <small>метраж выбранных поверхностей</small>
          </div>
          <strong>{calculation.totalAreaM2.toFixed(2)} м²</strong>
        </div>

        <div className="calculation-pdf-panel">
          <span>Схема в PDF</span>
          <label className={hasSelectedFloors ? undefined : 'disabled'}>
            <input type="checkbox" checked={pdfIncludeFloor && hasSelectedFloors} disabled={!hasSelectedFloors} onChange={(event) => setPdfIncludeFloor(event.currentTarget.checked)} />
            Пол
          </label>
          <label className={hasSelectedWalls ? undefined : 'disabled'}>
            <input type="checkbox" checked={pdfIncludeWalls && hasSelectedWalls} disabled={!hasSelectedWalls} onChange={(event) => setPdfIncludeWalls(event.currentTarget.checked)} />
            Стены
          </label>
        </div>

        <div className="calculation-actions">
          <button type="button" className="calculation-pdf" disabled={!(pdfIncludeFloor && hasSelectedFloors) && !(pdfIncludeWalls && hasSelectedWalls)} onClick={downloadPdf}>Выгрузить в PDF</button>
          <button type="button" className="secondary" onClick={onClose}>Закрыть</button>
        </div>
      </section>
    </div>
  );
}

function PromoCard() {
  return (
    <aside className="promo-card" aria-label="Vilray Studio">
      <span>Проект Vilray</span>
      <strong>Нужен такой калькулятор для вашего бренда?</strong>
      <p>Разрабатываем визуализаторы, конфигураторы и сервисы для отделочных материалов.</p>
      <a href="https://vilraystudio.ru/" target="_blank" rel="noreferrer">
        Обсудить проект
      </a>
    </aside>
  );
}

interface PlanViewTransform {
  scale: number;
  toPoint: (x: number, y: number) => PointMm;
  x: (value: number) => number;
  y: (value: number) => number;
}

function getRoomDragPreviewTransform(
  preview: { areaIds: Set<string>; x: number; y: number; rotationRad: number; rotationCenter: PointMm | null } | null,
  areaId: string,
  view: PlanViewTransform,
) {
  if (!preview?.areaIds.has(areaId)) return { x: 0, y: 0, rotation: 0, offsetX: 0, offsetY: 0 };
  if (!preview.rotationCenter || Math.abs(preview.rotationRad) < 1e-8) {
    return { x: preview.x * view.scale, y: preview.y * view.scale, rotation: 0, offsetX: 0, offsetY: 0 };
  }
  const centerX = view.x(preview.rotationCenter.x);
  const centerY = view.y(preview.rotationCenter.y);
  return {
    x: centerX + preview.x * view.scale,
    y: centerY + preview.y * view.scale,
    rotation: preview.rotationRad * 180 / Math.PI,
    offsetX: centerX,
    offsetY: centerY,
  };
}

interface WallFrame {
  areaId: string;
  height: number;
  heightMm: number;
  id: string;
  index: number;
  name: string;
  segmentIndex: number;
  width: number;
  widthMm: number;
  x: number;
  y: number;
}

interface WallAreaSection {
  areaId: string;
  expanded: boolean;
  headerY: number;
  name: string;
  width: number;
  x: number;
}

interface WallLayout {
  frames: WallFrame[];
  sections: WallAreaSection[];
}

interface CanvasSectionBlock {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CanvasSectionBlocks {
  floor: CanvasSectionBlock;
  walls: CanvasSectionBlock;
}

function getFloorDimensionPosition(contour: PointMm[], index: number, view: PlanViewTransform) {
  const point = contour[index];
  const next = contour[(index + 1) % contour.length];
  return getFloorSegmentDimensionPosition(contour, point, next, view);
}

function getFloorSegmentDimensionPosition(contour: PointMm[], point: PointMm, next: PointMm, view: PlanViewTransform, compact = false) {
  const box = getBoundingBox(contour);
  const center = { x: view.x(box.minX + box.width / 2), y: view.y(box.minY + box.height / 2) };
  const mid = { x: (view.x(point.x) + view.x(next.x)) / 2, y: (view.y(point.y) + view.y(next.y)) / 2 };
  const horizontal = point.y === next.y;

  if (horizontal) {
    const offset = compact ? 15 : 17;
    return { x: mid.x, y: mid.y < center.y ? mid.y - offset : mid.y + offset };
  }

  const offset = compact ? 37 : 42;
  return { x: mid.x < center.x ? mid.x - offset : mid.x + offset, y: mid.y };
}

function getFloorDimensionPositions(contour: PointMm[], view: PlanViewTransform, compact: boolean): Array<{ x: number; y: number }> {
  const width = compact ? 64 : 74;
  const height = compact ? 18 : 20;
  const gap = 4;
  const positions = contour.map((point, index) => getFloorSegmentDimensionPosition(contour, point, contour[(index + 1) % contour.length], view, compact));
  const initial = positions.map((position) => ({ ...position }));
  const segments = contour.map((point, index) => {
    const next = contour[(index + 1) % contour.length];
    const dx = view.x(next.x) - view.x(point.x);
    const dy = view.y(next.y) - view.y(point.y);
    const length = Math.max(1, Math.hypot(dx, dy));
    return { horizontal: Math.abs(dx) >= Math.abs(dy), length, tangent: { x: dx / length, y: dy / length } };
  });

  for (let pass = 0; pass < 4; pass += 1) {
    let changed = false;
    for (let firstIndex = 0; firstIndex < positions.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < positions.length; secondIndex += 1) {
        const first = positions[firstIndex];
        const second = positions[secondIndex];
        if (Math.abs(first.x - second.x) >= width + gap || Math.abs(first.y - second.y) >= height + gap) continue;

        const firstSegment = segments[firstIndex];
        const secondSegment = segments[secondIndex];
        const moveIndex = firstSegment.horizontal !== secondSegment.horizontal
          ? firstSegment.horizontal ? secondIndex : firstIndex
          : secondIndex;
        const fixedIndex = moveIndex === firstIndex ? secondIndex : firstIndex;
        const moving = positions[moveIndex];
        const fixed = positions[fixedIndex];
        const segment = segments[moveIndex];
        const alongSize = segment.horizontal ? width : height;
        const alongDistance = segment.horizontal ? Math.abs(moving.x - fixed.x) : Math.abs(moving.y - fixed.y);
        const requiredShift = Math.max(2, alongSize + gap - alongDistance);
        const relative = (moving.x - fixed.x) * segment.tangent.x + (moving.y - fixed.y) * segment.tangent.y;
        const direction = relative === 0 ? (moveIndex > fixedIndex ? 1 : -1) : Math.sign(relative);
        const maxShift = Math.max(10, (segment.length - alongSize) / 2 + 4);
        const nextShift = Math.max(-maxShift, Math.min(maxShift,
          (moving.x - initial[moveIndex].x) * segment.tangent.x
          + (moving.y - initial[moveIndex].y) * segment.tangent.y
          + requiredShift * direction));
        moving.x = initial[moveIndex].x + segment.tangent.x * nextShift;
        moving.y = initial[moveIndex].y + segment.tangent.y * nextShift;
        changed = true;
      }
    }
    if (!changed) break;
  }

  // Sliding along the wall cannot separate labels on short walls, where the
  // label is wider than the wall itself (an L-shaped room's small steps).
  // Whatever still overlaps gets pushed outward, away from the room, into its
  // own lane — so every wall keeps a readable size label.
  const box = getBoundingBox(contour);
  const center = { x: view.x(box.minX + box.width / 2), y: view.y(box.minY + box.height / 2) };
  const outward = contour.map((point, index) => {
    const next = contour[(index + 1) % contour.length];
    const mid = { x: (view.x(point.x) + view.x(next.x)) / 2, y: (view.y(point.y) + view.y(next.y)) / 2 };
    return point.y === next.y
      ? { x: 0, y: mid.y < center.y ? -1 : 1 }
      : { x: mid.x < center.x ? -1 : 1, y: 0 };
  });

  for (let pass = 0; pass < 8; pass += 1) {
    let changed = false;
    for (let firstIndex = 0; firstIndex < positions.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < positions.length; secondIndex += 1) {
        const first = positions[firstIndex];
        const second = positions[secondIndex];
        if (Math.abs(first.x - second.x) >= width + gap || Math.abs(first.y - second.y) >= height + gap) continue;
        // Push the label whose wall offers less room to slide along.
        const moveIndex = segments[firstIndex].length <= segments[secondIndex].length ? firstIndex : secondIndex;
        const normal = outward[moveIndex];
        positions[moveIndex].x += normal.x * (width + gap);
        positions[moveIndex].y += normal.y * (height + gap);
        changed = true;
      }
    }
    if (!changed) break;
  }

  return positions;
}

function getSharedFloorLayoutBox(project: TileProject, areaId: string, previewContour?: PointMm[]): ReturnType<typeof getBoundingBox> {
  const areas = project.room.areas ?? [{ id: 'room-1', name: 'Помещение 1', contour: project.room.contour }];
  const areaIndex = areas.findIndex((area) => area.id === areaId);
  const floorId = areaIndex <= 0 ? 'surface-floor' : `surface-floor-${areaId}`;
  const floor = project.surfaces.find((surface) => surface.id === floorId);
  const baseZone = floor?.zones[0];
  const sourceKey = baseZone ? `${baseZone.materialId ?? ''}|${JSON.stringify(baseZone.layout)}` : '';
  const connectedAreaIds = getConnectedAreaIdsForUi(project, areaId);
  const sharedAreas = areas.filter((area, index) => {
    if (!connectedAreaIds.has(area.id)) return false;
    const candidateFloorId = index === 0 ? 'surface-floor' : `surface-floor-${area.id}`;
    const candidateZone = project.surfaces.find((surface) => surface.id === candidateFloorId)?.zones[0];
    return Boolean(candidateZone) && `${candidateZone?.materialId ?? ''}|${JSON.stringify(candidateZone?.layout)}` === sourceKey;
  });
  return getBoundingBox((sharedAreas.length ? sharedAreas : areas.filter((area) => area.id === areaId)).flatMap((area) => area.id === areaId && previewContour ? previewContour : area.contour));
}

function getConnectedAreaIdsForUi(project: TileProject, areaId: string): Set<string> {
  const connectedAreaIds = new Set<string>([areaId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const opening of project.room.openings ?? []) {
      if (!opening.connectedOpeningId) continue;
      const linked = project.room.openings?.find((item) => item.id === opening.connectedOpeningId);
      const firstAreaId = getAreaIdBySurfaceId(project, opening.surfaceId);
      const secondAreaId = linked ? getAreaIdBySurfaceId(project, linked.surfaceId) : null;
      if (!firstAreaId || !secondAreaId) continue;
      if (connectedAreaIds.has(firstAreaId) && !connectedAreaIds.has(secondAreaId)) { connectedAreaIds.add(secondAreaId); changed = true; }
      if (connectedAreaIds.has(secondAreaId) && !connectedAreaIds.has(firstAreaId)) { connectedAreaIds.add(firstAreaId); changed = true; }
    }
  }
  return connectedAreaIds;
}

function getAreaIdBySurfaceId(project: TileProject, surfaceId: string): string | null {
  const parts = project.surfaces.find((surface) => surface.id === surfaceId)?.sourceRef?.split(':') ?? [];
  return parts[0] === 'wall' ? parts[1] ?? null : null;
}

function getSelectedAreaId(project: TileProject, surfaceId: string | null): string {
  if (surfaceId) {
    const surface = project.surfaces.find((item) => item.id === surfaceId);
    const sourceParts = surface?.sourceRef?.split(':') ?? [];
    if ((sourceParts[0] === 'floor' || sourceParts[0] === 'wall') && sourceParts[1]) return sourceParts[1];
  }
  return project.room.areas?.[0]?.id ?? 'room-1';
}

function pointerToPlanPoint(pointer: { x: number; y: number }, viewport: CanvasViewport, view: PlanViewTransform): PointMm {
  const canvasX = (pointer.x - viewport.x) / viewport.zoom;
  const canvasY = (pointer.y - viewport.y) / viewport.zoom;
  return view.toPoint(canvasX, canvasY);
}

function getLayoutRotationCenter({
  planView,
  project,
  selectedSurfaceId,
  selectedZoneId,
  viewport,
  wallFrames,
}: {
  planView: PlanViewTransform;
  project: TileProject;
  selectedSurfaceId: string;
  selectedZoneId: string | null;
  viewport: CanvasViewport;
  wallFrames: WallFrame[];
}): { x: number; y: number } | null {
  const surface = project.surfaces.find((item) => item.id === selectedSurfaceId);
  if (!surface) return null;
  const zone = selectedZoneId
    ? surface.zones.find((item) => item.id === selectedZoneId)
    : surface.zones[0];
  const isExtraZone = Boolean(zone && selectedZoneId && zone.id !== surface.zones[0]?.id);

  if (surface.type === 'wall') {
    const frame = wallFrames.find((item) => item.id === surface.id);
    if (!frame) return null;
    if (isExtraZone && zone?.shape.type === 'rect') {
      return {
        x: viewport.x + (frame.x + mmToCanvas(zone.shape.xMm + zone.shape.widthMm / 2)) * viewport.zoom,
        y: viewport.y + (frame.y + mmToCanvas(zone.shape.yMm + zone.shape.heightMm / 2)) * viewport.zoom,
      };
    }
    if (isExtraZone && zone?.shape.type === 'polygon') {
      const box = getBoundingBox(zone.shape.points);
      return {
        x: viewport.x + (frame.x + mmToCanvas(box.minX + box.width / 2)) * viewport.zoom,
        y: viewport.y + (frame.y + mmToCanvas(box.minY + box.height / 2)) * viewport.zoom,
      };
    }
    return {
      x: viewport.x + (frame.x + frame.width / 2) * viewport.zoom,
      y: viewport.y + (frame.y + frame.height / 2) * viewport.zoom,
    };
  }

  if (isExtraZone && zone?.shape.type === 'polygon') {
    const box = getBoundingBox(zone.shape.points);
    return {
      x: viewport.x + planView.x(box.minX + box.width / 2) * viewport.zoom,
      y: viewport.y + planView.y(box.minY + box.height / 2) * viewport.zoom,
    };
  }

  const areaId = surface.sourceRef?.split(':')[1];
  const contour = project.room.areas?.find((area) => area.id === areaId)?.contour ?? project.room.contour;
  if (isExtraZone && zone?.shape.type === 'rect') {
    const surfaceBox = getBoundingBox(contour);
    return {
      x: viewport.x + planView.x(surfaceBox.minX + zone.shape.xMm + zone.shape.widthMm / 2) * viewport.zoom,
      y: viewport.y + planView.y(surfaceBox.minY + zone.shape.yMm + zone.shape.heightMm / 2) * viewport.zoom,
    };
  }

  const box = areaId ? getSharedFloorLayoutBox(project, areaId) : getBoundingBox(contour);
  return {
    x: viewport.x + planView.x(box.minX + box.width / 2) * viewport.zoom,
    y: viewport.y + planView.y(box.minY + box.height / 2) * viewport.zoom,
  };
}

function getPlanView(_contour: PointMm[]): PlanViewTransform {
  return {
    scale: PX_PER_MM,
    toPoint: (x: number, y: number) => ({
      x: Math.round((x - PLAN_OFFSET_X) / PX_PER_MM),
      y: Math.round((y - PLAN_OFFSET_Y) / PX_PER_MM),
    }),
    x: (value: number) => PLAN_OFFSET_X + mmToCanvas(value),
    y: (value: number) => PLAN_OFFSET_Y + mmToCanvas(value),
  };
}

function getWallLayout(project: TileProject, view: PlanViewTransform, collapsedAreaIds: Set<string>): WallLayout {
  const walls = project.surfaces.filter((surface) => surface.type === 'wall');
  const startX = 220;
  const floorBottomY = Math.max(...(project.room.areas ?? [{ contour: project.room.contour }]).flatMap((area) => area.contour.map((point) => view.y(point.y))));
  let sectionY = calculateWallsStartY(floorBottomY);
  const gap = 96;
  const areas = project.room.areas ?? [{ id: 'room-1', name: 'Помещение 1', contour: project.room.contour, heightMm: project.room.heightMm }];
  const areaIds = areas.map((area) => area.id);
  const wallsByArea = new Map<string, Array<{ index: number; wall: TileProject['surfaces'][number] }>>();

  walls.forEach((wall, index) => {
    const sourceParts = wall.sourceRef?.split(':') ?? [];
    const partition = sourceParts[0] === 'partition' ? project.room.partitions?.find((item) => item.id === sourceParts[1]) : null;
    const areaId = sourceParts[0] === 'wall' ? sourceParts[1] : partition?.areaId ?? areaIds[0] ?? 'room-1';
    const bucket = wallsByArea.get(areaId) ?? [];
    bucket.push({ index, wall });
    wallsByArea.set(areaId, bucket);
  });

  const frames: WallFrame[] = [];
  const sections: WallAreaSection[] = [];
  const horizontalInset = 16;
  const sectionWidth = Math.max(
    300,
    ...areas.map((area) => (wallsByArea.get(area.id) ?? []).slice(0, 4).reduce(
      (width, { wall }, index) => width + mmToCanvas(wall.widthMm) + (index ? gap : 0),
      horizontalInset * 2,
    )),
  );
  for (const area of areas) {
    const areaWalls = wallsByArea.get(area.id) ?? [];
    const expanded = !collapsedAreaIds.has(area.id);
    const headerY = sectionY;
    sections.push({ areaId: area.id, expanded, headerY, name: area.name, width: sectionWidth, x: startX - horizontalInset });

    if (!expanded) {
      sectionY += 112;
      continue;
    }

    const frameY = headerY + 104;
    let frameX = startX;
    let maxHeight = mmToCanvas(area.heightMm ?? project.room.heightMm);
    for (const { index, wall } of areaWalls) {
      const sourceParts = wall.sourceRef?.split(':') ?? [];
      const frame: WallFrame = {
        areaId: area.id,
        height: mmToCanvas(wall.heightMm),
        heightMm: wall.heightMm,
        id: wall.id,
        index,
        name: wall.name,
        segmentIndex: sourceParts[0] === 'wall' ? Math.max(0, Number(sourceParts[2]) - 1) : index,
        width: mmToCanvas(wall.widthMm),
        widthMm: wall.widthMm,
        x: frameX,
        y: frameY,
      };
      frames.push(frame);
      frameX += frame.width + gap;
      maxHeight = Math.max(maxHeight, frame.height);
    }
    sectionY = frameY + maxHeight + 150;
  }

  return { frames, sections };
}

function getCanvasSectionBlocks(project: TileProject, view: PlanViewTransform, wallLayout: WallLayout): CanvasSectionBlocks {
  const areas = project.room.areas ?? [{ contour: project.room.contour }];
  const floorBox = getBoundingBox(areas.flatMap((area) => area.contour));
  const floorTop = Math.min(PLAN_BLOCK_TOP_PX, view.y(floorBox.minY) - FLOOR_TITLE_GAP_PX);
  const floorLeft = Math.min(30, view.x(floorBox.minX) - 76);
  const wallsTitleY = wallLayout.sections[0] ? wallLayout.sections[0].headerY - 38 : WALLS_BASE_Y + 4;
  const wallsTop = wallsTitleY - 16;
  const sharedRight = Math.max(
    420,
    view.x(floorBox.maxX) + 76,
    ...wallLayout.sections.map((section) => section.x + section.width + 20),
    ...wallLayout.frames.map((frame) => frame.x + frame.width + 30),
  );
  const wallsBottom = Math.max(
    wallsTitleY + 150,
    ...wallLayout.frames.map((frame) => frame.y + frame.height + 115),
    ...wallLayout.sections.map((section) => section.headerY + 96),
  ) + 12;
  const naturalFloorBottom = Math.max(floorTop + 180, view.y(floorBox.maxY) + 52);
  const floorBottom = Math.min(naturalFloorBottom, wallsTop - 16);

  return {
    floor: {
      x: floorLeft,
      y: floorTop,
      width: sharedRight - floorLeft,
      height: floorBottom - floorTop,
    },
    walls: {
      x: floorLeft,
      y: wallsTop,
      width: sharedRight - floorLeft,
      height: wallsBottom - wallsTop,
    },
  };
}

function getInlineEdit(
  project: TileProject,
  target: Exclude<EditTarget, null>,
  view: PlanViewTransform,
  frames: WallFrame[],
  viewport: CanvasViewport,
  draftContour: PointMm[],
): InlineEdit {
  if (target.type === 'draft-segment') {
    const current = draftContour[target.index];
    const next = draftContour[(target.index + 1) % draftContour.length];
    const startCanvas = current ? pointToCanvasPoint(current) : { x: 200, y: 200 };
    const endCanvas = next ? pointToCanvasPoint(next) : startCanvas;
    return {
      left: Math.round(viewport.x + ((startCanvas.x + endCanvas.x) / 2) * viewport.zoom),
      max: 15000,
      min: 1,
      target,
      top: Math.round(viewport.y + getDraftLengthLabelY(startCanvas, endCanvas) * viewport.zoom),
      value: current && next ? segmentLength(current, next) : 1,
    };
  }

  if (target.type === 'zone-draft-segment') {
    return { left: Math.round(viewport.x + target.position.x * viewport.zoom), top: Math.round(viewport.y + target.position.y * viewport.zoom), min: 1, max: 15000, target, value: target.value };
  }

  if (target.type === 'object-distance') {
    const metric = getRoomObjectDistanceMetric(project, target, view);
    return {
      left: Math.round(viewport.x + (target.labelPosition?.x ?? metric.x) * viewport.zoom),
      max: metric.max,
      min: 0,
      target,
      top: Math.round(viewport.y + (target.labelPosition?.y ?? metric.y) * viewport.zoom),
      value: metric.value,
    };
  }

  if (target.type === 'opening-distance') {
    return {
      left: Math.round(viewport.x + target.position.x * viewport.zoom),
      max: target.max,
      min: 0,
      target,
      top: Math.round(viewport.y + target.position.y * viewport.zoom),
      value: target.value,
    };
  }

  if (target.type === 'wall-height') {
    const firstFrame = frames.find((frame) => frame.areaId === target.areaId) ?? frames[0];
    const area = project.room.areas?.find((item) => item.id === target.areaId);
    const markerX = firstFrame ? firstFrame.x - 144 : 80;
    const markerY = firstFrame ? firstFrame.y + firstFrame.height / 2 : 520;
    return {
      left: Math.round(viewport.x + markerX * viewport.zoom),
      max: 4500,
      min: 1800,
      target,
      top: Math.round(viewport.y + markerY * viewport.zoom),
      value: area?.heightMm ?? project.room.heightMm,
    };
  }

  if (target.type === 'layout-offset') {
    const metric = getLayoutOffsetMetric(project, target, view, frames);
    return {
      left: Math.round(viewport.x + metric.x * viewport.zoom),
      max: 15000,
      min: 0,
      target,
      top: Math.round(viewport.y + metric.y * viewport.zoom),
      value: metric.value,
    };
  }

  if (target.type === 'partition-distance') {
    const partition = project.room.partitions?.find((item) => item.id === target.partitionId);
    const contour = project.room.areas?.find((area) => area.id === partition?.areaId)?.contour;
    const metric = partition && contour ? getPartitionDistances(contour, partition)[target.edge] : { start: { x: 0, y: 0 }, end: { x: 0, y: 0 }, max: 0, value: 0 };
    return {
      left: Math.round(viewport.x + (target.labelPosition?.x ?? view.x((metric.start.x + metric.end.x) / 2)) * viewport.zoom),
      top: Math.round(viewport.y + (target.labelPosition?.y ?? (view.y((metric.start.y + metric.end.y) / 2) + (target.edge === 'left' || target.edge === 'right' ? -24 : 0))) * viewport.zoom),
      max: metric.max, min: 0, target, value: metric.value,
    };
  }

  if (target.type === 'partition-length') {
    const partition = project.room.partitions?.find((item) => item.id === target.partitionId);
    const center = partition
      ? getPartitionLengthLabelPosition(partition, view)
      : { x: 200, y: 200 };
    return {
      left: Math.round(viewport.x + center.x * viewport.zoom),
      max: 15000,
      min: 250,
      target,
      top: Math.round(viewport.y + center.y * viewport.zoom),
      value: partition ? segmentLength(partition.start, partition.end) : 250,
    };
  }

  const { index } = target;
  const contour = project.room.areas?.find((area) => area.id === target.areaId)?.contour ?? project.room.contour;
  const current = contour[index];
  const next = contour[(index + 1) % contour.length];
  const canvasScale = viewport.zoom;
  if (target.type === 'wall-segment') {
    const frame = frames.find((item) => item.id === target.surfaceId) ?? frames[index];
    return {
      left: Math.round(viewport.x + (frame.x + frame.width / 2) * canvasScale),
      max: 15000,
      min: 1,
      target,
      top: Math.round(viewport.y + (frame.y + frame.height + 50) * canvasScale),
      value: segmentLength(current, next),
    };
  }

  const label = getFloorDimensionPosition(contour, index, view);
  return {
    left: Math.round(viewport.x + label.x * canvasScale),
    max: 15000,
    min: 1,
    target,
    top: Math.round(viewport.y + label.y * canvasScale),
    value: segmentLength(current, next),
  };
}

function getRoomObjectDistanceMetric(
  project: TileProject,
  target: Extract<EditTarget, { type: 'object-distance' }>,
  view: PlanViewTransform,
) {
  const object = project.objects.find((item) => item.id === target.objectId);
  const area = object ? project.room.areas?.find((item) => item.id === object.areaId) : null;
  if (!object || !area) return { max: 0, value: 0, x: 80, y: 80 };

  const objectBox = getBoundingBox(getRoomObjectCorners(object));
  const bounds = getFloorZoneDistanceBounds(area.contour, objectBox);
  const centerX = object.xMm + object.lengthMm / 2;
  const centerY = object.yMm + object.widthMm / 2;
  const horizontalSpace = Math.max(0, Math.round(bounds.maxX - bounds.minX - objectBox.width));
  const verticalSpace = Math.max(0, Math.round(bounds.maxY - bounds.minY - objectBox.height));

  if (target.edge === 'left') {
    return { max: horizontalSpace, value: Math.round(objectBox.minX - bounds.minX), x: view.x((bounds.minX + objectBox.minX) / 2), y: view.y(centerY) };
  }
  if (target.edge === 'right') {
    return { max: horizontalSpace, value: Math.round(bounds.maxX - objectBox.maxX), x: view.x((objectBox.maxX + bounds.maxX) / 2), y: view.y(centerY) };
  }
  if (target.edge === 'top') {
    return { max: verticalSpace, value: Math.round(objectBox.minY - bounds.minY), x: view.x(centerX), y: view.y((bounds.minY + objectBox.minY) / 2) };
  }
  return { max: verticalSpace, value: Math.round(bounds.maxY - objectBox.maxY), x: view.x(centerX), y: view.y((objectBox.maxY + bounds.maxY) / 2) };
}

function getRoomObjectPositionForDistance(
  project: TileProject,
  target: Extract<EditTarget, { type: 'object-distance' }>,
  distanceMm: number,
): { areaId: string; xMm: number; yMm: number } | null {
  const object = project.objects.find((item) => item.id === target.objectId);
  const area = object ? project.room.areas?.find((item) => item.id === object.areaId) : null;
  if (!object || !area) return null;
  const objectBox = getBoundingBox(getRoomObjectCorners(object));
  const bounds = getFloorZoneDistanceBounds(area.contour, objectBox);
  let deltaX = 0;
  let deltaY = 0;
  if (target.edge === 'left') deltaX = bounds.minX + distanceMm - objectBox.minX;
  else if (target.edge === 'right') deltaX = bounds.maxX - distanceMm - objectBox.maxX;
  else if (target.edge === 'top') deltaY = bounds.minY + distanceMm - objectBox.minY;
  else deltaY = bounds.maxY - distanceMm - objectBox.maxY;
  return {
    areaId: object.areaId,
    xMm: Math.round(object.xMm + deltaX),
    yMm: Math.round(object.yMm + deltaY),
  };
}

function getLayoutOffsetMetric(
  project: TileProject,
  target: Extract<EditTarget, { type: 'layout-offset' }>,
  view: PlanViewTransform,
  frames: WallFrame[],
) {
  const surface = project.surfaces.find((item) => item.id === target.surfaceId);
  const zone = surface?.zones.find((item) => item.id === target.zoneId);
  const material = surface && zone ? getZoneMaterial(project, surface.id, zone.id) : null;
  if (!surface || !zone || !material) return { value: 0, x: 80, y: 80 };

  const result = getZoneLayoutResult(surface, zone, material);
  const value = result.edgeOffsets[target.edge] ?? 0;
  const rect = getSurfaceRectOnCanvas(surface, zone, view, frames);
  return {
    value,
    x: target.edge === 'left' ? rect.x - 42 : target.edge === 'right' ? rect.x + rect.width + 42 : rect.x + rect.width / 2,
    y: target.edge === 'top' ? rect.y - 20 : target.edge === 'bottom' ? rect.y + rect.height + 20 : rect.y + rect.height / 2,
  };
}

function getZoneLayoutResult(surface: TileProject['surfaces'][number], zone: FinishZone, material: TileMaterial) {
  if (zone.shape.type === 'polygon') {
    return generatePolygonLayout({
      blockedRects: surface.type === 'wall' ? surface.openings.map((opening) => ({ type: 'rect' as const, xMm: opening.xMm, yMm: opening.yMm, widthMm: opening.widthMm, heightMm: opening.heightMm })) : [],
      layout: zone.layout,
      points: zone.shape.points,
      tileHeightMm: material.heightMm,
      tileWidthMm: material.widthMm,
    });
  }
  const rectShape = zone.shape.type === 'rect' ? zone.shape : null;
  return generateRectLayout({
    blockedRects:
      surface.type === 'wall' && rectShape
        ? surface.openings.map((opening) => ({
            type: 'rect' as const,
            xMm: Math.max(0, opening.xMm - rectShape.xMm),
            yMm: Math.max(0, opening.yMm - rectShape.yMm),
            widthMm: Math.min(opening.widthMm, rectShape.widthMm),
            heightMm: Math.min(opening.heightMm, rectShape.heightMm),
          }))
        : [],
    heightMm: rectShape ? rectShape.heightMm : surface.heightMm,
    layout: zone.layout,
    tileHeightMm: material.heightMm,
    tileWidthMm: material.widthMm,
    widthMm: rectShape ? rectShape.widthMm : surface.widthMm,
  });
}

function getSurfaceRectOnCanvas(surface: TileProject['surfaces'][number], zone: FinishZone, view: PlanViewTransform, frames: WallFrame[]) {
  if (surface.type === 'wall') {
    const frame = frames.find((item) => item.id === surface.id);
    if (!frame) return { height: 1, width: 1, x: 80, y: 80 };
    if (zone.shape.type === 'rect' && !zone.id.endsWith('base-zone')) {
      return {
        height: mmToCanvas(zone.shape.heightMm),
        width: mmToCanvas(zone.shape.widthMm),
        x: frame.x + mmToCanvas(zone.shape.xMm),
        y: frame.y + mmToCanvas(zone.shape.yMm),
      };
    }
    return { height: frame.height, width: frame.width, x: frame.x, y: frame.y };
  }

  if (zone.shape.type === 'rect') {
    return {
      height: mmToCanvas(zone.shape.heightMm),
      width: mmToCanvas(zone.shape.widthMm),
      x: view.x(zone.shape.xMm),
      y: view.y(zone.shape.yMm),
    };
  }

  const box = getBoundingBox(zone.shape.points);
  return { height: mmToCanvas(box.height), width: mmToCanvas(box.width), x: view.x(box.minX), y: view.y(box.minY) };
}

function handleWallDrag(event: Konva.KonvaEventObject<DragEvent>, areaId: string, index: number, horizontal: boolean, scale: number, onMoveWall: (areaId: string, index: number, deltaMm: number) => void) {
  const node = event.currentTarget;
  const deltaPx = horizontal ? node.y() : node.x();
  node.position({ x: 0, y: 0 });
  const deltaMm = Math.round(deltaPx / scale);
  if (Math.abs(deltaMm) >= 1) onMoveWall(areaId, index, deltaMm);
}

function constrainPartitionEnd(start: PointMm, pointer: PointMm): PointMm {
  const deltaX = Math.abs(pointer.x - start.x);
  const deltaY = Math.abs(pointer.y - start.y);
  return deltaX >= deltaY ? { x: Math.round(pointer.x), y: start.y } : { x: start.x, y: Math.round(pointer.y) };
}

function findNearestRoomBoundary(project: TileProject, point: PointMm, maxDistanceMm: number, preferredAreaId?: string) {
  const areas = project.room.areas ?? [{ id: 'room-1', name: 'Помещение 1', contour: project.room.contour }];
  let best: { areaId: string; distance: number; point: PointMm } | null = null;
  for (const area of areas) {
    if (preferredAreaId && area.id !== preferredAreaId) continue;
    for (let index = 0; index < area.contour.length; index += 1) {
      const start = area.contour[index];
      const end = area.contour[(index + 1) % area.contour.length];
      const projected = projectPointToSegment(point, start, end);
      const distance = Math.hypot(projected.x - point.x, projected.y - point.y);
      if (distance <= maxDistanceMm && (!best || distance < best.distance)) best = { areaId: area.id, distance, point: projected };
    }
  }
  return best;
}

function projectPointToSegment(point: PointMm, start: PointMm, end: PointMm): PointMm {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSq = dx * dx + dy * dy;
  if (!lengthSq) return { ...start };
  const ratio = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq));
  return { x: Math.round(start.x + dx * ratio), y: Math.round(start.y + dy * ratio) };
}

function findBoundarySegmentIndex(contour: PointMm[], point: PointMm): number {
  return contour.findIndex((start, index) => isPointOnSegment(point, start, contour[(index + 1) % contour.length]));
}

function isPointOnSegment(point: PointMm, start: PointMm, end: PointMm, toleranceMm = 2): boolean {
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  if (!length) return Math.hypot(point.x - start.x, point.y - start.y) <= toleranceMm;
  const cross = Math.abs((point.x - start.x) * (end.y - start.y) - (point.y - start.y) * (end.x - start.x));
  if (cross / length > toleranceMm) return false;
  return point.x >= Math.min(start.x, end.x) - toleranceMm
    && point.x <= Math.max(start.x, end.x) + toleranceMm
    && point.y >= Math.min(start.y, end.y) - toleranceMm
    && point.y <= Math.max(start.y, end.y) + toleranceMm;
}

function isPartitionInsideContour(contour: PointMm[], start: PointMm, end: PointMm): boolean {
  return (start.x === end.x || start.y === end.y)
    && segmentLength(start, end) >= 250
    && isSegmentWithinContour(contour, start, end);
}

function isPartitionPlacementValid(contour: PointMm[], start: PointMm, end: PointMm, partitions: Partition[], partitionId?: string): boolean {
  if (segmentLength(start, end) < 250 || !isSegmentWithinContour(contour, start, end)) return false;
  return !partitions.some((partition) => partition.id !== partitionId && segmentsIntersect(start, end, partition.start, partition.end));
}

function clampPartitionDragDelta(
  contour: PointMm[],
  partition: Partition,
  partitions: Partition[],
  requested: PointMm,
  fallback: PointMm,
): PointMm {
  const rounded = { x: Math.round(requested.x), y: Math.round(requested.y) };
  const validAt = (delta: PointMm) => isPartitionPlacementValid(
    contour,
    { x: partition.start.x + delta.x, y: partition.start.y + delta.y },
    { x: partition.end.x + delta.x, y: partition.end.y + delta.y },
    partitions,
    partition.id,
  );
  if (validAt(rounded)) return rounded;

  let low = 0;
  let high = 1;
  let best = validAt(fallback) ? fallback : { x: 0, y: 0 };
  for (let iteration = 0; iteration < 16; iteration += 1) {
    const ratio = (low + high) / 2;
    const candidate = {
      x: Math.round(fallback.x + (requested.x - fallback.x) * ratio),
      y: Math.round(fallback.y + (requested.y - fallback.y) * ratio),
    };
    if (validAt(candidate)) {
      best = candidate;
      low = ratio;
    } else {
      high = ratio;
    }
  }
  return best;
}

function isSegmentInsidePolygon(contour: PointMm[], start: PointMm, end: PointMm): boolean {
  const sampleCount = Math.max(8, Math.ceil(segmentLength(start, end) / 100));
  for (let step = 0; step <= sampleCount; step += 1) {
    const ratio = step / sampleCount;
    const point = { x: start.x + (end.x - start.x) * ratio, y: start.y + (end.y - start.y) * ratio };
    if (!pointInPolygonOrBoundary(point, contour)) return false;
  }
  return true;
}

function getRectZoneCorners(bounds: ReturnType<typeof getBoundingBox>): PointMm[] {
  return [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
    { x: bounds.minX, y: bounds.maxY },
  ];
}

function pointInPolygonOrBoundary(point: PointMm, polygon: PointMm[]): boolean {
  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index];
    const end = polygon[(index + 1) % polygon.length];
    const cross = (point.x - start.x) * (end.y - start.y) - (point.y - start.y) * (end.x - start.x);
    if (Math.abs(cross) < 0.001 && point.x >= Math.min(start.x, end.x) && point.x <= Math.max(start.x, end.x) && point.y >= Math.min(start.y, end.y) && point.y <= Math.max(start.y, end.y)) return true;
  }
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const currentPoint = polygon[index];
    const previousPoint = polygon[previous];
    if ((currentPoint.y > point.y) !== (previousPoint.y > point.y) && point.x < ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) / (previousPoint.y - currentPoint.y) + currentPoint.x) inside = !inside;
  }
  return inside;
}

function segmentsCross(a: PointMm, b: PointMm, c: PointMm, d: PointMm): boolean {
  const cross = (first: PointMm, second: PointMm, third: PointMm) => (second.x - first.x) * (third.y - first.y) - (second.y - first.y) * (third.x - first.x);
  const abC = cross(a, b, c);
  const abD = cross(a, b, d);
  const cdA = cross(c, d, a);
  const cdB = cross(c, d, b);
  return Math.sign(abC) !== Math.sign(abD) && Math.sign(cdA) !== Math.sign(cdB);
}

function getPreferredTemplateSize(template: RoomTemplate): [number, number] | undefined {
  if (template.id === 'rectangle') return template.sizes.find(([width, depth]) => width === 1700 && depth === 2000) ?? template.sizes[0];
  return template.sizes[0];
}
