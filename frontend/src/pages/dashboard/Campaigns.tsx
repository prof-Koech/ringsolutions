import React, { useEffect, useState } from 'react';
import {
  Table, Tag, Button, Card, Space, Typography, Select,
  Popconfirm, message, Progress, Tooltip, Row, Col, Statistic,
} from 'antd';
import {
  PlusOutlined, EyeOutlined, DeleteOutlined, DownloadOutlined, PrinterOutlined,
  SyncOutlined, CheckCircleOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Campaign } from '../../types';
import { handleCampaignReport } from '../../utils/report';

const { Title, Text } = Typography;

const STATUS_CONFIG: Record<string, { color: string; icon?: React.ReactNode }> = {
  completed: { color: 'success', icon: <CheckCircleOutlined /> },
  sending: { color: 'processing', icon: <SyncOutlined spin /> },
  queued: { color: 'blue', icon: <ClockCircleOutlined /> },
  scheduled: { color: 'purple', icon: <ClockCircleOutlined /> },
  failed: { color: 'error' },
  draft: { color: 'default' },
  cancelled: { color: 'default' },
};

const Campaigns: React.FC = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [downloading, setDownloading] = useState<string>('');

  useEffect(() => { loadCampaigns(); }, [page, statusFilter]);

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, per_page: 20 };
      if (statusFilter) params.status = statusFilter;
      const resp = await api.get('/campaigns/', { params });
      setCampaigns(resp.data.campaigns);
      setTotal(resp.data.total);
    } finally { setLoading(false); }
  };

  const handleCancel = async (id: string) => {
    try {
      await api.post(`/campaigns/${id}/cancel`);
      message.success('Campaign cancelled');
      loadCampaigns();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      message.error(err.response?.data?.error || 'Cancel failed');
    }
  };

  const handleReportAction = async (campaign: Campaign, mode: 'download' | 'print') => {
    setDownloading(campaign.id);
    try {
      await handleCampaignReport({ campaignId: campaign.id, campaignName: campaign.name, mode });
    } finally {
      setDownloading('');
    }
  };

  const columns = [
    {
      title: 'Campaign',
      dataIndex: 'name',
      render: (name: string, row: Campaign) => (
        <div>
          <div style={{ fontWeight: 600, cursor: 'pointer', color: '#1890ff' }} onClick={() => navigate(`/campaigns/${row.id}`)}>
            {name}
          </div>
          <Space size={4}>
            <Tag color={row.channel === 'sms' ? 'blue' : row.channel === 'whatsapp' ? 'green' : 'purple'} style={{ fontSize: 10 }}>
              {row.channel.toUpperCase()}
            </Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>{row.total_contacts} contacts</Text>
          </Space>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (s: string) => {
        const cfg = STATUS_CONFIG[s] || { color: 'default' };
        return <Tag color={cfg.color} icon={cfg.icon}>{s.replace('_', ' ').toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Delivery',
      render: (_: unknown, row: Campaign) => {
        const total = row.sms_sent + row.whatsapp_sent;
        if (!total) return <Text type="secondary">—</Text>;
        return (
          <Tooltip title={`${row.sms_delivered + row.whatsapp_delivered} delivered of ${total} sent`}>
            <Progress percent={row.delivery_rate} size="small" style={{ width: 100 }} />
          </Tooltip>
        );
      },
    },
    {
      title: 'Cost (KES)',
      dataIndex: 'actual_cost',
      render: (c: number) => c > 0 ? c.toFixed(2) : '—',
    },
    {
      title: 'Scheduled',
      dataIndex: 'scheduled_at',
      render: (d: string) => d ? new Date(d).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' }) : '—',
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      render: (d: string) => new Date(d).toLocaleDateString('en-KE'),
    },
    {
      title: 'Actions',
      render: (_: unknown, row: Campaign) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/campaigns/${row.id}`)} />
          {row.status === 'completed' && (
            <>
              <Button
                size="small"
                icon={<PrinterOutlined />}
                loading={downloading === row.id}
                onClick={() => handleReportAction(row, 'print')}
              />
              <Button
                size="small"
                icon={<DownloadOutlined />}
                loading={downloading === row.id}
                onClick={() => handleReportAction(row, 'download')}
              />
            </>
          )}
          {['draft', 'scheduled', 'queued'].includes(row.status) && (
            <Popconfirm title="Cancel this campaign?" onConfirm={() => handleCancel(row.id)}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Campaigns</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/campaigns/new')}>
          New Campaign
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { label: 'Total', value: total, color: '#1890ff' },
          { label: 'Active', value: campaigns.filter(c => ['queued', 'sending'].includes(c.status)).length, color: '#52c41a' },
          { label: 'Scheduled', value: campaigns.filter(c => c.status === 'scheduled').length, color: '#722ed1' },
          { label: 'Completed', value: campaigns.filter(c => c.status === 'completed').length, color: '#fa8c16' },
        ].map(s => (
          <Col xs={12} lg={6} key={s.label}>
            <Card size="small" bordered={false} style={{ borderLeft: `4px solid ${s.color}` }}>
              <Statistic title={s.label} value={s.value} valueStyle={{ color: s.color }} />
            </Card>
          </Col>
        ))}
      </Row>

      <Card bordered={false} style={{ borderRadius: 12 }}>
        <div style={{ marginBottom: 16 }}>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 160 }}
            options={[
              { label: 'All Statuses', value: '' },
              { label: 'Draft', value: 'draft' },
              { label: 'Queued', value: 'queued' },
              { label: 'Sending', value: 'sending' },
              { label: 'Scheduled', value: 'scheduled' },
              { label: 'Completed', value: 'completed' },
              { label: 'Failed', value: 'failed' },
              { label: 'Cancelled', value: 'cancelled' },
            ]}
          />
        </div>
        <Table
          dataSource={campaigns}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            total,
            pageSize: 20,
            current: page,
            onChange: setPage,
            showTotal: (t) => `${t} campaigns`,
          }}
          scroll={{ x: 900 }}
        />
      </Card>
    </div>
  );
};

export default Campaigns;
