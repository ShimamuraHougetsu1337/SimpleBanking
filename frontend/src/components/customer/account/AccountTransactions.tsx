import { useState } from 'react';
import { Card, Space, List, Typography, Modal, Descriptions, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import api from '@/services/api';
import { useTransactionFilters } from '@/hooks/customer/useTransactionFilters';
import { TransactionFilters } from '@/components/customer/transactions/TransactionFilters';

const { Text } = Typography;

interface AccountTransactionsProps {
  accountId: string;
}

export function AccountTransactions({ accountId }: AccountTransactionsProps) {
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const {
    draftFilters,
    appliedFilters,
    filterParams,
    isFilterActive,
    handleDateRangeChange,
    handleKeywordChange,
    handleApplyFilters,
    handleResetFilters,
    handleRemoveDateRange,
    handleRemoveKeyword,
  } = useTransactionFilters();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', accountId, filterParams],
    queryFn: async () => {
      if (!accountId) return [];
      const params: any = { accountId, limit: 50 };

      if (filterParams.search) {
        params.search = filterParams.search;
      }
      if (filterParams.fromDate) {
        params.fromDate = filterParams.fromDate;
        params.toDate = filterParams.toDate;
      }

      const res = await api.get('/transactions', { params });
      return res.data.data;
    },
    enabled: !!accountId,
  });

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  return (
    <Card title="Lịch sử giao dịch" bordered={false} styles={{ body: { padding: '24px' } }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <TransactionFilters
          draftFilters={draftFilters}
          appliedFilters={appliedFilters}
          isFilterActive={isFilterActive}
          onDateRangeChange={handleDateRangeChange}
          onKeywordChange={handleKeywordChange}
          onApplyFilters={handleApplyFilters}
          onResetFilters={handleResetFilters}
          onRemoveDateRange={handleRemoveDateRange}
          onRemoveKeyword={handleRemoveKeyword}
        />

        <List
          dataSource={transactions}
          loading={isLoading}
          pagination={{ pageSize: 10, align: 'center' }}
          renderItem={(item: any) => {
            const isCredit = item.direction === 'credit';
            const amountNum = Number(item.amount);
            const formattedAmount = new Intl.NumberFormat('vi-VN', {
              style: 'currency',
              currency: 'VND',
            }).format(amountNum);

            const counterpartAcc = item.counterpartAccount || 'Hệ thống';
            const counterpartNm = item.counterpartName || 'Simple Bank';

            return (
              <List.Item
                onClick={() => setSelectedTx(item)}
                style={{
                  cursor: 'pointer',
                  padding: '16px 20px',
                  borderBottom: '1px solid #f1f5f9',
                  transition: 'background-color 0.15s ease',
                  borderRadius: 8,
                }}
                className="transaction-list-item"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <div style={{ textAlign: 'left' }}>
                    <Text strong style={{ fontSize: 14, color: '#334155', display: 'block', marginBottom: 2 }}>
                      {isCredit ? `TK gửi: ${counterpartAcc}` : `TK nhận: ${counterpartAcc}`}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 2, color: '#475569' }}>
                      {isCredit ? `Người gửi: ${counterpartNm}` : `Người nhận: ${counterpartNm}`}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                      Thời gian: {formatDate(item.createdAt)}
                    </Text>
                  </div>
                  <div>
                    <Text
                      strong
                      style={{
                        fontSize: 16,
                        color: isCredit ? '#10B981' : '#EF4444',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {isCredit ? '+' : '-'}{formattedAmount}
                    </Text>
                  </div>
                </div>
              </List.Item>
            );
          }}
        />
      </Space>

      <Modal
        title="Chi tiết giao dịch"
        open={!!selectedTx}
        onCancel={() => setSelectedTx(null)}
        footer={null}
        centered
        destroyOnClose
      >
        {selectedTx && (
          <div style={{ padding: '16px 0' }}>
            <Descriptions column={1} bordered size="middle">
              <Descriptions.Item label="Mã giao dịch">
                <Text copyable style={{ fontFamily: 'monospace' }}>{selectedTx.id}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Loại giao dịch">
                <Tag color={selectedTx.type === 'transfer' ? 'blue' : 'purple'}>
                  {selectedTx.type === 'transfer' ? 'Chuyển khoản' : selectedTx.type === 'deposit' ? 'Nạp tiền' : 'Rút tiền'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Số tài khoản đối tác">
                <Text style={{ fontFamily: 'monospace' }}>{selectedTx.counterpartAccount || 'N/A'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Tên đối tác">
                {selectedTx.counterpartName || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Số tiền">
                <Text type={selectedTx.direction === 'credit' ? 'success' : 'danger'} strong>
                  {selectedTx.direction === 'credit' ? '+' : '-'}{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(selectedTx.amount))}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Nội dung">
                {selectedTx.description || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Thời gian">
                {formatDate(selectedTx.createdAt)}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={selectedTx.status === 'completed' || selectedTx.status === 'success' ? 'green' : selectedTx.status === 'failed' ? 'red' : 'orange'}>
                  {selectedTx.status === 'completed' || selectedTx.status === 'success' ? 'THÀNH CÔNG' : selectedTx.status === 'failed' ? 'THẤT BẠI' : 'ĐANG XỬ LÝ'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>

      <style>{`
        .transaction-list-item:hover {
          background-color: #f8fafc;
        }
      `}</style>
    </Card>
  );
}
