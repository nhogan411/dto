import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IconPicker } from './IconPicker';

describe('IconPicker', () => {
  it('renders all available icons', () => {
    const handleChange = vi.fn();
    render(<IconPicker value="warrior" onChange={handleChange} />);
    
    expect(screen.getByText('warrior')).toBeInTheDocument();
    expect(screen.getByText('rogue')).toBeInTheDocument();
    expect(screen.getByText('mage')).toBeInTheDocument();
    expect(screen.getByText('archer')).toBeInTheDocument();
    expect(screen.getByText('paladin')).toBeInTheDocument();
    expect(screen.getByText('ranger')).toBeInTheDocument();
  });

  it('calls onChange when an icon is clicked', () => {
    const handleChange = vi.fn();
    render(<IconPicker value="warrior" onChange={handleChange} />);
    
    const mageButton = screen.getByText('mage').closest('button');
    fireEvent.click(mageButton!);
    
    expect(handleChange).toHaveBeenCalledWith('mage');
  });

  it('disables buttons when disabled prop is true', () => {
    const handleChange = vi.fn();
    render(<IconPicker value="warrior" onChange={handleChange} disabled={true} />);
    
    const radios = screen.getAllByRole('radio');
    radios.forEach(radio => {
      expect(radio).toBeDisabled();
    });
  });
});
