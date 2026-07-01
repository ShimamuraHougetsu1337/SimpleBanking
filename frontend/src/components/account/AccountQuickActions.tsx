import { Button } from 'antd';
import { VerticalAlignBottomOutlined, VerticalAlignTopOutlined, SwapOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

interface AccountQuickActionsProps {
  onDeposit: () => void;
  onWithdraw: () => void;
}

export function AccountQuickActions({ onDeposit, onWithdraw }: AccountQuickActionsProps) {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
      <Button 
        type="primary" 
        icon={<VerticalAlignBottomOutlined />} 
        size="large"
        onClick={onDeposit}
        style={{ flex: 1, borderRadius: 8, background: '#10B981', borderColor: '#10B981' }}
      >
        Nạp tiền
      </Button>
      <Button 
        type="primary" 
        icon={<VerticalAlignTopOutlined />} 
        size="large"
        onClick={onWithdraw}
        style={{ flex: 1, borderRadius: 8, background: '#F43F5E', borderColor: '#F43F5E' }}
      >
        Rút tiền
      </Button>
      <Button 
        type="default" 
        icon={<SwapOutlined />} 
        size="large"
        onClick={() => navigate('/transfer')}
        style={{ flex: 1, borderRadius: 8 }}
      >
        Chuyển tiền
      </Button>
    </div>
  );
}
