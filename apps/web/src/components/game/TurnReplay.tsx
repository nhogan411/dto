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
    <div className="fixed top-0 left-0 right-0 px-4 py-3 bg-black/85 text-yellow-300 z-[100] flex justify-between items-center">
      <span>
        🎬 Replaying opponent's turn...{' '}
        {currentAction && `(${currentAction.action_type})`}
      </span>
      <button
        onClick={() => dispatch(skipReplay())}
        className="px-3 py-1 bg-neutral-700 hover:bg-neutral-600 text-white border-0 rounded cursor-pointer focus-ring"
      >
        Skip ⏭
      </button>
    </div>
  );
}
