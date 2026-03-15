import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { advanceReplay, skipReplay, handleGameChannelMessage } from '../../store/slices/gameSlice';

export function TurnReplay() {
  const dispatch = useAppDispatch();
  const replayQueue = useAppSelector((state) => state.game.replayQueue);
  const replayInProgress = useAppSelector((state) => state.game.replayInProgress);

  useEffect(() => {
    if (!replayInProgress || replayQueue.length === 0) return;

    const currentAction = replayQueue[0];

    if (currentAction.result_data) {
      dispatch(handleGameChannelMessage({
        event: 'action_completed',
        data: currentAction.result_data,
      }));
    }

    const timer = setTimeout(() => {
      dispatch(advanceReplay());
    }, 600);
    return () => clearTimeout(timer);
  }, [replayQueue, replayInProgress, dispatch]);

  if (!replayInProgress) return null;

  const currentAction = replayQueue[0];

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, padding: '0.75rem 1rem',
      backgroundColor: 'rgba(0,0,0,0.85)', color: '#facc15', zIndex: 100,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <span>
        🎬 Replaying opponent's turn...{' '}
        {currentAction && `(${currentAction.action_type})`}
      </span>
      <button
        onClick={() => dispatch(skipReplay())}
        style={{ padding: '0.25rem 0.75rem', background: '#374151', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
      >
        Skip ⏭
      </button>
    </div>
  );
}
