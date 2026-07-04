import React, { useEffect, useState } from 'react';
import {
  Card, Row, Col, Statistic, Button, Form, Input, InputNumber,
  Modal, Alert, Table, Tag, Typography, Space, Divider, Steps,
} from 'antd';
import {
  WalletOutlined, MobileOutlined, CheckCircleOutlined,
  ArrowUpOutlined, ArrowDownOutlined, ReloadOutlined,
} from '@ant-design/icons';
import api from '../../services/api';
import { Wallet as WalletType, Transaction } from '../../types';

const { Title, Text } = Typography;

type TopupStep = 'amount' | 'waiting' | 'success' | 'failed';

const Wallet: React.FC = () => {
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [topupOpen, setTopupOpen] = useState(false);
  const [topupStep, setTopupStep] = useState<TopupStep>('amount');
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupError, setTopupError] = useState('');
  const [pendingTxId, setPendingTxId] = useState('');
  const [form] = Form.useForm();

  useEffect(() => { loadData(); }, []);

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

  const handleTopup = async (values: { amount: number; phone: string }) => {
    setTopupLoading(true);
    setTopupError('');
    try {
      const resp = await api.post('/wallet/topup', values);
      setPendingTxId(resp.data.transaction_id);
      setTopupStep('waiting');

      // Poll for status
      const interval = setInterval(async () => {
        const statusResp = await api.get(`/wallet/topup/status/${resp.data.transaction_id}`);
        const tx = statusResp.data.transaction;
        if (tx.status === 'completed') {
          clearInterval(interval);
          setTopupStep('success');
          loadData();
        } else if (tx.status === 'failed') {
          clearInterval(interval);
          setTopupStep('failed');
          setTopupError(tx.failure_reason || 'Payment failed');
        }
      }, 3000);

      setTimeout(() => clearInterval(interval), 120000); // 2min timeout
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setTopupError(err.response?.data?.error || 'Failed to initiate payment');
    } finally { setTopupLoading(false); }
  };

  const columns = [
    {
      title: 'Date',
      dataIndex: 'created_at',
      render: (d: string) => new Date(d).toLocaleString(),
    },
    {
      title: 'Type',
      dataIndex: 'transaction_type',
      render: (t: string) => (
        <Tag color={t === 'topup' ? 'green' : t === 'debit' ? 'red' : 'blue'} icon={
          t === 'topup' ? <ArrowUpOutlined /> : <ArrowDownOutlined />
        }>
          {t.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Amount (KES)',
      dataIndex: 'amount',
      render: (a: number, row: Transaction) => (
        <Text style={{ fontWeight: 600, color: row.transaction_type === 'topup' ? '#52c41a' : '#ff4d4f' }}>
          {row.transaction_type === 'topup' ? '+' : '-'}{a.toFixed(2)}
        </Text>
      ),
    },
    {
      title: 'Balance After',
      dataIndex: 'balance_after',
      render: (b: number) => b != null ? `KES ${b.toFixed(2)}` : '—',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (s: string) => (
        <Tag color={s === 'completed' ? 'green' : s === 'pending' ? 'orange' : 'red'}>
          {s.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
    },
    {
      title: 'M-Pesa Receipt',
      dataIndex: 'mpesa_receipt_number',
      render: (r: string) => r || '—',
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Wallet</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadData}>Refresh</Button>
          <Button type="primary" icon={<WalletOutlined />} onClick={() => { setTopupOpen(true); setTopupStep('amount'); setTopupError(''); }}>
            Top Up Wallet
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={8}>
          <Card
            bordered={false}
            style={{ borderRadius: 16, background: 'linear-gradient(135deg, #1890ff, #0050b3)', color: '#fff' }}
          >
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.8)' }}>Available Balance</span>}
              value={wallet?.balance || 0}
              precision={2}
              suffix="KES"
              valueStyle={{ color: '#fff', fontSize: 36, fontWeight: 800 }}
              loading={loading}
            />
            <Divider style={{ borderColor: 'rgba(255,255,255,0.2)', margin: '12px 0' }} />
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
              Last updated: {wallet ? new Date(wallet.updated_at).toLocaleString() : '—'}
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={16}>
          <Card bordered={false} style={{ borderRadius: 16, height: '100%' }}>
            <Title level={5}>M-Pesa Top Up</Title>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <MobileOutlined style={{ fontSize: 32, color: '#52c41a', marginTop: 4 }} />
              <div>
                <p style={{ margin: 0, color: '#595959' }}>
                  Fund your wallet exclusively using <strong>Lipa Na M-Pesa</strong> (STK Push).
                  Enter your M-Pesa registered phone number and amount. You'll receive a push notification to confirm the payment.
                </p>
                <Space style={{ marginTop: 12 }}>
                  <Tag color="green">✓ Instant</Tag>
                  <Tag color="green">✓ Secure</Tag>
                  <Tag color="green">✓ Min KES 100</Tag>
                </Space>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Transactions Table */}
      <Card title="Transaction History" bordered={false} style={{ borderRadius: 16 }}>
        <Table
          dataSource={transactions}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
          scroll={{ x: 800 }}
        />
      </Card>

      {/* Top Up Modal */}
      <Modal
        open={topupOpen}
        onCancel={() => setTopupOpen(false)}
        footer={null}
        title="Top Up Wallet via M-Pesa"
        width={440}
        centered
      >
        {topupStep === 'amount' && (
          <>
            {topupError && <Alert message={topupError} type="error" showIcon style={{ marginBottom: 16 }} />}
            <Form form={form} onFinish={handleTopup} layout="vertical" size="large">
              <Form.Item
                name="phone"
                label="M-Pesa Phone Number"
                rules={[{ required: true, message: 'Phone number required' }]}
              >
                <Input prefix="+254" placeholder="712345678" />
              </Form.Item>
              <Form.Item
                name="amount"
                label="Amount (KES)"
                rules={[
                  { required: true, message: 'Amount required' },
                  { type: 'number', min: 100, message: 'Minimum KES 100' },
                ]}
              >
                <InputNumber style={{ width: '100%' }} placeholder="Enter amount" min={100} max={300000} />
              </Form.Item>
              <div style={{ marginBottom: 16, color: '#595959', fontSize: 13 }}>
                A <strong>Safaricom STK Push</strong> will be sent to your phone. Enter your M-Pesa PIN to confirm.
              </div>
              <Button type="primary" htmlType="submit" loading={topupLoading} block>
                Send STK Push
              </Button>
            </Form>
          </>
        )}

        {topupStep === 'waiting' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <MobileOutlined style={{ fontSize: 64, color: '#52c41a', marginBottom: 16 }} />
            <Title level={4}>Check Your Phone</Title>
            <Text type="secondary">
              An M-Pesa payment request has been sent to your phone.<br />
              Enter your M-Pesa PIN to complete the payment.
            </Text>
            <div style={{ marginTop: 24 }}>
              <ReloadOutlined spin style={{ fontSize: 24, color: '#1890ff' }} />
              <div style={{ color: '#8c8c8c', marginTop: 8, fontSize: 12 }}>Waiting for confirmation...</div>
            </div>
          </div>
        )}

        {topupStep === 'success' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a', marginBottom: 16 }} />
            <Title level={4}>Payment Successful!</Title>
            <Text type="secondary">Your wallet has been topped up successfully.</Text>
            <Button type="primary" block style={{ marginTop: 24 }} onClick={() => { setTopupOpen(false); }}>
              Done
            </Button>
          </div>
        )}

        {topupStep === 'failed' && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Alert message="Payment Failed" description={topupError} type="error" showIcon style={{ marginBottom: 16 }} />
            <Button onClick={() => setTopupStep('amount')}>Try Again</Button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Wallet;
