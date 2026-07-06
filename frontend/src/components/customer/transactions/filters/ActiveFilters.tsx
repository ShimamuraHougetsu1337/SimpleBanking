import { Space, Tag } from 'antd';
import type { FiltersState } from '@/hooks/customer/useTransactionFilters';

interface ActiveFiltersProps {
  appliedFilters: FiltersState;
  onRemoveDateRange: () => void;
  onRemoveKeyword: () => void;
}

export function ActiveFilters({
  appliedFilters,
  onRemoveDateRange,
  onRemoveKeyword,
}: ActiveFiltersProps) {
  const hasDateRange = !!appliedFilters.dateRange;
  const hasKeyword = !!appliedFilters.keyword.trim();

  if (!hasDateRange && !hasKeyword) {
    return null;
  }

  return (
    <div style={styles.activeFiltersRow}>
      <span style={styles.activeFiltersLabel}>Đang áp dụng:</span>
      <Space size={6} wrap>
        {hasDateRange && (
          <Tag
            closable
            onClose={onRemoveDateRange}
            style={styles.filterTag}
            color="blue"
          >
            📅 {appliedFilters.dateRange![0].format('DD/MM/YYYY')} → {appliedFilters.dateRange![1].format('DD/MM/YYYY')}
          </Tag>
        )}
        {hasKeyword && (
          <Tag
            closable
            onClose={onRemoveKeyword}
            style={styles.filterTag}
            color="purple"
          >
            🔍 &ldquo;{appliedFilters.keyword.trim()}&rdquo;
          </Tag>
        )}
      </Space>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  activeFiltersRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingTop: 14,
    borderTop: '1px solid #f1f5f9',
    flexWrap: 'wrap',
  },
  activeFiltersLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
  filterTag: {
    borderRadius: 20,
    fontSize: 12,
    padding: '2px 10px',
    fontWeight: 500,
    cursor: 'default',
  },
};
