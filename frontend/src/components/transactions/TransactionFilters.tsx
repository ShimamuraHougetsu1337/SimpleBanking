import { Button, DatePicker, Input, Space, Tag, Tooltip } from 'antd';
import {
  SearchOutlined,
  CalendarOutlined,
  CloseCircleOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import type { FiltersState } from '@/hooks/client/useTransactionFilters';

const { RangePicker } = DatePicker;

interface TransactionFiltersProps {
  /** Draft state — bound to form controls (not yet applied to the API) */
  draftFilters: FiltersState;
  /** Applied state — what is actually filtering the data right now */
  appliedFilters: FiltersState;
  isFilterActive: boolean;
  onDateRangeChange: (dates: [Dayjs, Dayjs] | null) => void;
  onKeywordChange: (value: string) => void;
  /** Apply draft → API. Only this function triggers a new fetch. */
  onApplyFilters: () => void;
  /** Clear both draft and applied immediately. */
  onResetFilters: () => void;
  /** Remove individual applied filter tags immediately. */
  onRemoveDateRange: () => void;
  onRemoveKeyword: () => void;
}

export function TransactionFilters({
  draftFilters,
  appliedFilters,
  isFilterActive,
  onDateRangeChange,
  onKeywordChange,
  onApplyFilters,
  onResetFilters,
  onRemoveDateRange,
  onRemoveKeyword,
}: TransactionFiltersProps) {
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.headerRow}>
        <div style={styles.headerLeft}>
          <FilterOutlined style={{ color: '#3B82F6', fontSize: 15 }} />
          <span style={styles.headerTitle}>Bộ lọc</span>
          {isFilterActive && (
            <Tag style={styles.activeTag}>
              <span style={{ fontSize: 8, marginRight: 4, verticalAlign: 'middle' }}>●</span>
              Đang lọc
            </Tag>
          )}
        </div>
        {isFilterActive && (
          <Tooltip title="Xóa tất cả bộ lọc">
            <Button
              type="text"
              size="small"
              icon={<CloseCircleOutlined />}
              onClick={onResetFilters}
              style={styles.resetButton}
            >
              Xóa bộ lọc
            </Button>
          </Tooltip>
        )}
      </div>

      {/* Filter controls row */}
      <div style={styles.controlsRow}>
        {/* Date Range */}
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>
            <CalendarOutlined style={{ marginRight: 5, color: '#94a3b8' }} />
            Khoảng thời gian
          </label>
          <RangePicker
            value={draftFilters.dateRange}
            onChange={(dates) => onDateRangeChange(dates as [Dayjs, Dayjs] | null)}
            format="DD/MM/YYYY"
            placeholder={['Từ ngày', 'Đến ngày']}
            style={styles.rangePicker}
            allowClear
          />
        </div>

        {/* Keyword */}
        <div style={{ ...styles.filterGroup, flex: 1, minWidth: 240 }}>
          <label style={styles.filterLabel}>
            <SearchOutlined style={{ marginRight: 5, color: '#94a3b8' }} />
            Từ khóa
          </label>
          <Input
            value={draftFilters.keyword}
            onChange={(e) => onKeywordChange(e.target.value)}
            onPressEnter={onApplyFilters}
            placeholder="Nội dung, tên người gửi/nhận, mã giao dịch..."
            allowClear
            style={styles.keywordInput}
            suffix={
              <SearchOutlined style={{ color: '#94a3b8' }} />
            }
          />
        </div>

        {/* Apply button */}
        <div style={styles.applyGroup}>
          <label style={{ ...styles.filterLabel, visibility: 'hidden' }}>
            &nbsp;
          </label>
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={onApplyFilters}
            style={styles.applyButton}
            size="middle"
          >
            Tìm kiếm
          </Button>
        </div>
      </div>

      {/* Active filter tags — reflect APPLIED state */}
      {isFilterActive && (
        <div style={styles.activeFiltersRow}>
          <span style={styles.activeFiltersLabel}>Đang áp dụng:</span>
          <Space size={6} wrap>
            {appliedFilters.dateRange && (
              <Tag
                closable
                onClose={onRemoveDateRange}
                style={styles.filterTag}
                color="blue"
              >
                📅 {appliedFilters.dateRange[0].format('DD/MM/YYYY')} → {appliedFilters.dateRange[1].format('DD/MM/YYYY')}
              </Tag>
            )}
            {appliedFilters.keyword.trim() && (
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
      )}

      <style>{filterCss}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#ffffff',
    borderRadius: 12,
    padding: '18px 24px',
    marginBottom: 16,
    boxShadow: '0 2px 5px -1px rgba(50,50,93,0.12), 0 1px 3px -1px rgba(0,0,0,0.08)',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontWeight: 600,
    fontSize: 14,
    color: '#1e293b',
    letterSpacing: '-0.01em',
  },
  activeTag: {
    background: '#eff6ff',
    color: '#3B82F6',
    border: '1px solid #bfdbfe',
    borderRadius: 20,
    fontSize: 11,
    padding: '1px 8px',
    fontWeight: 500,
  },
  resetButton: {
    color: '#64748b',
    fontSize: 13,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    height: 28,
  },
  controlsRow: {
    display: 'flex',
    gap: 14,
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    minWidth: 180,
  },
  applyGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: '#64748b',
    letterSpacing: '0.02em',
    textTransform: 'uppercase' as const,
    display: 'flex',
    alignItems: 'center',
  },
  rangePicker: {
    width: '100%',
    borderRadius: 8,
    minWidth: 240,
  },
  keywordInput: {
    borderRadius: 8,
  },
  applyButton: {
    background: '#3B82F6',
    borderColor: '#3B82F6',
    borderRadius: 8,
    fontWeight: 600,
    height: 32,
    paddingInline: 20,
  },
  activeFiltersRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingTop: 14,
    borderTop: '1px solid #f1f5f9',
    flexWrap: 'wrap' as const,
  },
  activeFiltersLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: 500,
    whiteSpace: 'nowrap' as const,
  },
  filterTag: {
    borderRadius: 20,
    fontSize: 12,
    padding: '2px 10px',
    fontWeight: 500,
    cursor: 'default',
  },
};

const filterCss = `
  .ant-picker-range { border-radius: 8px !important; }
  .ant-input-affix-wrapper { border-radius: 8px !important; }
  .ant-btn-text:hover { color: #EF4444 !important; background: #fef2f2 !important; }
`;
