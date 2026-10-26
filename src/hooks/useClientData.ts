import { useQuery } from '@tanstack/react-query';

import { clientApi } from '../services/api';
import type { ClientSession } from '../store/authStore';

/**
 * Customer-space queries. The keys and calls are the ones the previous screens
 * used, so caching and the backend contract are unchanged.
 */
export const useClientBills = (customer: ClientSession | null) =>
  useQuery({
    queryKey: ['client-bills', customer?.customerId],
    enabled: !!customer,
    queryFn: () => clientApi.getBills(customer!.customerId),
  });

export const useClientConsumption = (meterId: number | undefined) =>
  useQuery({
    queryKey: ['client-consumption', meterId],
    enabled: !!meterId,
    queryFn: () => clientApi.getConsumption(meterId!),
  });
