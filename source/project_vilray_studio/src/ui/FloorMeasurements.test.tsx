import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { templates } from '../config/appConfig';
import { addPartition, addRoomObject, createProjectFromTemplate } from '../project/projectFactory';
import { FloorMeasurementOverlay, ZoneClearanceLabels } from './App';
import { getBoundingBox } from '../project/geometry';
import { mmToCanvas, PX_PER_MM } from '../canvas/scale';

vi.mock('react-konva', () => ({
  Group: ({ children, name, onClick, listening }: any) => <div data-name={name} data-listening={listening} onClick={onClick}>{children}</div>,
  Line: ({ dash, points }: any) => <span data-dashed={Boolean(dash)} data-points={JSON.stringify(points)} />,
  Rect: () => null,
  Text: ({ text }: any) => <span>{text}</span>,
}));

function setup(overrides: Partial<ComponentProps<typeof FloorMeasurementOverlay>> = {}) {
  let project = createProjectFromTemplate(templates[0], [4000, 3000]);
  for (let i = 0; i < 2; i++) project = addRoomObject(project, { areaId: 'room-1', name: `Объект ${i}`, lengthMm: 500, widthMm: 400, heightMm: 600, excludeTile: false }).project;
  project.objects = project.objects.map((object, i) => ({ ...object, xMm: 200 + i * 1500, yMm: 1000, elevationMm: i * 700 }));
  project = addPartition(project, { x: 3000, y: 300 }, { x: 3000, y: 1500 }, 'room-1');
  const props: ComponentProps<typeof FloorMeasurementOverlay> = {
    project, measurementMode: 'objects', selectedObjectId: null, selectedPartitionId: null,
    view: { scale: 1, x: (x) => x, y: (y) => y, toPoint: (x, y) => ({ x, y }) },
    roomPreview: null, objectPreview: null, partitionPreview: null, onEdit: vi.fn(), ...overrides,
  };
  return { ...render(<FloorMeasurementOverlay {...props} />), props };
}

describe('floor measurement visibility and editing', () => {
  it('shows all four clearances for every unselected object, including elevated ones', () => {
    const { container, props } = setup();
    const groups = container.querySelectorAll('[data-name="object-distances"]');
    expect(groups).toHaveLength(2);
    groups.forEach((group) => expect(group.querySelectorAll('[data-dashed="true"]')).toHaveLength(4));
    fireEvent.click(groups[1].querySelector('span:not([data-dashed])')!);
    expect(props.onEdit).toHaveBeenCalledWith(expect.objectContaining({ type: 'object-distance', edge: 'left', objectId: props.project.objects[1].id, labelPosition: expect.any(Object) }));
  });

  it('shows the selected partition at rest in every measurement mode, with editable length and four clearances', () => {
    const { container, props, rerender, getByText } = setup();
    const partitionId = props.project.room.partitions![0].id;
    for (const measurementMode of ['room', 'tile', 'objects', null] as const) {
      rerender(<FloorMeasurementOverlay {...props} selectedPartitionId={partitionId} measurementMode={measurementMode} />);
      const group = container.querySelector('[data-name="partition-distances"]')!;
      expect(group.querySelectorAll('[data-dashed="true"]')).toHaveLength(4);
      fireEvent.click(getByText('1200 мм'));
      expect(props.onEdit).toHaveBeenLastCalledWith({ type: 'partition-length', partitionId });
      fireEvent.click(group.querySelector('span:not([data-dashed])')!);
      expect(props.onEdit).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'partition-distance', edge: 'left', partitionId, labelPosition: expect.any(Object) }));
    }
  });

  it('updates partition labels in preview and keeps them visible after release', () => {
    const { container, props, rerender } = setup({ measurementMode: 'room' });
    const partition = props.project.room.partitions![0];
    const preview = { id: partition.id, start: { x: 2500, y: 500 }, end: { x: 2500, y: 1700 } };
    rerender(<FloorMeasurementOverlay {...props} selectedPartitionId={partition.id} partitionPreview={preview} />);
    expect(container.querySelector('[data-name="partition-distances"]')!.textContent).toContain('2450 мм');
    expect(container.querySelector('[data-name="partition-distances"]')!.getAttribute('data-listening')).toBe('false');
    rerender(<FloorMeasurementOverlay {...props} selectedPartitionId={partition.id} project={{ ...props.project, room: { ...props.project.room, partitions: [{ ...partition, ...preview }] } }} />);
    expect(container.querySelector('[data-name="partition-distances"]')!.textContent).toContain('2450 мм');
    expect(container.querySelector('[data-name="partition-distances"]')!.getAttribute('data-listening')).toBe('true');
  });
});

