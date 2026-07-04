import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Button, Table, Tag, Typography, Alert, Space, Progress } from 'antd';
import {
  MessageOutlined, WalletOutlined, ThunderboltOutlined,
  BarChartOutlined, ArrowUpOutlined, PlusOutlined,
  CheckCircleOutlined, SyncOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import { DashboardStats, Campaign } from '../../types';

const { Title, Text } = Typography;

const STATUS_TAG: Record<string, { color: string; icon: React.ReactNode }> = {
  completed: { color: 'success', icon: <CheckCircleOutlined /> },
  sending: { color: 'processing', icon: <SyncOutlined spin /> },
  queued: { color: 'blue', icon: <ClockCircleOutlined /> },
  scheduled: { color: 'purple', icon: <ClockCircleOutlined /> },
  failed: { color: 'error', icon: null },
  draft: { color: 'default', icon: null },
  cancelled: { color: 'default', icon: null },
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/reports/dashboard').then(r => setStats(r.data)),
      api.get('/campaigns/?per_page=5').then(r => setCampaigns(r.data.campaigns)),
    ]).finally(() => setLoading(false));
  }, []);

  const columns = [
    {
      title: 'Campaign',
      dataIndex: 'name',
      render: (name: string, row: Campaign) => (
        <div>
          <div style={{ fontWeight: 600 }}>{name}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{row.channel.toUpperCase()} · {row.total_contacts} contacts</Text>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (s: string) => {
        const meta = STATUS_TAG[s] || { color: 'default', icon: null };
        return <Tag color={meta.color} icon={meta.icon}>{s.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Delivery',
      dataIndex: 'delivery_rate',
      render: (rate: number, row: Campaign) => (
        row.status === 'completed' ? (
          <div>
            <Progress percent={rate} size="small" style={{ width: 100 }} />
          </div>
        ) : <Text type="secondary">—</Text>
      ),
    },
    {
      title: 'Cost',
      dataIndex: 'actual_cost',
      render: (c: number) => <Text>KES {c.toFixed(2)}</Text>,
    },
    {
      title: '',
      render: (_: unknown, row: Campaign) => (
        <Button size="small" onClick={() => navigate(`/campaigns/${row.id}`)}>View</Button>
      ),
    },
  ];

  return (
    <div>
      {user && !user.is_verified && (
        <Alert
          message="Verify your email to unlock all features"
          description="Check your inbox for the verification email we sent you."
          type="warning"
          showIcon
          style={{ marginBottom: 24 }}
          action={<Button size="small" onClick={() => api.post('/auth/resend-verification', { email: user.email })}>Resend Email</Button>}
        />
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.first_name}! 👋
          </Title>
          <Text type="secondary">Here's what's happening with your campaigns</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/campaigns/new')} size="large">
          New Campaign
        </Button>
      </div>

      {/* Stats Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12, background: 'linear-gradient(135deg, #1890ff, #0050b3)', color: '#fff' }}>
            <Statistic
              title={<span style={{ color: 'rgba(255,255,255,0.8)' }}>Wallet Balance</span>}
              value={stats?.wallet_balance || 0}
              precision={2}
              prefix={<WalletOutlined />}
              suffix="KES"
              valueStyle={{ color: '#fff', fontSize: 28, fontWeight: 700 }}
              loading={loading}
            />
            <Button
              size="small"
              onClick={() => navigate('/wallet')}
              style={{ marginTop: 12, background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none' }}
            >
              Top Up
            </Button>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title="Total Campaigns"
              value={stats?.total_campaigns || 0}
              prefix={<MessageOutlined style={{ color: '#1890ff' }} />}
              loading={loading}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {stats?.active_campaigns} active
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title="Messages Sent (30d)"
              value={stats?.messages_sent_30d || 0}
              prefix={<ThunderboltOutlined style={{ color: '#52c41a' }} />}
              loading={loading}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {stats?.delivery_rate_30d}% delivery rate
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic
              title="Spent (30d)"
              value={stats?.spent_30d || 0}
              precision={2}
              prefix={<BarChartOutlined style={{ color: '#fa8c16' }} />}
              suffix="KES"
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { title: 'Send Bulk SMS', desc: 'Reach thousands via SMS', color: '#1890ff', onClick: () => navigate('/campaigns/new?channel=sms') },
          { title: 'WhatsApp Campaign', desc: 'Send WhatsApp templates', color: '#52c41a', onClick: () => navigate('/campaigns/new?channel=whatsapp') },
          { title: 'Top Up Wallet', desc: 'Fund via M-Pesa STK Push', color: '#722ed1', onClick: () => navigate('/wallet') },
          { title: 'View Reports', desc: 'Campaign analytics & PDFs', color: '#fa8c16', onClick: () => navigate('/reports') },
        ].map(action => (
          <Col xs={12} lg={6} key={action.title}>
            <Card
              hoverable
              bordered={false}
              style={{ borderRadius: 12, cursor: 'pointer', borderLeft: `4px solid ${action.color}` }}
              onClick={action.onClick}
            >
              <div style={{ fontWeight: 700, color: action.color }}>{action.title}</div>
              <div style={{ color: '#8c8c8c', fontSize: 12, marginTop: 4 }}>{action.desc}</div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Recent Campaigns */}
      <Card
        title={<Title level={5} style={{ margin: 0 }}>Recent Campaigns</Title>}
        extra={<Button type="link" onClick={() => navigate('/campaigns')}>View All</Button>}
        bordered={false}
        style={{ borderRadius: 12 }}
      >
        <Table
          dataSource={campaigns}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
          locale={{ emptyText: (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <MessageOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 12 }} />
              <div>No campaigns yet.</div>
              <Button type="primary" style={{ marginTop: 12 }} onClick={() => navigate('/campaigns/new')}>
                Create Your First Campaign
              </Button>
            </div>
          )}}
        />
      </Card>
    </div>
  );
};

export default Dashboard;
