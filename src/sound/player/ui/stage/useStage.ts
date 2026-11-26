/**
 * Pages declare the stage they want; the renderer eases into it.
 */

import { useEffect } from 'react';
import type { Depth } from './palette';
import { type RingMode, previewDepth, setStage } from './stage';

export function useStage(depth: Depth, mode: RingMode): void {
  useEffect(() => {
    setStage({ depth, mode });
    return () => previewDepth(null);
  }, [depth, mode]);
}

export { previewDepth };
