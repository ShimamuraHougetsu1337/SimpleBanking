import { useState } from 'react';
import {
  Table,
  Card,
  Tag,
  Button,
  Select,
  Space,
  Typography,
  Modal,
  Form,
  Input,
  Radio,
  Checkbox,
  Tooltip,
} from 'antd';
import {
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { useAdminFraudFlags } from '@/hooks/admin/useAdminFraudFlags';
import type { FraudFlagRecord } from '@/types/admin';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export default function AdminFraudFlagsPage() {
  const {
    flags,
    total,
    page,
    pageSize,
    statusFilter,
    isLoading,
    isReviewing,
    reviewFraudFlag,
    handlePageChange,
    handleStatusFilterChange,
  } = useAdminFraudFlags();

  const [selectedFlag, setSelectedFlag] = useState<FraudFlagRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  const handleOpenReviewModal = (record: FraudFlagRecord) => {
    setSelectedFlag(record);
    form.setFieldsValue({
      status: 'approved',
      lockAccount: false,
      reviewNote: '',
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedFlag(null);
    form.resetFields();
  };

  const handleSubmitReview = (values: {
    status: 'approved' | 'rejected';
    reviewNote?: string;
    lockAccount?: boolean;
  }) => {
    if (!selectedFlag) return;
    reviewFraudFlag(selectedFlag.id, values);
    handleCloseModal();
  };

  const columns = [
    {
      title: 'Mã cảnh báo / Thời gian',
      key: 'id',
      render: (_: unknown, record: FraudFlagRecord) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>
            {record.id.slice(0, 8)}...
          </Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {new Date(record.createdAt).toLocaleString('vi-VN')}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Tài khoản',
      key: 'account',
      render: (_: unknown, record: FraudFlagRecord) => (
        <div>
          <Text copyable={{ text: record.account?.accountNumber }}>
            {record.account?.accountNumber || record.accountId}
          </Text>
          {record.account?.status === 'locked' && (
            <div>
              <Tag color="red" icon={<LockOutlined />}>
                Đang bị khóa
              </Tag>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Quy tắc vi phạm',
      key: 'ruleName',
      render: (_: unknown, record: FraudFlagRecord) => {
        if (record.ruleName === 'HIGH_FREQUENCY_1MIN') {
          return (
            <Tag color="error" icon={<WarningOutlined />}>
              Giao dịch dồn dập (1 phút)
            </Tag>
          );
        }
        return (
          <Tag color="warning" icon={<ExclamationCircleOutlined />}>
            Đột biến giá trị (30 ngày)
          </Tag>
        );
      },
    },
    {
      title: 'Lý do cảnh báo',
      dataIndex: 'reason',
      key: 'reason',
      render: (text: string) => (
        <Text style={{ fontSize: 13, maxWidth: 320, display: 'block' }}>{text}</Text>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_: unknown, record: FraudFlagRecord) => {
        if (record.status === 'pending_review') {
          return <Tag color="processing">Chờ xem xét</Tag>;
        }
        if (record.status === 'approved') {
          return (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              Đã phê duyệt (An toàn)
            </Tag>
          );
        }
        return (
          <Tag color="error" icon={<CloseCircleOutlined />}>
            Xác nhận gian lận
          </Tag>
        );
      },
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_: unknown, record: FraudFlagRecord) => {
        if (record.status === 'pending_review') {
          return (
            <Button
              type="primary"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleOpenReviewModal(record)}
            >
              Xem xét & Xử lý
            </Button>
          );
        }
        return (
          <Tooltip title={record.reviewNote ? `Ghi chú: ${record.reviewNote}` : 'Đã xem xét'}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Bởi {record.reviewedBy?.fullName || 'Admin'}
            </Text>
          </Tooltip>
        );
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={3} style={{ marginBottom: 4 }}>
            <WarningOutlined style={{ color: '#fa8c16', marginRight: 8 }} />
            Giám sát & Phát hiện gian lận (Fraud Detection)
          </Title>
          <Text type="secondary">
            Tự động theo dõi các giao dịch có dấu hiệu bất thường (giao dịch dồn dập hoặc số tiền đột biến) để ban quản trị thẩm định.
          </Text>
        </div>

        <Card>
          <Space style={{ marginBottom: 16 }}>
            <Text strong>Lọc theo trạng thái:</Text>
            <Select
              value={statusFilter}
              onChange={handleStatusFilterChange}
              style={{ width: 200 }}
              allowClear
              placeholder="Tất cả trạng thái"
            >
              <Option value="pending_review">Chờ xem xét (Pending)</Option>
              <Option value="approved">Đã phê duyệt (An toàn)</Option>
              <Option value="rejected">Xác nhận gian lận (Rejected)</Option>
            </Select>
          </Space>

          <Table
            rowKey="id"
            columns={columns}
            dataSource={flags}
            loading={isLoading}
            pagination={{
              current: page,
              pageSize: pageSize,
              total: total,
              onChange: handlePageChange,
              showSizeChanger: true,
            }}
          />
        </Card>
      </Space>

      <Modal
        title="Xem xét & Đánh giá cảnh báo gian lận"
        open={isModalOpen}
        onCancel={handleCloseModal}
        onOk={() => form.submit()}
        confirmLoading={isReviewing}
        okText="Lưu kết quả"
        cancelText="Hủy bỏ"
      >
        {selectedFlag && (
          <div style={{ marginBottom: 16, padding: 12, background: '#f5f5f5', borderRadius: 6 }}>
            <div>
              <Text type="secondary">Tài khoản: </Text>
              <Text strong>{selectedFlag.account?.accountNumber}</Text>
            </div>
            <div>
              <Text type="secondary">Quy tắc vi phạm: </Text>
              <Text strong style={{ color: '#d46b08' }}>
                {selectedFlag.ruleName}
              </Text>
            </div>
            <div>
              <Text type="secondary">Chi tiết: </Text>
              <Text>{selectedFlag.reason}</Text>
            </div>
          </div>
        )}

        <Form form={form} layout="vertical" onFinish={handleSubmitReview}>
          <Form.Item
            name="status"
            label="Đánh giá kết quả"
            rules={[{ required: true, message: 'Vui lòng chọn quyết định xem xét' }]}
          >
            <Radio.Group>
              <Radio value="approved">
                <Text type="success" strong>
                  <CheckCircleOutlined /> An toàn (Giao dịch hợp lệ, bỏ qua cảnh báo)
                </Text>
              </Radio>
              <Radio value="rejected">
                <Text type="danger" strong>
                  <CloseCircleOutlined /> Bất thường / Gian lận (Cần xử lý)
                </Text>
              </Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item name="lockAccount" valuePropName="checked">
            <Checkbox>Khóa ngay tài khoản này để ngăn chặn giao dịch vi phạm tiếp theo</Checkbox>
          </Form.Item>

          <Form.Item name="reviewNote" label="Ghi chú thẩm định (Dấu vết Audit Trail)">
            <TextArea
              rows={3}
              placeholder="Nhập ghi chú hoặc lý do đưa ra quyết định duyệt/từ chối..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
