import { render } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { templates } from '../config/appConfig';
import { mmToCanvas } from '../canvas/scale';
import { generateRectLayout } from '../layout/layoutEngine';
import { getBoundingBox } from '../project/geometry';
import { addManualZone, createProjectFromTemplate } from '../project/projectFactory';
import type { LayoutPattern, PointMm } from '../types/project';
import { WallZoneLayer } from './App';

type PathCommand = Array<string | number>;
function tracePath(draw: (context: any, shape?: any) => void) {
  const path: PathCommand[] = [];
  draw({
    beginPath: () => {}, fillStrokeShape: () => {},
    moveTo: (x: number, y: number) => path.push(['M', x, y]),
    lineTo: (x: number, y: number) => path.push(['L', x, y]),
    closePath: () => path.push(['Z']),
    rect: (x: number, y: number, width: number, height: number) => path.push(['R', x, y, width, height]),
  });
  return path;
}

vi.mock('react-konva', () => ({
  Group: ({ children, name, clipFunc, clipX, clipY, clipWidth, clipHeight }: any) => <div data-name={name} data-clip={clipFunc ? JSON.stringify(tracePath(clipFunc)) : undefined} data-rect-clip={clipWidth ? JSON.stringify([clipX, clipY, clipWidth, clipHeight]) : undefined}>{children}</div>,
  Shape: ({ sceneFunc }: any) => <span data-tile-path={JSON.stringify(tracePath(sceneFunc))} />,
  Rect: ({ x, y, width, height, fill }: any) => <span data-rect={JSON.stringify([x, y, width, height])} data-fill={fill} />,
  Line: () => null,
  Text: () => null,
}));

const contour: PointMm[] = [{ x: 400, y: 335 }, { x: 760, y: 335 }, { x: 760, y: 735 }, { x: 1800, y: 735 }, { x: 1800, y: 1635 }, { x: 400, y: 1635 }];

function setup(pattern: LayoutPattern = 'straight', turnDeg = 0) {
  const project = createProjectFromTemplate(templates[0], [4000, 4000]);
  const zone = addManualZone(project, 'surface-wall-1', contour).zone!;
  zone.layout = { ...zone.layout, pattern, turnDeg, stagger: turnDeg ? 'quarter' : 'none', rotation: turnDeg ? 90 : 0 };
  const props: ComponentProps<typeof WallZoneLayer> = {
    zone, material: { ...project.materials[0], widthMm: 600, heightMm: 1200 },
    frame: { id: 'surface-wall-1', areaId: 'room-1', index: 0, segmentIndex: 0, name: 'Стена 1', x: 100, y: 200, widthMm: 4000, heightMm: 2700, width: mmToCanvas(4000), height: mmToCanvas(2700) },
    selected: false, showEdgeCuts: false, opacity: 1, openings: [], objectBlockers: [],
    onEditOffset: vi.fn(), onPolygonChange: vi.fn(), onSelect: vi.fn(), onShapeChange: vi.fn(), onDragPreview: vi.fn(),
  };
  return { ...render(<WallZoneLayer {...props} />), props };
}

function expectedPaths(props: ComponentProps<typeof WallZoneLayer>) {
  const shape = props.zone.shape;
  const bounds = shape.type === 'polygon' ? getBoundingBox(shape.points) : { minX: shape.xMm, minY: shape.yMm, width: shape.widthMm, height: shape.heightMm };
  const result = generateRectLayout({ widthMm: bounds.width, heightMm: bounds.height, tileWidthMm: props.material.widthMm, tileHeightMm: props.material.heightMm, layout: props.zone.layout });
  const x = props.frame.x + mmToCanvas(bounds.minX);
  const y = props.frame.y + mmToCanvas(bounds.minY);
  return ['full', 'cut', 'critical'].map((kind) => result.pieces.filter((piece) => piece.kind === kind).flatMap((piece): PathCommand[] => piece.polygon?.length ? [
    ['M', x + mmToCanvas(piece.polygon[0].x), y + mmToCanvas(piece.polygon[0].y)],
    ...piece.polygon.slice(1).map((point) => ['L', x + mmToCanvas(point.x), y + mmToCanvas(point.y)]), ['Z'],
  ] : [['R', x + mmToCanvas(piece.xMm), y + mmToCanvas(piece.yMm), Math.max(1, mmToCanvas(piece.widthMm)), Math.max(1, mmToCanvas(piece.heightMm))]]));
}

describe('wall zone tile drawing', () => {
  it.each((['straight', 'brick', 'wood-random', 'diagonal', 'herringbone'] as const).flatMap((pattern) => [0, 27].map((turnDeg) => ({ pattern, turnDeg }))))('preserves $pattern at $turnDeg degrees without drawing decomposition seams', ({ pattern, turnDeg }) => {
    const { container, props } = setup(pattern, turnDeg);
    expect(Array.from(container.querySelectorAll('[data-tile-path]'), (node) => JSON.parse(node.getAttribute('data-tile-path')!))).toEqual(expectedPaths(props));
    const clip = JSON.parse(container.querySelector('[data-clip]')!.getAttribute('data-clip')!);
    expect(clip).toEqual(contour.map((point, index) => [index ? 'L' : 'M', props.frame.x + mmToCanvas(point.x), props.frame.y + mmToCanvas(point.y)]).concat([['Z']]));
  });

  it('does not change the tile grid when an interior corner moves within the same bounds', () => {
    const { container, props, rerender } = setup();
    const before = Array.from(container.querySelectorAll('[data-tile-path]'), (node) => node.getAttribute('data-tile-path'));
    const points = contour.map((point, i) => i === 1 || i === 2 ? { ...point, x: 900 } : point);
    rerender(<WallZoneLayer {...props} zone={{ ...props.zone, shape: { type: 'polygon', points } }} />);
    expect(Array.from(container.querySelectorAll('[data-tile-path]'), (node) => node.getAttribute('data-tile-path'))).toEqual(before);
  });

  it.each(['polygon', 'rect'] as const)('masks openings in wall coordinates without adding seams in a %s zone', (type) => {
    const { container, props, rerender } = setup();
    const zone = type === 'polygon' ? props.zone : { ...props.zone, shape: { type: 'rect' as const, xMm: 400, yMm: 335, widthMm: 1400, heightMm: 1300 } };
    const opening = { id: 'window', name: 'Окно', surfaceId: props.frame.id, kind: 'window' as const, xMm: 1100, yMm: 900, widthMm: 500, heightMm: 500 };
    rerender(<WallZoneLayer {...props} zone={zone} openings={[opening]} />);
    expect(Array.from(container.querySelectorAll('[data-tile-path]'), (node) => JSON.parse(node.getAttribute('data-tile-path')!))).toEqual(expectedPaths({ ...props, zone }));
    expect(JSON.parse(container.querySelector('[data-name="zone-opening-masks"] [data-rect]')!.getAttribute('data-rect')!)).toEqual([props.frame.x + mmToCanvas(opening.xMm), props.frame.y + mmToCanvas(opening.yMm), mmToCanvas(500), mmToCanvas(500)]);
  });
});
