import { useQuery } from '@tanstack/react-query';
import { movementService } from '../../../infrastructure/services/movementService';

export const SUMMARY_CURRENCY = 'COP';

// One query per period and currency; the totals come from the server for the whole period.
export function useMovementSummary(from: string, to: string) {
  return useQuery({
    queryKey: ['movements', 'summary', from, to, SUMMARY_CURRENCY],
    queryFn: ({ signal }) => movementService.getSummary({ from, to, currencyCode: SUMMARY_CURRENCY }, signal),
  });
}
