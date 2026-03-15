import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActionControls } from './ActionControls';
import * as hooks from '../../store/hooks';
import * as gameSlice from '../../store/slices/gameSlice';

vi.mock('../../store/hooks');
vi.mock('../../store/slices/gameSlice', async () => {
  const actual = await vi.importActual('../../store/slices/gameSlice');
  return {
    ...actual,
    submitActionThunk: vi.fn(),
  };
});

describe('ActionControls', () => {
  const mockDispatch = vi.fn();
  const mockOnSelectMode = vi.fn();

  const mockGameState = {
    id: 1,
    status: 'active' as const,
    boardConfig: { blocked_squares: [], start_positions: [] },
    currentTurnUserId: 1,
    turnNumber: 1,
    winnerId: null,
    turnDeadline: null,
    characters: [
      {
        id: 10,
        userId: 1,
        position: { x: 1, y: 1 },
        facingTile: { x: 1, y: 2 },
        currentHp: 10,
        maxHp: 10,
        isDefending: false,
      }
    ]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (hooks.useAppDispatch as any).mockReturnValue(mockDispatch);
    (hooks.useAppSelector as any).mockImplementation((selector: any) => 
      selector({ game: { isSubmitting: false, error: null } })
    );
  });

  it('renders nothing if gameState is null', () => {
    const { container } = render(
      <ActionControls
        gameId={1}
        currentUserId={1}
        gameState={null}
        selectedSquare={null}
        selectedTarget={null}
        onSelectMode={mockOnSelectMode}
        activeMode={null}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders buttons enabled when it is the user turn', () => {
    render(
      <ActionControls
        gameId={1}
        currentUserId={1}
        gameState={mockGameState}
        selectedSquare={null}
        selectedTarget={null}
        onSelectMode={mockOnSelectMode}
        activeMode={null}
      />
    );

    expect(screen.getByText('Move')).not.toBeDisabled();
    expect(screen.getByText('Attack')).not.toBeDisabled();
    expect(screen.getByText('Defend')).not.toBeDisabled();
    expect(screen.getByText('End Turn')).not.toBeDisabled();
  });

  it('disables buttons when it is not the user turn', () => {
    render(
      <ActionControls
        gameId={1}
        currentUserId={2}
        gameState={mockGameState}
        selectedSquare={null}
        selectedTarget={null}
        onSelectMode={mockOnSelectMode}
        activeMode={null}
      />
    );

    expect(screen.getByText('Move')).toBeDisabled();
    expect(screen.getByText('Attack')).toBeDisabled();
    expect(screen.getByText('Defend')).toBeDisabled();
    expect(screen.getByText('End Turn')).toBeDisabled();
  });

  it('disables buttons when submitting', () => {
    (hooks.useAppSelector as any).mockImplementation((selector: any) => 
      selector({ game: { isSubmitting: true, error: null } })
    );

    render(
      <ActionControls
        gameId={1}
        currentUserId={1}
        gameState={mockGameState}
        selectedSquare={null}
        selectedTarget={null}
        onSelectMode={mockOnSelectMode}
        activeMode={null}
      />
    );

    expect(screen.getByText('Move')).toBeDisabled();
    expect(screen.getByText('Defend')).toBeDisabled();
  });

  it('calls onSelectMode when Move or Attack are clicked', () => {
    render(
      <ActionControls
        gameId={1}
        currentUserId={1}
        gameState={mockGameState}
        selectedSquare={null}
        selectedTarget={null}
        onSelectMode={mockOnSelectMode}
        activeMode={null}
      />
    );

    fireEvent.click(screen.getByText('Move'));
    expect(mockOnSelectMode).toHaveBeenCalledWith('move');

    fireEvent.click(screen.getByText('Attack'));
    expect(mockOnSelectMode).toHaveBeenCalledWith('attack');
  });

  it('dispatches defend action when Defend is clicked', () => {
    render(
      <ActionControls
        gameId={1}
        currentUserId={1}
        gameState={mockGameState}
        selectedSquare={null}
        selectedTarget={null}
        onSelectMode={mockOnSelectMode}
        activeMode={null}
      />
    );

    fireEvent.click(screen.getByText('Defend'));
    expect(mockDispatch).toHaveBeenCalled();
    expect(gameSlice.submitActionThunk).toHaveBeenCalledWith({
      gameId: 1,
      actionType: 'defend',
      actionData: {}
    });
  });

  it('dispatches end turn action with calculated facing tile based on selection', () => {
    render(
      <ActionControls
        gameId={1}
        currentUserId={1}
        gameState={mockGameState}
        selectedSquare={null}
        selectedTarget={null}
        onSelectMode={mockOnSelectMode}
        activeMode={null}
      />
    );

    const select = screen.getByRole('combobox');
    
    fireEvent.change(select, { target: { value: 'S' } });
    fireEvent.click(screen.getByText('End Turn'));
    
    expect(gameSlice.submitActionThunk).toHaveBeenCalledWith({
      gameId: 1,
      actionType: 'end_turn',
      actionData: { facing_tile: { x: 1, y: 2 } }
    });
  });
});