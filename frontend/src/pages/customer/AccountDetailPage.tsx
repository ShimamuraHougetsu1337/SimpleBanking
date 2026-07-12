import { useParams, useNavigate } from 'react-router-dom';
import { Spin, Empty, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useAccountDetailQuery } from '@/hooks/customer/useAccountDetailQuery';
import { AccountTransactions } from '@/components/customer/account/transactions/AccountTransactions';

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: account, isLoading: accountLoading } = useAccountDetailQuery(id);

  if (accountLoading) {
    return <div style={{ textAlign: 'center', padding: '100px' }}><Spin size="large" /></div>;
  }

  if (!account) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Empty description="Không tìm thấy tài khoản" />
        <Button type="primary" onClick={() => navigate(-1)} style={{ marginTop: 20 }}>
          Quay lại
        </Button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 60 }}>
      <div style={{ textAlign: 'left', marginBottom: 20 }}>
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(-1)}
          style={{ padding: 0 }}
        >
          Quay lại
        </Button>
      </div>

      <AccountTransactions accountId={id as string} />
    </div>
  );
}
