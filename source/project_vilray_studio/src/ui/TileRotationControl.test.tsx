import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TileRotationControl } from './TileRotationControl';
import { getInitialProject, updateZoneLayoutTurn } from '../project/projectFactory';

describe('numeric tile rotation', () => {
  it('applies only after submission and keeps other surfaces and zones unchanged', () => {
    const project = getInitialProject();
    const floor = project.surfaces.find((surface) => surface.type === 'floor')!;
    floor.zones.push({ ...floor.zones[0], id: 'rotation-test-zone' });
    let updated = project;
    const onApply = vi.fn((angle: number) => { updated = updateZoneLayoutTurn(project, floor.id, 'rotation-test-zone', angle); });
    render(<TileRotationControl disabled={false} degrees={0} onApply={onApply} />);
    fireEvent.change(screen.getByLabelText('Введите градус'), { target: { value: '37,5' } });
    expect(onApply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Применить'));
    expect(onApply).toHaveBeenCalledWith(37.5);
    expect(updated.surfaces.find((surface) => surface.id === floor.id)!.zones[1].layout.turnDeg).toBe(37.5);
    expect(updated.surfaces.find((surface) => surface.id === floor.id)!.zones[0]).toEqual(floor.zones[0]);
    expect(updated.surfaces.filter((surface) => surface.id !== floor.id)).toEqual(project.surfaces.filter((surface) => surface.id !== floor.id));
  });

  it.each([['-45', 315], ['405', 45], ['360', 0]])('normalizes %s degrees', (value, expected) => {
    const onApply = vi.fn();
    render(<TileRotationControl disabled={false} degrees={0} onApply={onApply} />);
    fireEvent.change(screen.getByLabelText('Введите градус'), { target: { value } });
    fireEvent.click(screen.getByText('Применить'));
    expect(onApply).toHaveBeenCalledWith(expected);
  });

  it('rejects blank or invalid input and disables controls without a selected area', () => {
    const props = { disabled: false, degrees: 0, onApply: vi.fn() };
    const view = render(<TileRotationControl {...props} />);
    for (const value of ['', 'abc', 'Infinity']) {
      fireEvent.change(screen.getByLabelText('Введите градус'), { target: { value } });
      expect(screen.getByText('Применить')).toBeDisabled();
    }
    view.rerender(<TileRotationControl {...props} disabled />);
    expect(screen.getByLabelText('Введите градус')).toBeDisabled();
    expect(screen.getByRole('heading', { name: 'Вращение' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Вращение' })).not.toBeInTheDocument();
    expect(props.onApply).not.toHaveBeenCalled();
  });
});
