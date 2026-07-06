import { useEffect, useState } from 'react';
import { Card, Typography, Tabs, Space, DatePicker, Select } from 'antd';
import { DatabaseOutlined } from '@ant-design/icons';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import AdminAuditLogTable from '@/components/admin/AdminAuditLogTable';
import CustomerAuditLogTable from '@/components/admin/CustomerAuditLogTable';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const CARD_SHADOW_STYLE = {
  boxShadow: '0 2px 5px -1px rgba(50, 50, 93, 0.25), 0 1px 3px -1px rgba(0, 0, 0, 0.3)',
  borderRadius: '12px',
  border: 'none',
  background: '#ffffff',
  height: '100%',
};

export default function AdminAuditLogsPage() {
  const [activeTab, setActiveTab] = useState('admin');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([null, null]);
  const [status, setStatus] = useState<string | undefined>(undefined);

  const {
    adminLogs,
    customerLogs,
    loading,
    meta,
    fetchAdminLogs,
    fetchCustomerLogs,
  } = useAuditLogs();

  const loadLogs = (page = 1, pageSize = 10) => {
    const params: any = { page, limit: pageSize };
    if (status) params.status = status;
    if (dateRange[0]) params.startDate = dateRange[0].toISOString();
    if (dateRange[1]) params.endDate = dateRange[1].toISOString();

    if (activeTab === 'admin') {
      fetchAdminLogs(params);
    } else {
      fetchCustomerLogs(params);
    }
  };

  useEffect(() => {
    loadLogs(1, meta.limit);
  }, [activeTab, dateRange, status]);

  const handleTableChange = (page: number, pageSize: number) => {
    loadLogs(page, pageSize);
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
          <Title level={2} style={{ margin: 0, color: '#1e293b' }}>Audit Logs</Title>
        </Space>
      </div>

      <Card style={{ ...CARD_SHADOW_STYLE, flex: 1 }} styles={{ body: { height: '100%', display: 'flex', flexDirection: 'column' } }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <RangePicker
            onChange={(dates) => setDateRange(dates as any)}
            style={{ borderRadius: 8 }}
          />
          <Select
            placeholder="Filter by status"
            allowClear
            style={{ width: 150 }}
            onChange={setStatus}
          >
            <Option value="success">Success</Option>
            <Option value="failed">Failed</Option>
          </Select>
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'admin',
              label: 'Admin Actions',
              children: (
                <AdminAuditLogTable
                  logs={adminLogs}
                  loading={loading && activeTab === 'admin'}
                  pagination={pagination}
                />
              ),
            },
            {
              key: 'customer',
              label: 'Customer Actions',
              children: (
                <CustomerAuditLogTable
                  logs={customerLogs}
                  loading={loading && activeTab === 'customer'}
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