describe('saved zone clearance overlay', () => {
  const contour = [{ x: 1000, y: 2000 }, { x: 5000, y: 2000 }, { x: 5000, y: 5000 }, { x: 1000, y: 5000 }];
  const bounds = getBoundingBox([{ x: 1400, y: 2600 }, { x: 2100, y: 3400 }]);
  const view = { scale: PX_PER_MM, x: (x: number) => 80 + mmToCanvas(x), y: (y: number) => 120 + mmToCanvas(y), toPoint: () => ({ x: 0, y: 0 }) };

  it('shows only four wall clearances for a saved zone at rest, not its own width or length', () => {
    const { container, queryByText, getByText } = render(<ZoneClearanceLabels bounds={bounds} contour={contour} delta={{ x: 0, y: 0 }} view={view} />);
    expect(container.querySelectorAll('[data-dashed="true"]')).toHaveLength(4);
    for (const value of [400, 2900, 600, 1600]) expect(getByText(`${value} мм`)).toBeInTheDocument();
    expect(queryByText('700 мм')).toBeNull();
    expect(queryByText('800 мм')).toBeNull();
    expect(container.querySelector('[data-name="zone-clearances"]')).toHaveAttribute('data-listening', 'false');
  });

  it('updates live distances while dragging and keeps exactly those values after saving the position', () => {
    const { container, getByText, rerender } = render(<ZoneClearanceLabels bounds={bounds} contour={contour} delta={{ x: 200, y: -100 }} view={view} />);
    for (const value of [600, 2700, 500, 1700]) expect(getByText(`${value} мм`)).toBeInTheDocument();
    const lines = Array.from(container.querySelectorAll('[data-dashed="true"]'), (line) => JSON.parse(line.getAttribute('data-points')!));
    expect(lines[0]).toEqual([view.x(1000), view.y(2900), view.x(1600), view.y(2900)]);
    expect(lines[2]).toEqual([view.x(1950), view.y(2000), view.x(1950), view.y(2500)]);
    const saved = { ...bounds, minX: bounds.minX + 200, maxX: bounds.maxX + 200, minY: bounds.minY - 100, maxY: bounds.maxY - 100 };
    rerender(<ZoneClearanceLabels bounds={saved} contour={contour} delta={{ x: 0, y: 0 }} view={view} />);
    expect(Array.from(container.querySelectorAll('[data-dashed="true"]'), (line) => JSON.parse(line.getAttribute('data-points')!))).toEqual(lines);
  });

  it('measures to the actual inner wall of a concave room, not beyond the niche', () => {
    const room = [{ x: 0, y: 0 }, { x: 4000, y: 0 }, { x: 4000, y: 1000 }, { x: 2000, y: 1000 }, { x: 2000, y: 3000 }, { x: 0, y: 3000 }];
    const polygonBounds = getBoundingBox([{ x: 500, y: 1400 }, { x: 1400, y: 1200 }, { x: 1200, y: 2200 }]);
    const { getByText, queryByText } = render(<ZoneClearanceLabels bounds={polygonBounds} contour={room} delta={{ x: 0, y: 0 }} view={view} />);
    expect(getByText('600 мм')).toBeInTheDocument();
    expect(queryByText('2600 мм')).toBeNull();
  });

  it('includes zero clearances at wall boundaries without hiding the other distances', () => {
    const wall = [{ x: 0, y: 0 }, { x: 3000, y: 0 }, { x: 3000, y: 2700 }, { x: 0, y: 2700 }];
    const zoneBounds = getBoundingBox([{ x: 0, y: 0 }, { x: 700, y: 800 }]);
    const { container, getAllByText, getByText } = render(<ZoneClearanceLabels bounds={zoneBounds} contour={wall} delta={{ x: 0, y: 0 }} view={view} />);
    expect(container.querySelectorAll('[data-dashed="true"]')).toHaveLength(4);
    expect(getAllByText('0 мм')).toHaveLength(2);
    expect(getByText('2300 мм')).toBeInTheDocument();
    expect(getByText('1900 мм')).toBeInTheDocument();
  });
});
