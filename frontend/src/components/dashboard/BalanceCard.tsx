import { Card, Typography } from 'antd';
import { CreditCardOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface BalanceCardProps {
  accountNumber: string;
  name?: string;
  balance: number;
  owner: string;
  currency?: string;
  themeGradient?: string;
}

export function BalanceCard({ accountNumber, name, balance, owner, currency = 'VND', themeGradient }: BalanceCardProps) {
  const formatVND = (amount: number | string) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency }).format(Number(amount));
  };

  return (
    <Card 
      variant="borderless" 
      style={{ 
        // A premium dark theme (pure black and very dark slate) with gold/champagne accents by default
        background: themeGradient || 'linear-gradient(135deg, #111827 0%, #000000 100%)', 
        borderRadius: 16,
        color: 'white',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden',
        position: 'relative'
      }}
      styles={{ body: { padding: 32 } }}
    >
      {/* Decorative Background Elements for a luxury feel */}
      <div style={{ position: 'absolute', top: -50, right: -50, width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.15) 0%, rgba(0,0,0,0) 70%)' }}></div>
      <div style={{ position: 'absolute', bottom: -50, left: -50, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0) 70%)' }}></div>

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, textTransform: 'uppercase', letterSpacing: 2 }}>
              {name || 'Available Balance'}
            </Text>
            <div style={{ marginTop: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 42, color: '#F3F4F6', letterSpacing: '-0.5px' }}>
                {formatVND(balance)}
              </span>
            </div>
          </div>
          <CreditCardOutlined style={{ fontSize: 32, color: '#D4AF37' }} /> {/* Gold icon accent */}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Account Number</Text>
            <Text style={{ color: '#E5E7EB', fontSize: 18, fontWeight: 600, letterSpacing: 3, fontFamily: 'monospace' }}>{accountNumber}</Text>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Card Holder</Text>
            <Text style={{ color: '#E5E7EB', fontSize: 16, fontWeight: 500, letterSpacing: 1, textTransform: 'uppercase' }}>{owner}</Text>
          </div>
        </div>
      </div>
    </Card>
  );
}
