'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import type { CoastalAggFunc, CoastalGrain } from '@/types/coastal';

export interface CoastalUrlParams {
  country: string;
  aois: string[];
  start_date: string;
  end_date: string;
  grain: CoastalGrain;
  indicators: string[];
  agg_func: CoastalAggFunc;
  view?: string;
}

export function useCoastalUrlParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const params: CoastalUrlParams = useMemo(() => {
    const country = searchParams.get('country') || 'IDN';
    const aoisParam = searchParams.get('aois');
    const aois = aoisParam ? aoisParam.split(',').filter(Boolean) : [];
    const start_date = searchParams.get('start_date') || '2019-01-01';
    const end_date = searchParams.get('end_date') || '2025-12-31';
    const grain = (searchParams.get('grain') as CoastalGrain) || 'monthly';
    const indicatorsParam = searchParams.get('indicators');
    const indicators = indicatorsParam
      ? indicatorsParam.split(',').filter(Boolean)
      : ['chlor_a', 'vessels'];
    const agg_func = (searchParams.get('agg_func') as CoastalAggFunc) || 'average';
    const view = searchParams.get('view') || undefined;

    return {
      country,
      aois,
      start_date,
      end_date,
      grain,
      indicators,
      agg_func,
      view,
    };
  }, [searchParams]);

  const updateUrlParams = useCallback(
    (newParams: Partial<CoastalUrlParams>) => {
      const current = new URLSearchParams(searchParams.toString());

      if (newParams.country !== undefined) {
        current.set('country', newParams.country);
      }
      if (newParams.aois !== undefined) {
        if (newParams.aois.length > 0) {
          current.set('aois', newParams.aois.join(','));
        } else {
          current.delete('aois');
        }
      }
      if (newParams.start_date !== undefined) {
        current.set('start_date', newParams.start_date);
      }
      if (newParams.end_date !== undefined) {
        current.set('end_date', newParams.end_date);
      }
      if (newParams.grain !== undefined) {
        current.set('grain', newParams.grain);
      }
      if (newParams.indicators !== undefined) {
        current.set('indicators', newParams.indicators.join(','));
      }
      if (newParams.agg_func !== undefined) {
        current.set('agg_func', newParams.agg_func);
      }
      if (newParams.view !== undefined) {
        current.set('view', newParams.view);
      }

      router.push(`${pathname}?${current.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return {
    params,
    updateUrlParams,
  };
}

export default useCoastalUrlParams;
