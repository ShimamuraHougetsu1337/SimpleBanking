import { Button, DatePicker, Input, Tag, Tooltip } from 'antd';
import {
  SearchOutlined,
  CalendarOutlined,
  CloseCircleOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import type { FiltersState } from '@/hooks/customer/useTransactionFilters';
import { ActiveFilters } from './ActiveFilters';
import { styles, filterCss } from './TransactionFilters.styles';

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
      <ActiveFilters
        appliedFilters={appliedFilters}
        onRemoveDateRange={onRemoveDateRange}
        onRemoveKeyword={onRemoveKeyword}
      />

      <style>{filterCss}</style>
    </div>
  );
}
