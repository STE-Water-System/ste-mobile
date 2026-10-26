import { useQuery } from '@tanstack/react-query';

import { meterApi } from '../services/api';
import { roundStats } from '../lib/round';

/**
 * The agent's assigned round for the month. One query key shared by the home,
 * round, route and history screens; the reading form invalidates it after a
 * submission, exactly as before.
 */
export const AGENT_ROUND_KEY = ['agent-round'] as const;

export const useAgentRound = () =>
  useQuery({
    queryKey: AGENT_ROUND_KEY,
    queryFn: async () => {
      const assigned = await meterApi.getAssignedRound();
      return { items: assigned.items, stats: roundStats(assigned.items) };
    },
  });
