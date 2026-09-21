import { fireEvent, render, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { templates } from '../config/appConfig';
import { addManualZone, addRoomFromTemplate, addSizedZone, createProjectFromTemplate } from '../project/projectFactory';
import { ZonesPanel } from './App';

vi.mock('react-konva', () => ({}));

function setup() {
  let project = addRoomFromTemplate(createProjectFromTemplate(templates[0], [4000, 3000]), templates[0]);
  project = addSizedZone(project, 'surface-floor', 700, 900, 'Прямоугольная зона').project;
  project = addManualZone(project, 'surface-wall-1', [{ x: 400, y: 400 }, { x: 1400, y: 400 }, { x: 1400, y: 1000 }, { x: 400, y: 1000 }]).project;
  const props: ComponentProps<typeof ZonesPanel> = {
    project, activeSurface: project.surfaces[0], activeZone: project.surfaces[0].zones[0],
    selectedSurfaceId: 'surface-floor', selectedZoneId: null, manualDrawingActive: false,
    onCreateZone: vi.fn(() => null), onDeleteZone: vi.fn(), onSaveZone: vi.fn(() => null), onSelectZone: vi.fn(),
    onCancelManualZone: vi.fn(), onStartManualZone: vi.fn(), onEditManualZone: vi.fn(),
  };
  return { ...render(<ZonesPanel {...props} />), props };
}

describe('zone creation form and room lists', () => {
  it('submits custom width and length without creating on input changes', () => {
    const { getByLabelText, getByRole, props } = setup();
    fireEvent.change(getByLabelText('Ширина, мм'), { target: { value: '750' } });
    fireEvent.change(getByLabelText('Длина, мм'), { target: { value: '1100' } });
    expect(props.onCreateZone).not.toHaveBeenCalled();
    fireEvent.click(getByRole('button', { name: 'Создать' }));
    expect(props.onCreateZone).toHaveBeenCalledWith(750, 1100, '');
  });

  it('requires a selected plane and shows creation errors without losing entered dimensions', () => {
    const { props, rerender, getByRole, getByLabelText } = setup();
    rerender(<ZonesPanel {...props} activeSurface={null} />);
    expect(getByRole('button', { name: 'Создать' })).toBeDisabled();
    expect(getByRole('button', { name: 'Нарисуй сам' })).toBeDisabled();
    rerender(<ZonesPanel {...props} onCreateZone={() => 'Не помещается'} />);
    fireEvent.click(getByRole('button', { name: 'Создать' }));
    expect(getByRole('alert')).toHaveTextContent('Не помещается');
    expect(getByLabelText('Ширина, мм')).toHaveValue(500);
  });

  it('edits rectangle dimensions and offsets in the form without creating a duplicate', () => {
    const { props, getAllByRole, getByRole, getByLabelText } = setup();
    fireEvent.click(getAllByRole('button', { name: 'Изменить' })[0]);
    expect(getByLabelText('Ширина, мм')).toHaveValue(700);
    fireEvent.change(getByLabelText('Ширина, мм'), { target: { value: '800' } });
    fireEvent.change(getByLabelText('Отступ слева, мм'), { target: { value: '200' } });
    fireEvent.click(getByRole('button', { name: 'Сохранить изменения' }));
    expect(props.onSaveZone).toHaveBeenCalledWith('surface-floor', props.project.surfaces[0].zones[1].id, 'Прямоугольная зона', expect.objectContaining({ widthMm: 800, heightMm: 900, xMm: 200 }));
    expect(props.onCreateZone).not.toHaveBeenCalled();
  });

  it('opens even a locked hand-drawn polygon in the contour editor', () => {
    const { props, getAllByRole } = setup();
    fireEvent.click(getAllByRole('button', { name: 'Изменить' })[1]);
    const wall = props.project.surfaces.find((surface) => surface.id === 'surface-wall-1')!;
    expect(wall.zones[1].locked).toBe(true);
    expect(props.onEditManualZone).toHaveBeenCalledWith(wall.id, wall.zones[1].id);
  });

  it('opens only one room list at a time and supports closing both', () => {
    const { container } = setup();
    const lists = Array.from(container.querySelectorAll('details'));
    expect(lists.map((list) => list.open)).toEqual([true, false]);
    fireEvent.click(lists[1].querySelector('summary')!);
    expect(lists.map((list) => list.open)).toEqual([false, true]);
    fireEvent.click(lists[1].querySelector('summary')!);
    expect(lists.map((list) => list.open)).toEqual([false, false]);
  });

  it('shows zone information and dispatches deletion of the correct zone', () => {
    const { getAllByRole, getByRole, props } = setup();
    fireEvent.click(getAllByRole('button', { name: 'Информация' })[0]);
    expect(within(getByRole('dialog')).getByText('700 мм')).toBeInTheDocument();
    fireEvent.click(getByRole('button', { name: 'Закрыть' }));
    fireEvent.click(getAllByRole('button', { name: 'Удалить' })[0]);
    expect(props.onDeleteZone).toHaveBeenCalledWith('surface-floor', props.project.surfaces[0].zones[1].id);
  });

  it('reflects manual drawing mode and allows cancelling it', () => {
    const { props, getByRole, rerender, getByLabelText } = setup();
    fireEvent.click(getByRole('button', { name: 'Нарисуй сам' }));
    expect(props.onStartManualZone).toHaveBeenCalledOnce();
    rerender(<ZonesPanel {...props} manualDrawingActive />);
    expect(getByRole('button', { name: 'Нарисуй сам' })).toHaveAttribute('aria-pressed', 'true');
    expect(getByLabelText('Ширина, мм')).toBeDisabled();
    expect(getByRole('button', { name: 'Создать' })).toBeDisabled();
    fireEvent.click(getByRole('button', { name: 'Нарисуй сам' }));
    expect(props.onCancelManualZone).toHaveBeenCalledOnce();
  });

  it('reveals and highlights the selected zone, even when selecting another zone in the same collapsed room', () => {
    const { container, props, rerender } = setup();
    const rectId = props.project.surfaces[0].zones[1].id;
    const wall = props.project.surfaces.find((surface) => surface.id === 'surface-wall-1')!;
    const lists = Array.from(container.querySelectorAll('details'));
    rerender(<ZonesPanel {...props} selectedZoneId={rectId} />);
    expect(container.querySelector('article[aria-current="true"]')).toHaveTextContent('Прямоугольная зона');
    fireEvent.click(lists[1].querySelector('summary')!);
    expect(lists.map((list) => list.open)).toEqual([false, true]);
    rerender(<ZonesPanel {...props} selectedZoneId={wall.zones[1].id} />);
    expect(lists.map((list) => list.open)).toEqual([true, false]);
    const selected = container.querySelectorAll('article[aria-current="true"]');
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveClass('selected');
    expect(selected[0]).toHaveTextContent('Стена 1');
  });

  it('reopens and scrolls to the same zone when reselected on the canvas, but still allows manual collapse', () => {
    const { container, props, rerender } = setup();
    const selectedZoneId = props.project.surfaces[0].zones[1].id;
    rerender(<ZonesPanel {...props} selectedZoneId={selectedZoneId} selectionRevision={1} />);
    const list = container.querySelector('details')!;
    const selected = container.querySelector<HTMLElement>('article[aria-current="true"]')!;
    selected.scrollIntoView = vi.fn();
    fireEvent.click(list.querySelector('summary')!);
    expect(list.open).toBe(false);
    rerender(<ZonesPanel {...props} selectedZoneId={selectedZoneId} selectionRevision={2} />);
    expect(list.open).toBe(true);
    expect(selected.scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' });
    rerender(<ZonesPanel {...props} selectedZoneId={null} />);
    expect(container.querySelector('article[aria-current="true"]')).toBeNull();
  });
});
