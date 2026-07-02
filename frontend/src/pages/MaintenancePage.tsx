import { Result, Button } from 'antd';
import { ToolOutlined } from '@ant-design/icons';

export default function MaintenancePage() {

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <Result
        icon={<ToolOutlined style={{ color: '#F59E0B' }} />}
        title="Hệ thống đang bảo trì"
        subTitle="Chúng tôi đang tiến hành nâng cấp hệ thống để mang lại trải nghiệm tốt hơn. Vui lòng quay lại sau ít phút."
        extra={[
          <Button type="primary" key="console" onClick={() => window.location.href = '/'}>
            Thử lại
          </Button>
        ]}
      />
    </div>
  );
}
