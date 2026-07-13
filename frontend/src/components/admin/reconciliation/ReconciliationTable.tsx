import { Table, Tag, Space, Button } from 'antd';
import { EyeOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { ReconciliationReport } from '@/types/admin';

interface ReconciliationTableProps {
  reports: ReconciliationReport[];
  isLoading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number, pageSize: number) => void;
  onOpenDetails: (report: ReconciliationReport) => void;
}

export const ReconciliationTable = ({
  reports,
  isLoading,
  page,
  pageSize,
  total,
  onPageChange,
  onOpenDetails,
}: ReconciliationTableProps) => {
  const columns = [
    {
      title: 'Thời gian đối soát',
      dataIndex: 'checkedAt',
      key: 'checkedAt',
      align: 'center' as const,
      render: (checkedAt: string) => dayjs(checkedAt).format('DD/MM/YYYY HH:mm:ss'),
    },
    {
      title: 'Tổng số tài khoản',
      dataIndex: 'totalAccounts',
      key: 'totalAccounts',
      align: 'center' as const,
      render: (val: number) => val.toLocaleString(),
    },
    {
      title: 'Tài khoản sai lệch',
      dataIndex: 'mismatchCount',
      key: 'mismatchCount',
      align: 'center' as const,
      render: (val: number) => {
        if (val > 0) {
          return <span style={{ color: '#EF4444', fontWeight: 'bold' }}>{val}</span>;
        }
        return <span>0</span>;
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      align: 'center' as const,
      render: (status: 'OK' | 'MISMATCH') => {
        if (status === 'MISMATCH') {
          return (
            <Tag color="error" icon={<ExclamationCircleOutlined />}>
              SAI LỆCH
            </Tag>
          );
        }
        return (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            KHỚP (OK)
          </Tag>
        );
      },
    },
    {
      title: 'Hành động',
      key: 'action',
      align: 'center' as const,
      render: (_: unknown, record: ReconciliationReport) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => onOpenDetails(record)}
          >
            Xem chi tiết
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Table
      dataSource={reports}
      columns={columns}
      loading={isLoading}
      rowKey="id"
      pagination={{
        current: page,
        pageSize: pageSize,
        total: total,
        onChange: onPageChange,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '50'],
      }}
      bordered={false}
      className="premium-table"
    />
  );
};
