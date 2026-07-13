import { Modal, Space, Button, Table, Tag, Alert, Tooltip, Typography } from 'antd';
import { ExclamationCircleOutlined, CheckCircleOutlined, BookOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import type { ReconciliationReport, MismatchDetail } from '@/types/admin';

const { Text, Title } = Typography;

interface ReconciliationDetailsModalProps {
  open: boolean;
  report: ReconciliationReport | null;
  onCancel: () => void;
}

export const ReconciliationDetailsModal = ({
  open,
  report,
  onCancel,
}: ReconciliationDetailsModalProps) => {
  const navigate = useNavigate();

  const formatVND = (amount: string) => {
    return `${Number(amount).toLocaleString()} VND`;
  };

  const detailColumns = [
    {
      title: 'Số tài khoản',
      dataIndex: 'accountNumber',
      key: 'accountNumber',
      render: (val: string) => <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{val}</span>,
    },
    {
      title: 'Số dư tài khoản (DB)',
      dataIndex: 'cachedBalance',
      key: 'cachedBalance',
      render: (val: string) => formatVND(val),
    },
    {
      title: 'Số dư thực tế (Sổ cái)',
      dataIndex: 'computedBalance',
      key: 'computedBalance',
      render: (val: string) => formatVND(val),
    },
    {
      title: 'Chênh lệch',
      dataIndex: 'difference',
      key: 'difference',
      render: (val: string) => {
        const diff = Number(val);
        const color = diff > 0 ? '#10B981' : '#EF4444';
        const sign = diff > 0 ? '+' : '';
        return (
          <span style={{ color, fontWeight: 'bold' }}>
            {sign}
            {diff.toLocaleString()} VND
          </span>
        );
      },
    },
    {
      title: 'Xem sổ cái',
      key: 'viewLedger',
      render: (_: unknown, record: MismatchDetail) => (
        <Tooltip title="Xem lịch sử giao dịch chi tiết từ sổ cái">
          <Button
            type="primary"
            ghost
            icon={<BookOutlined />}
            size="small"
            onClick={() => {
              onCancel();
              navigate(`/admin/accounts/${record.accountId}/ledger`);
            }}
          >
            Sổ cái
          </Button>
        </Tooltip>
      ),
    },
  ];

  return (
    <Modal
      title={
        <Space size={8}>
          <ExclamationCircleOutlined style={{ color: '#EF4444' }} />
          <span style={{ fontSize: 18, fontWeight: 'bold' }}>Chi tiết tài khoản sai lệch</span>
        </Space>
      }
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="close" onClick={onCancel} style={{ borderRadius: 6 }}>
          Đóng
        </Button>,
      ]}
      width={850}
      style={{ borderRadius: 12, overflow: 'hidden' }}
    >
      {report && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
          <div>
            <Text type="secondary">Thời điểm đối soát: </Text>
            <Text strong>{dayjs(report.checkedAt).format('DD/MM/YYYY HH:mm:ss')}</Text>
            <br />
            <Text type="secondary">Trạng thái: </Text>
            <Tag color={report.status === 'MISMATCH' ? 'error' : 'success'}>
              {report.status === 'MISMATCH' ? 'SAI LỆCH' : 'KHỚP'}
            </Tag>
            <br />
            <Text type="secondary">Tổng số lượng tài khoản quét: </Text>
            <Text strong>{report.totalAccounts}</Text>
          </div>

          {report.details && report.details.length > 0 ? (
            <div>
              <Title level={5} style={{ marginBottom: 12, color: '#ef4444' }}>
                Danh sách {report.details.length} tài khoản phát hiện sai lệch:
              </Title>
              <Table
                dataSource={report.details}
                columns={detailColumns}
                rowKey="accountId"
                pagination={false}
                bordered
                size="small"
              />
            </div>
          ) : (
            <Alert
              message="Không phát hiện bất kỳ tài khoản nào bị sai lệch số dư trong phiên đối soát này."
              type="success"
              showIcon
              icon={<CheckCircleOutlined />}
            />
          )}
        </div>
      )}
    </Modal>
  );
};
