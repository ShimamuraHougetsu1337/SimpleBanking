import { useState, useCallback, useMemo } from 'react';
import type { Dayjs } from 'dayjs';
import type { UseTransactionsParams } from './useTransactions';

export interface FiltersState {
  dateRange: [Dayjs, Dayjs] | null;
  keyword: string;
}

const INITIAL_STATE: FiltersState = {
  dateRange: null,
  keyword: '',
};

/**
 * Manages two separate filter states:
 * - draftFilters: what the user is currently editing in the UI controls.
 * - appliedFilters: what is actually sent to the API (updated only on explicit apply/reset).
 */
export function useTransactionFilters() {
  const [draftFilters, setDraftFilters] = useState<FiltersState>(INITIAL_STATE);
  const [appliedFilters, setAppliedFilters] = useState<FiltersState>(INITIAL_STATE);

  // --- Draft handlers (update form controls only) ---

  const handleDateRangeChange = useCallback((dates: [Dayjs, Dayjs] | null) => {
    setDraftFilters((prev) => ({ ...prev, dateRange: dates }));
  }, []);

  const handleKeywordChange = useCallback((value: string) => {
    setDraftFilters((prev) => ({ ...prev, keyword: value }));
  }, []);

  // --- Apply: copy draft → applied, triggers the API call via filterParams change ---

  const handleApplyFilters = useCallback(() => {
    setAppliedFilters({ ...draftFilters });
  }, [draftFilters]);

  // --- Reset: clear both draft and applied immediately ---

  const handleResetFilters = useCallback(() => {
    setDraftFilters(INITIAL_STATE);
    setAppliedFilters(INITIAL_STATE);
  }, []);

  // --- Individual tag removal: update both states and re-apply immediately ---

  const handleRemoveDateRange = useCallback(() => {
    setDraftFilters((prev) => ({ ...prev, dateRange: null }));
    setAppliedFilters((prev) => ({ ...prev, dateRange: null }));
  }, []);

  const handleRemoveKeyword = useCallback(() => {
    setDraftFilters((prev) => ({ ...prev, keyword: '' }));
    setAppliedFilters((prev) => ({ ...prev, keyword: '' }));
  }, []);

  // isFilterActive reflects the APPLIED state (whether data is actually being filtered)
  const isFilterActive = useMemo(
    () =>
      appliedFilters.dateRange !== null ||
      appliedFilters.keyword.trim() !== '',
    [appliedFilters],
  );

  // filterParams is derived from APPLIED state only
  const filterParams = useMemo((): Omit<UseTransactionsParams, 'page' | 'limit'> => {
    const params: Omit<UseTransactionsParams, 'page' | 'limit'> = {};

    if (appliedFilters.dateRange) {
      params.fromDate = appliedFilters.dateRange[0].format('YYYY-MM-DD');
      params.toDate = appliedFilters.dateRange[1].format('YYYY-MM-DD');
    }

    const trimmedKeyword = appliedFilters.keyword.trim();
    if (trimmedKeyword) {
      params.search = trimmedKeyword;
    }

    return params;
  }, [appliedFilters]);

  return {
    draftFilters,
    appliedFilters,
    filterParams,
    isFilterActive,
    handleDateRangeChange,
    handleKeywordChange,
    handleApplyFilters,
    handleResetFilters,
    handleRemoveDateRange,
    handleRemoveKeyword,
  };
}
