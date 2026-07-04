import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Button, Tag, Typography, Progress, Space } from 'antd';
import { DownloadOutlined, PrinterOutlined, BarChartOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Campaign, DashboardStats } from '../../types';
import { handleCampaignReport } from '../../utils/report';

const { Title, Text } = Typography;

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/reports/dashboard').then(r => setStats(r.data)),
      api.get('/campaigns/?status=completed&per_page=50').then(r => setCampaigns(r.data.campaigns)),
    ]).finally(() => setLoading(false));
  }, []);

  const runReportAction = async (campaign: Campaign, mode: 'download' | 'print') => {
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
          <Tag color={row.channel === 'sms' ? 'blue' : row.channel === 'whatsapp' ? 'green' : 'purple'} style={{ fontSize: 10 }}>
            {row.channel.toUpperCase()}
          </Tag>
        </div>
      ),
    },
    { title: 'Contacts', dataIndex: 'total_contacts' },
    {
      title: 'Sent',
      render: (_: unknown, r: Campaign) => r.sms_sent + r.whatsapp_sent,
    },
    {
      title: 'Delivered',
      render: (_: unknown, r: Campaign) => r.sms_delivered + r.whatsapp_delivered,
    },
    {
      title: 'Delivery Rate',
      dataIndex: 'delivery_rate',
      render: (rate: number) => <Progress percent={rate} size="small" style={{ width: 100 }} />,
    },
    {
      title: 'Cost (KES)',
      dataIndex: 'actual_cost',
      render: (c: number) => Number(c).toFixed(2),
    },
    {
      title: 'Completed',
      dataIndex: 'completed_at',
      render: (d: string) => d ? new Date(d).toLocaleDateString('en-KE') : '—',
    },
    {
      title: 'Report',
      render: (_: unknown, row: Campaign) => (
        <Space size="small">
          <Button
            size="small"
            icon={<PrinterOutlined />}
            loading={downloading === row.id}
            onClick={() => runReportAction(row, 'print')}
          >
            Print
          </Button>
          <Button
            size="small"
            icon={<DownloadOutlined />}
            loading={downloading === row.id}
            onClick={() => runReportAction(row, 'download')}
          >
            PDF
          </Button>
        </Space>
      ),
    },
  ];

  const totalSent = campaigns.reduce((a, c) => a + c.sms_sent + c.whatsapp_sent, 0);
  const totalDelivered = campaigns.reduce((a, c) => a + c.sms_delivered + c.whatsapp_delivered, 0);
  const avgDelivery = totalSent ? Math.round(totalDelivered / totalSent * 100) : 0;

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>Analytics & Reports</Title>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic title="Wallet Balance" value={stats?.wallet_balance || 0} precision={2} suffix="KES" loading={loading} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic title="Total Campaigns" value={stats?.total_campaigns || 0} loading={loading} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic title="Messages Sent (30d)" value={stats?.messages_sent_30d || 0} loading={loading} />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic title="Delivery Rate (30d)" value={stats?.delivery_rate_30d || 0} suffix="%" loading={loading} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={12}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <Statistic title="Spent (30 Days)" value={stats?.spent_30d || 0} precision={2} suffix="KES" prefix="KES " />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card bordered={false} style={{ borderRadius: 12 }}>
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary">All-Time Delivery Rate</Text>
            </div>
            <Progress
              percent={avgDelivery}
              strokeColor={{ '0%': '#1890ff', '100%': '#52c41a' }}
              format={p => `${p}%`}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={<Space><BarChartOutlined /> Completed Campaigns & Reports</Space>}
        bordered={false}
        style={{ borderRadius: 12 }}
      >
        <Table
          dataSource={campaigns}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
          scroll={{ x: 800 }}
          locale={{
            emptyText: (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <BarChartOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 12 }} />
                <div>No completed campaigns yet. Send your first campaign to see reports here.</div>
              </div>
            ),
          }}
        />
      </Card>
    </div>
  );
};

export default Reports;
