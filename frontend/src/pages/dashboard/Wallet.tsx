import React, { useEffect, useRef, useState } from 'react';
import {
  Card, Row, Col, Statistic, Button, Form, Input, InputNumber,
  Modal, Alert, Table, Tag, Typography, Space, Divider,
} from 'antd';
import {
  WalletOutlined, MobileOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ArrowUpOutlined, ArrowDownOutlined, ReloadOutlined, LoadingOutlined,
  PhoneOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import CountUp from '../../components/common/CountUp';
import { Wallet as WalletType, Transaction } from '../../types';

const { Title, Text } = Typography;

type TopupStep = 'amount' | 'waiting' | 'success' | 'failed';

const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];
const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS = 120_000;

// Normalize any local KE number variant to 2547XXXXXXXX
function normalizeKEPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('254') && digits.length === 12) return digits;
  if (digits.startsWith('0') && digits.length === 10) return '254' + digits.slice(1);
  if (digits.length === 9) return '254' + digits;
  return digits; // let the server validate/reject
}

const Wallet: React.FC = () => {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [topupOpen, setTopupOpen] = useState(false);
  const [topupStep, setTopupStep] = useState<TopupStep>('amount');
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupError, setTopupError] = useState('');
  const [pendingTxId, setPendingTxId] = useState('');
  const [pendingPhone, setPendingPhone] = useState('');
  const [pendingAmount, setPendingAmount] = useState(0);
  const [countdown, setCountdown] = useState(120);
  const [form] = Form.useForm();

  // Keep interval refs so we can clean them up on modal close / unmount
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadData();
    return () => stopPolling();
  }, []);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [w, t] = await Promise.all([
        api.get('/wallet/'),
        api.get('/wallet/transactions'),
      ]);
      setWallet(w.data.wallet);
      setTransactions(t.data.transactions);
    } finally { setLoading(false); }
  };

  const openTopup = () => {
    form.resetFields();
    // Pre-fill phone from user profile
    if (user?.phone) form.setFieldValue('phone', user.phone);
    setTopupStep('amount');
    setTopupError('');
    setTopupOpen(true);
  };

  const closeTopup = async () => {
    // Cancel pending transaction if user closes mid-flow
    if (topupStep === 'waiting' && pendingTxId) {
      try { await api.post(`/wallet/topup/cancel/${pendingTxId}`); } catch { /* best-effort */ }
      loadData();
    }
    stopPolling();
    setTopupOpen(false);
  };

  const startPolling = (txId: string) => {
    const poll = async () => {
      try {
        const r = await api.get(`/wallet/topup/status/${txId}`);
        const tx: Transaction = r.data.transaction;
        if (tx.status === 'completed') {
          stopPolling();
          setTopupStep('success');
          loadData();
        } else if (tx.status === 'failed' || tx.status === 'cancelled') {
          stopPolling();
          setTopupStep('failed');
          setTopupError((r.data.transaction as { failure_reason?: string }).failure_reason || 'Payment failed or timed out');
        }
      } catch { /* network hiccup — retry next tick */ }
    };

    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);

    // Hard timeout — mark failed locally if still pending after 2 min
    timeoutRef.current = setTimeout(() => {
      stopPolling();
      if (topupStep === 'waiting') {
        setTopupStep('failed');
        setTopupError('No response from Safaricom after 2 minutes. Check your M-Pesa messages and try again.');
      }
    }, POLL_TIMEOUT_MS);

    // Countdown display
    let remaining = 120;
    setCountdown(remaining);
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
      }
    }, 1000);
  };

  const handleTopup = async (values: { amount: number; phone: string }) => {
    setTopupLoading(true);
    setTopupError('');
    try {
      const normalizedPhone = normalizeKEPhone(values.phone);
      const resp = await api.post('/wallet/topup', {
        amount: Math.floor(values.amount), // M-Pesa requires integer amounts
        phone: normalizedPhone,
      });
      setPendingTxId(resp.data.transaction_id);
      setPendingPhone(normalizedPhone);
      setPendingAmount(Math.floor(values.amount));
      setTopupStep('waiting');
      startPolling(resp.data.transaction_id);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setTopupError(err.response?.data?.error || 'Failed to initiate payment. Check your M-Pesa credentials.');
    } finally { setTopupLoading(false); }
  };

  const handleCancel = async () => {
    stopPolling();
    if (pendingTxId) {
      try { await api.post(`/wallet/topup/cancel/${pendingTxId}`); } catch { /* best-effort */ }
    }
    setTopupStep('amount');
    setTopupError('');
    loadData();
  };

  const formatPhone = (phone: string) =>
    phone ? `+${phone.replace(/(\d{3})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4')}` : phone;

  const columns = [
    {
      title: 'Date',
      dataIndex: 'created_at',
      render: (d: string) => new Date(d).toLocaleString('en-KE'),
    },
    {
      title: 'Type',
      dataIndex: 'transaction_type',
      render: (t: string) => (
        <Tag color={t === 'topup' ? 'green' : t === 'refund' ? 'blue' : 'red'}
          icon={t === 'topup' ? <ArrowUpOutlined /> : <ArrowDownOutlined />}>
          {t.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Amount (KES)',
      dataIndex: 'amount',
      render: (a: number, row: Transaction) => (
        <Text style={{ fontWeight: 700, color: row.transaction_type === 'topup' ? '#52c41a' : row.transaction_type === 'refund' ? '#1890ff' : '#ff4d4f' }}>
          {row.transaction_type === 'topup' ? '+' : row.transaction_type === 'refund' ? '+' : '−'}{Number(a).toFixed(2)}
        </Text>
      ),
    },
    {
      title: 'Balance After',
      dataIndex: 'balance_after',
      render: (b: number) => b != null ? (
        <Text style={{ fontWeight: 600 }}>KES {Number(b).toFixed(2)}</Text>
      ) : '—',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (s: string) => (
        <Tag color={s === 'completed' ? 'green' : s === 'pending' ? 'orange' : s === 'cancelled' ? 'default' : 'red'}>
          {s.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'M-Pesa Phone',
      dataIndex: 'mpesa_phone',
      render: (p: string) => p ? <Text type="secondary">{formatPhone(p)}</Text> : '—',
    },
    {
      title: 'Receipt',
      dataIndex: 'mpesa_receipt_number',
      render: (r: string) => r ? (
        <Tag color="blue" style={{ fontFamily: 'monospace' }}>{r}</Tag>
      ) : '—',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      render: (d: string) => <Text type="secondary" style={{ fontSize: 12 }}>{d || '—'}</Text>,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Wallet</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>Refresh</Button>
          <Button type="primary" icon={<WalletOutlined />} onClick={openTopup}>
            Top Up Wallet
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={10} lg={8}>
          <Card
            variant="borderless"
            style={{ borderRadius: 16, background: 'linear-gradient(135deg, #1890ff 0%, #003580 100%)' }}
          >
            <div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>Available Balance</div>
              <div style={{ color: '#fff', fontSize: 38, fontWeight: 800 }}>
                {!loading ? (
                  <CountUp end={wallet?.balance ?? 0} duration={900} decimals={2} formatter={(n) => `KES ${n.toFixed(2)}`} />
                ) : (
                  '—'
                )}
              </div>
            </div>
            <Divider style={{ borderColor: 'rgba(255,255,255,0.2)', margin: '14px 0 10px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}>
                Last updated: {wallet ? new Date(wallet.updated_at).toLocaleString('en-KE') : '—'}
              </Text>
              <Button
                size="small"
                type="text"
                icon={<ReloadOutlined />}
                style={{ color: 'rgba(255,255,255,0.7)' }}
                onClick={loadData}
              />
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={14} lg={16}>
          <Card variant="borderless" style={{ borderRadius: 16, height: '100%' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: 'linear-gradient(135deg, #e6f7e6, #b7eb8f)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <MobileOutlined style={{ fontSize: 24, color: '#389e0d' }} />
              </div>
              <div>
                <Title level={5} style={{ margin: '0 0 6px' }}>Lipa Na M-Pesa</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Fund your wallet instantly using <strong>M-Pesa STK Push</strong>. Enter your phone number and amount — a payment prompt will appear on your phone. Enter your M-Pesa PIN to confirm.
                </Text>
                <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['Instant', 'Secure', 'Min KES 100', 'Safaricom'].map(label => (
                    <Tag key={label} color="green" style={{ borderRadius: 20 }}>✓ {label}</Tag>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card title="Transaction History" variant="borderless" style={{ borderRadius: 16 }}>
        <Table
          dataSource={transactions}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, showTotal: (t) => `${t} transactions` }}
          scroll={{ x: 900 }}
          locale={{ emptyText: 'No transactions yet' }}
        />
      </Card>

      {/* ── Top Up Modal ── */}
      <Modal
        open={topupOpen}
        onCancel={closeTopup}
        footer={null}
        title={
          <Space>
            <MobileOutlined style={{ color: '#52c41a' }} />
            Top Up via M-Pesa
          </Space>
        }
        width={460}
        centered
        maskClosable={topupStep === 'amount'}
        destroyOnHidden
      >
        {/* ── Step 1: Amount & Phone ── */}
        {topupStep === 'amount' && (
          <>
            {topupError && (
              <Alert message={topupError} type="error" showIcon style={{ marginBottom: 16 }} closable onClose={() => setTopupError('')} />
            )}
            <Form form={form} onFinish={handleTopup} layout="vertical" size="large">
              <Form.Item
                name="phone"
                label="M-Pesa Phone Number"
                rules={[
                  { required: true, message: 'Phone number is required' },
                  {
                    validator(_, value) {
                      const n = normalizeKEPhone(value || '');
                      if (n.length >= 12) return Promise.resolve();
                      return Promise.reject(new Error('Enter a valid Safaricom number (07XX, 01XX, or +254XXX)'));
                    },
                  },
                ]}
                extra="Accepts: 0712345678 · +254712345678 · 254712345678"
              >
                <Input
                  prefix={<PhoneOutlined />}
                  placeholder="0712 345 678"
                  allowClear
                />
              </Form.Item>

              <Form.Item name="amount" label="Amount (KES)" rules={[
                { required: true, message: 'Amount is required' },
                { type: 'number', min: 100, message: 'Minimum is KES 100' },
                { type: 'number', max: 300_000, message: 'Maximum is KES 300,000' },
              ]}>
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="e.g. 500"
                  min={100}
                  max={300_000}
                  formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={v => Number((v || '').replace(/,/g, '')) as unknown as 100}
                  precision={0}
                />
              </Form.Item>

              {/* Quick-amount chips */}
              <div style={{ marginBottom: 20 }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>Quick amounts</Text>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {QUICK_AMOUNTS.map(amt => (
                    <Button
                      key={amt}
                      size="small"
                      style={{ borderRadius: 20, fontWeight: 600 }}
                      onClick={() => form.setFieldValue('amount', amt)}
                    >
                      {amt.toLocaleString()}
                    </Button>
                  ))}
                </div>
              </div>

              <div style={{
                background: '#f6ffed', border: '1px solid #b7eb8f',
                borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13,
              }}>
                <MobileOutlined style={{ color: '#52c41a', marginRight: 6 }} />
                A <strong>Safaricom STK Push</strong> notification will appear on your phone.
                Enter your <strong>M-Pesa PIN</strong> to complete the payment.
              </div>

              <Button type="primary" htmlType="submit" loading={topupLoading} block size="large">
                Send STK Push
              </Button>
            </Form>
          </>
        )}

        {/* ── Step 2: Waiting for PIN ── */}
        {topupStep === 'waiting' && (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', margin: '0 auto 20px',
              background: 'linear-gradient(135deg, #e6f7e6, #b7eb8f)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <MobileOutlined style={{ fontSize: 36, color: '#389e0d' }} />
            </div>

            <Title level={4} style={{ margin: '0 0 8px' }}>Check Your Phone</Title>
            <Text type="secondary" style={{ fontSize: 14 }}>
              An M-Pesa payment request of <strong>KES {pendingAmount.toLocaleString()}</strong> was
              sent to <strong>{formatPhone(pendingPhone)}</strong>.
            </Text>

            <div style={{
              margin: '20px auto',
              width: 64, height: 64, borderRadius: '50%',
              border: `4px solid #f0f0f0`,
              borderTop: `4px solid #1890ff`,
              animation: 'spin 1s linear infinite',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <LoadingOutlined style={{ fontSize: 22, color: '#1890ff' }} />
            </div>

            <div style={{ margin: '0 0 8px', color: '#595959', fontSize: 13 }}>
              Waiting for payment confirmation…
            </div>
            <div style={{
              fontSize: 28, fontWeight: 800,
              color: countdown <= 30 ? '#ff4d4f' : '#1890ff',
              lineHeight: 1,
            }}>
              {countdown}s
            </div>
            <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>remaining</div>

            <Divider style={{ margin: '20px 0 16px' }} />

            <div style={{ color: '#595959', fontSize: 13, marginBottom: 16 }}>
              Didn't receive the prompt? Check your M-Pesa app or Safaricom messages.
            </div>

            <Button danger onClick={handleCancel}>
              Cancel Payment
            </Button>
          </div>
        )}

        {/* ── Step 3a: Success ── */}
        {topupStep === 'success' && (
          <div style={{ textAlign: 'center', padding: '40px 16px' }}>
            <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a', marginBottom: 16 }} />
            <Title level={4} style={{ margin: '0 0 8px' }}>Payment Successful!</Title>
            <Text type="secondary">
              KES {pendingAmount.toLocaleString()} has been added to your wallet.
            </Text>
            <Button type="primary" block size="large" style={{ marginTop: 28 }} onClick={() => setTopupOpen(false)}>
              Done
            </Button>
          </div>
        )}

        {/* ── Step 3b: Failed ── */}
        {topupStep === 'failed' && (
          <div style={{ textAlign: 'center', padding: '40px 16px' }}>
            <CloseCircleOutlined style={{ fontSize: 64, color: '#ff4d4f', marginBottom: 16 }} />
            <Title level={4} style={{ margin: '0 0 8px' }}>Payment Failed</Title>
            <Text type="secondary">{topupError}</Text>

            <Divider />
            <Space>
              <Button onClick={() => { setTopupStep('amount'); setTopupError(''); }}>
                Try Again
              </Button>
              <Button type="primary" onClick={() => setTopupOpen(false)}>
                Close
              </Button>
            </Space>
          </div>
        )}
      </Modal>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default Wallet;
