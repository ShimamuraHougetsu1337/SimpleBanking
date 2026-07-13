import { useState } from 'react';
import { Card, Typography, Space, Button, Alert } from 'antd';
import {
  AuditOutlined,
  SyncOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useAdminReconciliation } from '@/hooks/admin/useAdminReconciliation';
import { useAuthStore } from '@/store/auth.store';
import { UserRole } from '@/constants/roles';
import { Navigate } from 'react-router-dom';
import dayjs from 'dayjs';
import type { ReconciliationReport } from '@/types/admin';
import { ReconciliationTable } from '@/components/admin/reconciliation/ReconciliationTable';
import { ReconciliationDetailsModal } from '@/components/admin/reconciliation/ReconciliationDetailsModal';

const { Title, Text } = Typography;

const CARD_SHADOW_STYLE = {
  boxShadow: '0 2px 5px -1px rgba(50, 50, 93, 0.25), 0 1px 3px -1px rgba(0, 0, 0, 0.3)',
  borderRadius: '12px',
  border: 'none',
  background: '#ffffff',
  height: '100%',
};

export default function AdminReconciliationPage() {
  const currentUser = useAuthStore((s) => s.user);
  const {
    reports,
    total,
    page,
    pageSize,
    isLoading,
    isTriggering,
    triggerReconciliation,
    handlePageChange,
  } = useAdminReconciliation();

  const [selectedReport, setSelectedReport] = useState<ReconciliationReport | null>(null);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);

  // Restrict access to SuperAdmin and Manager
  if (currentUser?.role !== UserRole.SUPERADMIN && currentUser?.role !== UserRole.MANAGER) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const handleOpenDetails = (report: ReconciliationReport) => {
    setSelectedReport(report);
    setIsDetailModalVisible(true);
  };

  const handleCloseDetails = () => {
    setSelectedReport(null);
    setIsDetailModalVisible(false);
  };

  // Check if latest report contains mismatch to display global alert banner
  const latestReport = reports[0];
  const hasMismatchInLatest = latestReport?.status === 'MISMATCH';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space size={12}>
          <AuditOutlined style={{ fontSize: 24, color: '#10B981' }} />
          <Title level={2} style={{ margin: 0, color: '#1e293b' }}>
            Đối soát số dư cuối ngày
          </Title>
        </Space>
        <Button
          type="primary"
          icon={<SyncOutlined spin={isTriggering} />}
          loading={isTriggering}
          onClick={triggerReconciliation}
          style={{ background: '#10B981', borderColor: '#10B981', borderRadius: 8 }}
        >
          Kích hoạt đối soát ngay
        </Button>
      </div>

      {/* Warning banner if latest reconciliation shows errors */}
      {hasMismatchInLatest && (
        <Alert
          message={
            <Text strong style={{ color: '#991B1B' }}>
              CẢNH BÁO SAI LỆCH SỐ DƯ TÀI KHOẢN
            </Text>
          }
          description={
            <div>
              Phát hiện {latestReport.mismatchCount} tài khoản bị lệch số dư giữa số dư tài khoản lưu trữ và tổng giao dịch trong sổ cái vào lúc{' '}
              {dayjs(latestReport.checkedAt).format('HH:mm:ss DD/MM/YYYY')}. Quản trị viên vui lòng kiểm tra chi tiết các tài khoản này bên dưới.
            </div>
          }
          type="error"
          showIcon
          icon={<ExclamationCircleOutlined />}
          style={{ borderRadius: 8 }}
        />
      )}

      {/* Main card & table */}
      <Card style={CARD_SHADOW_STYLE} styles={{ body: { padding: '24px' } }}>
        <ReconciliationTable
          reports={reports}
          isLoading={isLoading}
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={handlePageChange}
          onOpenDetails={handleOpenDetails}
        />
      </Card>

      {/* Mismatched Account Details Modal */}
      <ReconciliationDetailsModal
        open={isDetailModalVisible}
        report={selectedReport}
        onCancel={handleCloseDetails}
      />
    </div>
  );
}
