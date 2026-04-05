import { useEffect, useRef, useState } from 'react';

export interface ActionPopoverProps {
  x: number;
  y: number;
  onClose: () => void;
  onMove: () => void;
  onAttack: () => void;
  onDefend: (direction: 'north' | 'south' | 'east' | 'west') => void;
  onEndTurn: (direction: 'north' | 'south' | 'east' | 'west') => void;
  canMove: boolean;
  canAttack: boolean;
  canDefend: boolean;
  canEndTurn: boolean;
  actingCharacterId: number | null;
}

export function ActionPopover({
  x,
  y,
  onClose,
  onMove,
  onAttack,
  onDefend,
  onEndTurn,
  canMove,
  canAttack,
  canDefend,
  canEndTurn,
  actingCharacterId,
}: ActionPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);
  const prevActingId = useRef<number | null>(actingCharacterId);
  const [pendingFacingAction, setPendingFacingAction] = useState<'defend' | 'endTurn' | null>(null);

  useEffect(() => {
    if (!previousFocusRef.current) {
      previousFocusRef.current = document.activeElement;
    }

    const firstEnabledButton = popoverRef.current?.querySelector<HTMLButtonElement>('button:not([disabled])');
    firstEnabledButton?.focus();
  }, [pendingFacingAction]);

  useEffect(() => {
    return () => {
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    };
  }, []);

  useEffect(() => {
    if (prevActingId.current !== actingCharacterId) {
      onClose();
    }
    prevActingId.current = actingCharacterId;
  }, [actingCharacterId, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pendingFacingAction !== null) {
          setPendingFacingAction(null);
        } else {
          onClose();
        }
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, pendingFacingAction]);

  if (pendingFacingAction !== null) {
    return (
      <div
        ref={popoverRef}
        role="dialog"
        aria-label="Choose Facing Direction"
        className="fixed z-50 bg-surface-popover border border-border-subtle rounded-lg shadow-xl p-2 min-w-popover flex flex-col gap-1"
        style={{
          top: Math.max(10, Math.min(window.innerHeight - 200, y)),
          left: Math.max(10, Math.min(window.innerWidth - 150, x)),
        }}
      >
        <div className="text-xs text-neutral-300 mb-1 px-1 font-semibold uppercase tracking-wider text-center">Face Direction</div>
         <button
           role="menuitem"
           aria-label="Face North"
           onClick={(e) => { e.stopPropagation(); if (pendingFacingAction === 'defend') { onDefend('north'); } else { onEndTurn('north'); } }}
           className="w-full text-center px-3 py-2 rounded text-white bg-transparent hover:bg-border-subtle focus:outline-none focus:ring-2 focus:ring-accent-green transition-colors"
         >
          North (Up)
        </button>
         <button
           role="menuitem"
           aria-label="Face South"
           onClick={(e) => { e.stopPropagation(); if (pendingFacingAction === 'defend') { onDefend('south'); } else { onEndTurn('south'); } }}
           className="w-full text-center px-3 py-2 rounded text-white bg-transparent hover:bg-border-subtle focus:outline-none focus:ring-2 focus:ring-accent-green transition-colors"
         >
          South (Down)
        </button>
         <button
           role="menuitem"
           aria-label="Face East"
           onClick={(e) => { e.stopPropagation(); if (pendingFacingAction === 'defend') { onDefend('east'); } else { onEndTurn('east'); } }}
           className="w-full text-center px-3 py-2 rounded text-white bg-transparent hover:bg-border-subtle focus:outline-none focus:ring-2 focus:ring-accent-green transition-colors"
         >
          East (Right)
        </button>
         <button
           role="menuitem"
           aria-label="Face West"
           onClick={(e) => { e.stopPropagation(); if (pendingFacingAction === 'defend') { onDefend('west'); } else { onEndTurn('west'); } }}
           className="w-full text-center px-3 py-2 rounded text-white bg-transparent hover:bg-border-subtle focus:outline-none focus:ring-2 focus:ring-accent-green transition-colors"
         >
          West (Left)
        </button>
      </div>
    );
  }

  return (
    <div
      ref={popoverRef}
      role="menu"
      aria-label="Character Actions"
      className="fixed z-50 bg-surface-popover border border-border-subtle rounded-lg shadow-xl p-2 min-w-popover flex flex-col gap-1"
      style={{
        top: Math.max(10, Math.min(window.innerHeight - 200, y)),
        left: Math.max(10, Math.min(window.innerWidth - 150, x)),
      }}
    >
      <button
        role="menuitem"
        aria-label="Move Action"
        aria-disabled={!canMove}
        disabled={!canMove}
        onClick={(e) => { e.stopPropagation(); onMove(); }}
        className="w-full text-left px-3 py-2 rounded text-white bg-transparent hover:bg-border-subtle disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-accent-green transition-colors"
      >
        Move
      </button>
      <button
        role="menuitem"
        aria-label="Attack Action"
        aria-disabled={!canAttack}
        disabled={!canAttack}
        onClick={(e) => { e.stopPropagation(); onAttack(); }}
        className="w-full text-left px-3 py-2 rounded text-white bg-transparent hover:bg-border-subtle disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-accent-green transition-colors"
      >
        Attack
      </button>
      <button
        role="menuitem"
        aria-label="Defend Action"
        aria-disabled={!canDefend}
        disabled={!canDefend}
        onClick={(e) => { e.stopPropagation(); setPendingFacingAction('defend'); }}
        className="w-full text-left px-3 py-2 rounded text-white bg-transparent hover:bg-border-subtle disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-accent-green transition-colors"
      >
        Defend
      </button>
      <div className="h-px bg-border-subtle my-1" role="separator" />
      <button
        role="menuitem"
        aria-label="End Turn Action"
        aria-disabled={!canEndTurn}
        disabled={!canEndTurn}
        onClick={(e) => { e.stopPropagation(); setPendingFacingAction('endTurn'); }}
        className="w-full text-left px-3 py-2 rounded text-accent-green bg-transparent hover:bg-border-subtle disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-accent-green transition-colors"
      >
        End Turn
      </button>
    </div>
  );
}
