import { Modal, Button, Typography } from 'antd';

const { Title, Text } = Typography;

interface TransferReviewModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
  pendingValues: any;
  selectedAccount: any;
  receiver: any;
}

export function TransferReviewModal({
  isOpen,
  onConfirm,
  onCancel,
  isPending,
  pendingValues,
  selectedAccount,
  receiver
}: TransferReviewModalProps) {
  const formatVND = (num: number | string) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(num));

  return (
    <Modal
      title={null}
      open={isOpen}
      onOk={onConfirm}
      onCancel={onCancel}
      confirmLoading={isPending}
      footer={[
        <Button key="back" onClick={onCancel} disabled={isPending} size="large" style={{ borderRadius: 8, padding: '0 24px' }}>
          Cancel
        </Button>,
        <Button key="submit" type="primary" loading={isPending} onClick={onConfirm} size="large" style={{ background: '#04162e', borderColor: '#04162e', borderRadius: 8, padding: '0 24px' }}>
          Confirm
        </Button>,
      ]}
      width={450}
      centered
      styles={{ body: { padding: '16px 16px 8px 16px', backgroundColor: '#fafafa' } }}
      closeIcon={true}
    >
      {pendingValues && selectedAccount && receiver && (
        <div>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <Title level={4} style={{ margin: 0, color: '#04162e', fontWeight: 700 }}>Review Transfer</Title>
            <Text type="secondary" style={{ fontSize: 13 }}>Please verify your transaction details</Text>
          </div>

          {/* 1. Sender Information */}
          <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: 12 }}>
            <div style={{ background: '#04162e', color: 'white', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>1. Sender Information</span>
              <span style={{ opacity: 0.7 }}><i className="anticon"><svg viewBox="64 64 896 896" focusable="false" data-icon="user" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M858.5 763.6a374 374 0 00-80.6-119.5 375.6 375.6 0 00-119.5-80.6c-.4-.2-.8-.3-1.2-.5C719.5 518 760 444.7 760 362c0-137-111-248-248-248S264 225 264 362c0 82.7 40.5 156 102.8 201.1-.4.2-.8.3-1.2.5-44.8 18.9-85 46-119.5 80.6a375.6 375.6 0 00-80.6 119.5A371.7 371.7 0 00136 901.8a8 8 0 008 8.2h60c4.4 0 7.9-3.5 8-7.8 2-77.2 33-149.5 87.8-204.3 56.7-56.7 132-87.9 212.2-87.9s155.5 31.2 212.2 87.9C779 752.7 810 825 812 902.2c.1 4.4 3.6 7.8 8 7.8h60a8 8 0 008-8.2c-1-47.8-10.9-94.3-29.5-138.2zM512 534c-45.9 0-89.1-17.9-121.6-50.4S340 407.9 340 362c0-45.9 17.9-89.1 50.4-121.6S466.1 190 512 190s89.1 17.9 121.6 50.4S684 316.1 684 362c0 45.9-17.9 89.1-50.4 121.6S557.9 534 512 534z"></path></svg></i></span>
            </div>
            <div style={{ padding: '2px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 16px' }}>
                <span style={{ color: '#666', fontSize: 13 }}>Sender Name:</span>
                <span style={{ color: '#222', fontSize: 13, fontWeight: 500 }}>{selectedAccount.user?.fullName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 16px' }}>
                <span style={{ color: '#666', fontSize: 13 }}>Account Number:</span>
                <span style={{ color: '#222', fontSize: 13, fontWeight: 500 }}>{selectedAccount.accountNumber}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 16px' }}>
                <span style={{ color: '#666', fontSize: 13 }}>Current Balance:</span>
                <span style={{ color: '#222', fontSize: 13, fontWeight: 500 }}>{formatVND(selectedAccount.balance)}</span>
              </div>
            </div>
          </div>

          {/* 2. Receiver Information */}
          <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: 12 }}>
            <div style={{ background: '#04162e', color: 'white', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>2. Receiver Information</span>
              <span style={{ opacity: 0.7 }}><i className="anticon"><svg viewBox="64 64 896 896" focusable="false" data-icon="user" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M858.5 763.6a374 374 0 00-80.6-119.5 375.6 375.6 0 00-119.5-80.6c-.4-.2-.8-.3-1.2-.5C719.5 518 760 444.7 760 362c0-137-111-248-248-248S264 225 264 362c0 82.7 40.5 156 102.8 201.1-.4.2-.8.3-1.2.5-44.8 18.9-85 46-119.5 80.6a375.6 375.6 0 00-80.6 119.5A371.7 371.7 0 00136 901.8a8 8 0 008 8.2h60c4.4 0 7.9-3.5 8-7.8 2-77.2 33-149.5 87.8-204.3 56.7-56.7 132-87.9 212.2-87.9s155.5 31.2 212.2 87.9C779 752.7 810 825 812 902.2c.1 4.4 3.6 7.8 8 7.8h60a8 8 0 008-8.2c-1-47.8-10.9-94.3-29.5-138.2zM512 534c-45.9 0-89.1-17.9-121.6-50.4S340 407.9 340 362c0-45.9 17.9-89.1 50.4-121.6S466.1 190 512 190s89.1 17.9 121.6 50.4S684 316.1 684 362c0 45.9-17.9 89.1-50.4 121.6S557.9 534 512 534z"></path></svg></i></span>
            </div>
            <div style={{ padding: '2px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 16px' }}>
                <span style={{ color: '#666', fontSize: 13 }}>Receiver Name:</span>
                <span style={{ color: '#222', fontSize: 13, fontWeight: 500 }}>{receiver.ownerName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 16px', alignItems: 'center' }}>
                <span style={{ color: '#666', fontSize: 13 }}>Account Number:</span>
                <span style={{ color: '#222', fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ display: 'inline-flex', background: '#f0f0f0', padding: 4, borderRadius: 4 }}>
                    <svg viewBox="64 64 896 896" focusable="false" width="10px" height="10px" fill="currentColor"><path d="M894 462c3.1 3.1 4.6 7.1 4.6 11.2V548c0 8.8-7.2 16-16 16H141.5c-8.8 0-16-7.2-16-16v-74.8c0-4.1 1.6-8.1 4.6-11.2l363.3-363.3c7.2-7.2 18.9-7.2 26.1 0L894 462zM770 636H254c-4.4 0-8 3.6-8 8v242c0 4.4 3.6 8 8 8h516c4.4 0 8-3.6 8-8V644c0-4.4-3.6-8-8-8z" /></svg>
                  </span>
                  {receiver.accountNumber}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Transaction Details & Total */}
          <div style={{ background: 'white', borderRadius: 12, overflow: 'visible', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', position: 'relative', marginBottom: 16 }}>
            <div style={{ background: '#04162e', color: 'white', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>3. Transaction Details</span>
              <span style={{ opacity: 0.7 }}><i className="anticon"><svg viewBox="64 64 896 896" focusable="false" width="1em" height="1em" fill="currentColor"><path d="M880 184H144c-17.7 0-32 14.3-32 32v592c0 17.7 14.3 32 32 32h736c17.7 0 32-14.3 32-32V216c0-17.7-14.3-32-32-32zm-40 584H184V256h656v512zM388 406c0-15.5 12.5-28 28-28h192c15.5 0 28 12.5 28 28v144c0 15.5-12.5 28-28 28H416c-15.5 0-28-12.5-28-28V406zm60 88h128v-32H448v32z" /></svg></i></span>
            </div>

            <div style={{ padding: '4px 0 20px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 16px' }}>
                <span style={{ color: '#666', fontSize: 13 }}>Amount:</span>
                <span style={{ color: '#222', fontSize: 13, fontWeight: 500 }}>{formatVND(pendingValues.amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 16px' }}>
                <span style={{ color: '#666', fontSize: 13 }}>Service Fee:</span>
                <span style={{ color: '#222', fontSize: 13, fontWeight: 500 }}>Free</span>
              </div>
              {pendingValues.description && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 16px' }}>
                  <span style={{ color: '#666', fontSize: 13 }}>Description:</span>
                  <span style={{ color: '#222', fontSize: 13, fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>{pendingValues.description}</span>
                </div>
              )}
            </div>

            {/* Total overlay block */}
            <div style={{
              position: 'relative',
              background: '#04162e',
              borderRadius: 12,
              padding: '12px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 8px 16px rgba(0,21,41,0.2)',
              marginTop: -16,
              marginLeft: 16,
              marginRight: 16,
              marginBottom: -16,
              zIndex: 10
            }}>
              <span style={{ fontSize: 14, color: 'white', fontWeight: 500 }}>Total Amount</span>
              <span style={{ fontSize: 20, color: '#f76b1c', fontWeight: 600 }}>{formatVND(pendingValues.amount)}</span>
            </div>
          </div>

          <div style={{ height: 16 }}></div>
        </div>
      )}
    </Modal>
  );
}
