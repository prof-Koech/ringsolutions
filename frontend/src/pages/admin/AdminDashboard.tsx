import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Button, Tag, Typography, Input, Space, message } from 'antd';
import { CheckOutlined, StopOutlined, PlusOutlined } from '@ant-design/icons';
import api from '../../services/api';

const { Title } = Typography;
const { Search } = Input;

interface AdminStats {
  total_users: number;
  verified_users: number;
  total_campaigns: number;
  completed_campaigns: number;
  total_revenue_kes: number;
}

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  is_active: boolean;
  is_verified: boolean;
  wallet_balance: number;
  campaign_count: number;
  created_at: string;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [creditModal, setCreditModal] = useState<{ userId: string; email: string } | null>(null);

  useEffect(() => { loadStats(); }, []);
  useEffect(() => { loadUsers(); }, [page, search]);

  const loadStats = async () => {
    const resp = await api.get('/admin/stats');
    setStats(resp.data);
  };

  const loadUsers = async () => {
    setLoading(true);
    const resp = await api.get('/admin/users', { params: { page, per_page: 20, search } });
    setUsers(resp.data.users);
    setTotal(resp.data.total);
    setLoading(false);
  };

  const suspend = async (id: string) => {
    await api.post(`/admin/users/${id}/suspend`);
    message.success('User suspended');
    loadUsers();
  };

  const activate = async (id: string) => {
    await api.post(`/admin/users/${id}/activate`);
    message.success('User activated');
    loadUsers();
  };

  const creditWallet = async (userId: string, amount: number) => {
    await api.post(`/admin/users/${userId}/wallet/credit`, { amount, reason: 'Admin credit' });
    message.success(`KES ${amount} credited`);
    loadUsers();
  };

  const columns = [
    {
      title: 'User',
      render: (_: unknown, row: AdminUser) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.full_name}</div>
          <div style={{ fontSize: 12, color: '#8c8c8c' }}>{row.email}</div>
        </div>
      ),
    },
    {
      title: 'Status',
      render: (_: unknown, row: AdminUser) => (
        <Space>
          <Tag color={row.is_active ? 'green' : 'red'}>{row.is_active ? 'Active' : 'Suspended'}</Tag>
          {!row.is_verified && <Tag color="orange">Unverified</Tag>}
        </Space>
      ),
    },
    { title: 'Balance (KES)', dataIndex: 'wallet_balance', render: (b: number) => b?.toFixed(2) },
    { title: 'Campaigns', dataIndex: 'campaign_count' },
    { title: 'Joined', dataIndex: 'created_at', render: (d: string) => new Date(d).toLocaleDateString() },
    {
      title: 'Actions',
      render: (_: unknown, row: AdminUser) => (
        <Space>
          {row.is_active ? (
            <Button size="small" danger icon={<StopOutlined />} onClick={() => suspend(row.id)}>Suspend</Button>
          ) : (
            <Button size="small" icon={<CheckOutlined />} onClick={() => activate(row.id)}>Activate</Button>
          )}
          <Button size="small" icon={<PlusOutlined />} onClick={() => creditWallet(row.id, 100)}>
            Credit KES 100
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>Admin Panel</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { title: 'Total Users', value: stats?.total_users || 0 },
          { title: 'Verified', value: stats?.verified_users || 0 },
          { title: 'Total Campaigns', value: stats?.total_campaigns || 0 },
          { title: 'Revenue (KES)', value: stats?.total_revenue_kes || 0, precision: 2 },
        ].map(s => (
          <Col xs={12} lg={6} key={s.title}>
            <Card bordered={false} style={{ borderRadius: 12 }}>
              <Statistic title={s.title} value={s.value} precision={s.precision} />
            </Card>
          </Col>
        ))}
      </Row>

      <Card title="User Management" bordered={false} style={{ borderRadius: 12 }}>
        <div style={{ marginBottom: 16 }}>
          <Search
            placeholder="Search by email or name"
            onSearch={setSearch}
            style={{ width: 300 }}
            allowClear
          />
        </div>
        <Table
          dataSource={users}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ total, pageSize: 20, current: page, onChange: setPage }}
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  );
};

export default AdminDashboard;
