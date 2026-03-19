import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActionPopover } from './ActionPopover';

describe('ActionPopover', () => {
  const defaultProps = {
    x: 100,
    y: 100,
    onClose: vi.fn(),
    onMove: vi.fn(),
    onAttack: vi.fn(),
    onDefend: vi.fn(),
    onEndTurn: vi.fn(),
    canMove: true,
    canAttack: true,
    canDefend: true,
    canEndTurn: true,
    actingCharacterId: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all action buttons', () => {
    render(<ActionPopover {...defaultProps} />);
    expect(screen.getByRole('menuitem', { name: /move action/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /attack action/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /defend action/i })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /end turn action/i })).toBeInTheDocument();
  });

  it('disables buttons based on props', () => {
    render(
      <ActionPopover
        {...defaultProps}
        canMove={false}
        canAttack={false}
      />
    );

    const moveBtn = screen.getByRole('menuitem', { name: /move action/i });
    const attackBtn = screen.getByRole('menuitem', { name: /attack action/i });
    const defendBtn = screen.getByRole('menuitem', { name: /defend action/i });

    expect(moveBtn).toBeDisabled();
    expect(moveBtn).toHaveAttribute('aria-disabled', 'true');
    
    expect(attackBtn).toBeDisabled();
    expect(attackBtn).toHaveAttribute('aria-disabled', 'true');

    expect(defendBtn).not.toBeDisabled();
    expect(defendBtn).toHaveAttribute('aria-disabled', 'false');
  });

  it('calls correct handler on button click', async () => {
    render(<ActionPopover {...defaultProps} />);
    
    await userEvent.click(screen.getByRole('menuitem', { name: /move action/i }));
    expect(defaultProps.onMove).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('menuitem', { name: /attack action/i }));
    expect(defaultProps.onAttack).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape key', () => {
    render(<ActionPopover {...defaultProps} />);
    
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on outside click', async () => {
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <ActionPopover {...defaultProps} />
      </div>
    );
    
    await userEvent.click(screen.getByTestId('outside'));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when clicking inside the popover', async () => {
    render(<ActionPopover {...defaultProps} />);
    
    await userEvent.click(screen.getByRole('menu'));
    expect(defaultProps.onClose).not.toHaveBeenCalled();
  });

  it('closes when actingCharacterId changes', () => {
    const { rerender } = render(<ActionPopover {...defaultProps} actingCharacterId={1} />);
    expect(defaultProps.onClose).not.toHaveBeenCalled();

    rerender(<ActionPopover {...defaultProps} actingCharacterId={2} />);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });
});
