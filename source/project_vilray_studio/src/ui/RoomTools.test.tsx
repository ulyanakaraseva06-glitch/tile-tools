import { fireEvent, render } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { templates } from '../config/appConfig';
import { addRoomFromTemplate, getInitialProject } from '../project/projectFactory';
import { RoomTools } from './App';

vi.mock('react-konva', () => ({}));

function setup() {
  const project = addRoomFromTemplate(getInitialProject(), templates[0]);
  const props: ComponentProps<typeof RoomTools> = {
    project, disabled: false, editingOpeningId: null, openingEditorKind: null,
    openingSurfaceId: null, partitionDrawingActive: false,
    selectedOpeningId: null, selectedPartitionId: null,
    onAddDoor: vi.fn(), onAddPassage: vi.fn(), onAddPartition: vi.fn(),
    onAddRoom: vi.fn(), onAddWindow: vi.fn(), onCancelOpening: vi.fn(),
    onDeleteOpening: vi.fn(), onDeletePartition: vi.fn(), onEditOpening: vi.fn(),
    onEditPartitionLength: vi.fn(), onOpeningSurfaceChange: vi.fn(),
    onSelectOpening: vi.fn(), onSelectPartition: vi.fn(), onSubmitOpening: () => true,
  };
  const view = render(<RoomTools {...props} />);
  const groups = () => Array.from(view.container.querySelectorAll<HTMLDetailsElement>('.structure-list-module details'));
  const click = (index: number) => fireEvent.click(groups()[index].querySelector('summary')!);
  return { ...view, props, groups, click };
}

describe('room element dropdowns', () => {
  it('does not show the removed floor opening hint', () => {
    const { queryByText } = setup();
    expect(queryByText(/Проёмы на схеме пола можно тянуть/)).not.toBeInTheDocument();
  });

  it('opens each room, closes the previous room, and allows closing all lists', () => {
    const { groups, click } = setup();
    expect(groups().map((group) => group.open)).toEqual([true, false]);
    click(1);
    expect(groups().map((group) => group.open)).toEqual([false, true]);
    click(1);
    expect(groups().map((group) => group.open)).toEqual([false, false]);
    click(0);
    expect(groups().map((group) => group.open)).toEqual([true, false]);
  });

  it('does not reopen a collapsed list on rerender or queued native toggle events', () => {
    const { groups, click, rerender, props } = setup();
    click(0);
    rerender(<RoomTools {...props} project={{ ...props.project, room: { ...props.project.room, areas: [...props.project.room.areas!] } }} />);
    groups().forEach((group) => fireEvent(group, new Event('toggle')));
    expect(groups().every((group) => !group.open)).toBe(true);
    click(1);
    groups().forEach((group) => fireEvent(group, new Event('toggle')));
    expect(groups().map((group) => group.open)).toEqual([false, true]);
  });
});
