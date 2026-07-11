import { Input, Select, DatePicker } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

const { RangePicker } = DatePicker;

interface AdminTransactionFiltersProps {
  searchQuery: string;
  typeFilter: string;
  onSearchChange: (value: string) => void;
  onTypeFilterChange: (value: string) => void;
  onDateRangeChange: (dates: unknown, dateStrings: [string, string]) => void;
}

export const AdminTransactionFilters = ({
  searchQuery,
  typeFilter,
  onSearchChange,
  onTypeFilterChange,
  onDateRangeChange,
}: AdminTransactionFiltersProps) => (
  <div style={{ padding: '24px 24px 16px', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
    <Input
      placeholder="Search by Tx ID, Sender, or Receiver..."
      prefix={<SearchOutlined style={{ color: '#64748b' }} />}
      style={{ width: 300, borderRadius: 8, height: 40 }}
      value={searchQuery}
      onChange={(e) => onSearchChange(e.target.value)}
    />
    <Select
      value={typeFilter}
      onChange={onTypeFilterChange}
      style={{ width: 150, height: 40 }}
      styles={{ popup: { root: { borderRadius: 8 } } }}
      options={[
        { value: 'all', label: 'All Types' },
        { value: 'deposit', label: 'Deposit' },
        { value: 'transfer', label: 'Transfer' },
      ]}
    />
    <RangePicker
      style={{ borderRadius: 8, height: 40 }}
      onChange={onDateRangeChange}
    />
  </div>
);
