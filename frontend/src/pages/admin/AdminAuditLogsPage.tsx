import { useState } from 'react';
import { Card, Typography, Tabs, Space, DatePicker, Select, Button } from 'antd';
import { DatabaseOutlined, SearchOutlined } from '@ant-design/icons';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import AdminAuditLogTable from '@/components/admin/AdminAuditLogTable';
import CustomerAuditLogTable from '@/components/admin/CustomerAuditLogTable';
import dayjs from 'dayjs';
import { useAuthStore } from '@/store/auth.store';
import { UserRole } from '@/constants/roles';
import { Navigate } from 'react-router-dom';
import type { GetAuditLogsParams, AdminAuditLog, CustomerAuditLog } from '@/types/admin';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const CARD_SHADOW_STYLE = {
  boxShadow: '0 2px 5px -1px rgba(50, 50, 93, 0.25), 0 1px 3px -1px rgba(0, 0, 0, 0.3)',
  borderRadius: '12px',
  border: 'none',
  background: '#ffffff',
  height: '100%',
};

export default function AdminAuditLogsPage() {
  const currentUser = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState('admin');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  const [status, setStatus] = useState<string | undefined>(undefined);

  const [searchParams, setSearchParams] = useState<GetAuditLogsParams>({
    page: 1,
    limit: 10,
  });

  const { data, isLoading } = useAuditLogs(activeTab, searchParams);

  if (currentUser?.role !== UserRole.SUPERADMIN && currentUser?.role !== UserRole.MANAGER) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const logs = data?.data || [];
  const meta = data?.meta || { page: 1, limit: 10, total: 0, totalPages: 0 };

  const handleTableChange = (pageNumber: number, pageSize: number) => {
    setSearchParams((prev) => ({
      ...prev,
      page: pageNumber,
      limit: pageSize,
    }));
  };

  const handleSearch = () => {
    setSearchParams((prev) => ({
      ...prev,
      page: 1,
      status: status === 'all' ? undefined : status,
      startDate: dateRange[0] ? dateRange[0].startOf('day').toISOString() : undefined,
      endDate: dateRange[1] ? dateRange[1].endOf('day').toISOString() : undefined,
    }));
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setSearchParams({
      page: 1,
      limit: searchParams.limit,
      status: status === 'all' ? undefined : status,
      startDate: dateRange[0] ? dateRange[0].startOf('day').toISOString() : undefined,
      endDate: dateRange[1] ? dateRange[1].endOf('day').toISOString() : undefined,
    });
  };

  const pagination = {
    current: meta.page,
    pageSize: meta.limit,
    total: meta.total,
    onChange: handleTableChange,
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Space size={12}>
          <DatabaseOutlined style={{ fontSize: 24, color: '#3B82F6' }} />
          <Title level={2} style={{ margin: 0, color: '#1e293b' }}>Nhật ký hệ thống</Title>
        </Space>
      </div>

      <Card style={{ ...CARD_SHADOW_STYLE, flex: 1 }} styles={{ body: { height: '100%', display: 'flex', flexDirection: 'column' } }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <RangePicker
            onChange={(dates) => setDateRange(dates ? [dates[0], dates[1]] : [null, null])}
            style={{ borderRadius: 8 }}
          />
          <Select
            placeholder="Lọc theo trạng thái"
            allowClear
            style={{ width: 150 }}
            onChange={setStatus}
            defaultValue="all"
            options={[
              { value: 'all', label: 'Tất cả' },
              { value: 'success', label: 'Thành công' },
              { value: 'failed', label: 'Thất bại' },
            ]}
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleSearch}
            style={{ borderRadius: 8 }}
          >
            Tìm kiếm
          </Button>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={[
            {
              key: 'admin',
              label: 'Thao tác của Admin',
              children: (
                <AdminAuditLogTable
                  logs={activeTab === 'admin' ? (logs as AdminAuditLog[]) : []}
                  loading={isLoading}
                  pagination={pagination}
                />
              ),
            },
            {
              key: 'customer',
              label: 'Thao tác của Khách hàng',
              children: (
                <CustomerAuditLogTable
                  logs={activeTab === 'customer' ? (logs as CustomerAuditLog[]) : []}
                  loading={isLoading}
                  pagination={pagination}
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
