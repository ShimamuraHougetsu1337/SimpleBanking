import { Card, Typography, Space, Select } from 'antd';
import { useAdminTransactionRequests } from '@/hooks/admin/useAdminTransactionRequests';
import { useAuthStore } from '@/store/auth.store';
import { useState } from 'react';
import { TransactionRequestTable } from '@/components/admin/requests/TransactionRequestTable';
import { RejectRequestModal } from '@/components/admin/requests/RejectRequestModal';

const { Title, Text } = Typography;

const CARD_SHADOW_STYLE = {
  boxShadow: '0 2px 5px -1px rgba(50, 50, 93, 0.25), 0 1px 3px -1px rgba(0, 0, 0, 0.3)',
  borderRadius: '12px',
  border: 'none',
  background: '#ffffff',
};

export default function AdminTransactionRequestsPage() {
  const {
    requests,
    total,
    page,
    pageSize,
    statusFilter,
    handlePageChange,
    handleStatusFilterChange,
    isLoading,
    approveRequest,
    isApproving,
    rejectRequest,
    isRejecting,
  } = useAdminTransactionRequests();

  const currentUser = useAuthStore((s) => s.user);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingRecordId, setRejectingRecordId] = useState<string | null>(null);

  const openRejectModal = (id: string) => {
    setRejectingRecordId(id);
    setRejectModalOpen(true);
  };

  const closeRejectModal = () => {
    setRejectModalOpen(false);
    setRejectingRecordId(null);
  };

  const handleRejectConfirm = (reason: string) => {
    if (rejectingRecordId) {
      rejectRequest(
        { id: rejectingRecordId, rejectionReason: reason },
        {
          onSuccess: () => {
            closeRejectModal();
          },
        }
      );
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={2} style={{ margin: 0, color: '#1e293b' }}>Yêu Cầu Giao Dịch</Title>
          <Text type="secondary">Quản lý duyệt giao dịch Nạp/Rút hạn mức lớn (Maker-Checker)</Text>
        </div>
        <Space>
          <Select
            placeholder="Lọc theo trạng thái"
            style={{ width: 180, height: 40 }}
            allowClear
            value={statusFilter}
            onChange={handleStatusFilterChange}
            options={[
              { value: 'pending', label: 'Đang chờ duyệt' },
              { value: 'approved', label: 'Đã duyệt' },
              { value: 'rejected', label: 'Đã từ chối' },
              { value: 'auto_approved', label: 'Duyệt tự động' },
            ]}
          />
        </Space>
      </div>

      <Card style={CARD_SHADOW_STYLE} styles={{ body: { padding: 0, overflow: 'hidden' } }}>
        <TransactionRequestTable
          requests={requests}
          page={page}
          pageSize={pageSize}
          total={total}
          isLoading={isLoading}
          onPageChange={handlePageChange}
          currentUser={currentUser || undefined}
          onApprove={approveRequest}
          isApproving={isApproving}
          onOpenRejectModal={openRejectModal}
        />
      </Card>

      <RejectRequestModal
        open={rejectModalOpen}
        onCancel={closeRejectModal}
        onConfirm={handleRejectConfirm}
        isConfirming={isRejecting}
      />
    </div>
  );
}
