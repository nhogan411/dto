import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArchetypePicker } from './ArchetypePicker';

describe('ArchetypePicker', () => {
  it('renders both archetype cards', () => {
    render(<ArchetypePicker value="warrior" onChange={() => {}} />);
    expect(screen.getByText('Warrior')).toBeInTheDocument();
    expect(screen.getByText('Scout')).toBeInTheDocument();
  });

  it('marks the current archetype as selected', () => {
    render(<ArchetypePicker value="scout" onChange={() => {}} />);
    const scoutCard = screen.getByRole('radio', { name: /scout/i });
    expect(scoutCard).toHaveAttribute('aria-checked', 'true');
    const warriorCard = screen.getByRole('radio', { name: /warrior/i });
    expect(warriorCard).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onChange with the clicked archetype', () => {
    const onChange = vi.fn();
    render(<ArchetypePicker value="warrior" onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: /scout/i }));
    expect(onChange).toHaveBeenCalledWith('scout');
  });

  it('does not call onChange when disabled', () => {
    const onChange = vi.fn();
    render(<ArchetypePicker value="warrior" onChange={onChange} disabled />);
    fireEvent.click(screen.getByRole('radio', { name: /scout/i }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
