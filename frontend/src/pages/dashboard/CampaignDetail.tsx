import React, { useEffect, useState } from 'react';
import {
  Card, Row, Col, Statistic, Tag, Typography, Button, Table,
  Progress, Space, Descriptions, Alert, Spin, message,
} from 'antd';
import {
  ArrowLeftOutlined, DownloadOutlined, PrinterOutlined, SyncOutlined,
  CheckCircleOutlined, ClockCircleOutlined, MessageOutlined,
  WhatsAppOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Campaign } from '../../types';
import { handleCampaignReport } from '../../utils/report';

const { Title, Text } = Typography;

const CampaignDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [messages, setMessages] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    loadCampaign();
  }, [id]);

  useEffect(() => {
    if (campaign?.status === 'sending' || campaign?.status === 'queued') {
      const interval = setInterval(loadCampaign, 5000);
      setPolling(true);
      return () => { clearInterval(interval); setPolling(false); };
    }
    setPolling(false);
  }, [campaign?.status]);

  const loadCampaign = async () => {
    if (!id) return;
    try {
      const [cResp, mResp] = await Promise.all([
        api.get(`/campaigns/${id}`),
        api.get(`/campaigns/${id}/messages?per_page=100`),
      ]);
      setCampaign(cResp.data.campaign);
      setMessages(mResp.data.messages);
    } finally { setLoading(false); }
  };

  const runReportAction = async (mode: 'download' | 'print') => {
    if (!id || !campaign) return;
    setDownloading(true);
    try {
      await handleCampaignReport({ campaignId: id, campaignName: campaign.name, mode });
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  if (!campaign) return <Alert message="Campaign not found" type="error" />;

  const STATUS_CONFIG: Record<string, string> = {
    completed: 'success', sending: 'processing', queued: 'blue',
    scheduled: 'purple', failed: 'error', draft: 'default', cancelled: 'default',
  };

  const totalSent = campaign.sms_sent + campaign.whatsapp_sent;
  const totalDelivered = campaign.sms_delivered + campaign.whatsapp_delivered;

  const msgColumns = [
    { title: 'Phone', dataIndex: 'phone' },
    { title: 'Channel', dataIndex: 'channel', render: (c: string) => (
      <Tag color={c === 'sms' ? 'blue' : 'green'} icon={c === 'sms' ? <MessageOutlined /> : <WhatsAppOutlined />}>
        {c.toUpperCase()}
      </Tag>
    )},
    { title: 'Status', dataIndex: 'status', render: (s: string) => (
      <Tag color={STATUS_CONFIG[s] || 'default'}>{s.toUpperCase()}</Tag>
    )},
    { title: 'Sent At', dataIndex: 'sent_at', render: (d: string) => d ? new Date(d).toLocaleString() : '—' },
    { title: 'Delivered At', dataIndex: 'delivered_at', render: (d: string) => d ? new Date(d).toLocaleString() : '—' },
    { title: 'Failure Reason', dataIndex: 'failure_reason', render: (r: string) => r || '—' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/campaigns')}>Back</Button>
          <div>
            <Title level={3} style={{ margin: 0 }}>{campaign.name}</Title>
            <Space style={{ marginTop: 4 }}>
              <Tag color={STATUS_CONFIG[campaign.status] || 'default'}>
                {campaign.status.replace('_', ' ').toUpperCase()}
              </Tag>
              <Tag color={campaign.channel === 'sms' ? 'blue' : campaign.channel === 'whatsapp' ? 'green' : 'purple'}>
                {campaign.channel.toUpperCase()}
              </Tag>
              {polling && <Tag icon={<SyncOutlined spin />} color="processing">Live</Tag>}
            </Space>
          </div>
        </Space>
        {campaign.status === 'completed' && (
          <Space>
            <Button icon={<PrinterOutlined />} onClick={() => runReportAction('print')} loading={downloading}>
              Print Report
            </Button>
            <Button type="primary" icon={<DownloadOutlined />} onClick={() => runReportAction('download')} loading={downloading}>
              Download PDF
            </Button>
          </Space>
        )}
      </div>

      {/* Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { title: 'Total Contacts', value: campaign.total_contacts },
          { title: 'Messages Sent', value: totalSent },
          { title: 'Delivered', value: totalDelivered },
          { title: 'Failed', value: campaign.sms_failed + campaign.whatsapp_failed },
          { title: 'Delivery Rate', value: campaign.delivery_rate, suffix: '%' },
          { title: 'Cost (KES)', value: Number(campaign.actual_cost), precision: 2 },
        ].map(s => (
          <Col xs={12} lg={4} key={s.title}>
            <Card size="small" bordered={false} style={{ textAlign: 'center' }}>
              <Statistic title={s.title} value={s.value} suffix={s.suffix} precision={s.precision} />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Delivery Progress */}
      {totalSent > 0 && (
        <Card bordered={false} style={{ marginBottom: 16, borderRadius: 12 }}>
          <Row gutter={[24, 16]}>
            <Col span={24}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>Overall Delivery Rate</div>
              <Progress
                percent={campaign.delivery_rate}
                strokeColor={{ '0%': campaign.report_color, '100%': campaign.report_color }}
                format={p => `${p}%`}
              />
            </Col>
            {campaign.sms_sent > 0 && (
              <Col xs={24} md={12}>
                <div style={{ fontSize: 13, color: '#8c8c8c' }}>SMS Delivery</div>
                <Progress percent={Math.round(campaign.sms_delivered / Math.max(campaign.sms_sent, 1) * 100)} strokeColor="#1890ff" />
              </Col>
            )}
            {campaign.whatsapp_sent > 0 && (
              <Col xs={24} md={12}>
                <div style={{ fontSize: 13, color: '#8c8c8c' }}>WhatsApp Delivery</div>
                <Progress percent={Math.round(campaign.whatsapp_delivered / Math.max(campaign.whatsapp_sent, 1) * 100)} strokeColor="#52c41a" />
              </Col>
            )}
          </Row>
        </Card>
      )}

      {/* Campaign Details */}
      <Card bordered={false} style={{ marginBottom: 16, borderRadius: 12 }}>
        <Descriptions title="Campaign Details" bordered size="small" column={{ xs: 1, md: 2 }}>
          <Descriptions.Item label="Message">{campaign.message}</Descriptions.Item>
          <Descriptions.Item label="Sender ID">{campaign.sender_id || 'Default'}</Descriptions.Item>
          <Descriptions.Item label="Scheduled">{campaign.scheduled_at ? new Date(campaign.scheduled_at).toLocaleString() : '—'}</Descriptions.Item>
          <Descriptions.Item label="Started">{campaign.started_at ? new Date(campaign.started_at).toLocaleString() : '—'}</Descriptions.Item>
          <Descriptions.Item label="Completed">{campaign.completed_at ? new Date(campaign.completed_at).toLocaleString() : '—'}</Descriptions.Item>
          <Descriptions.Item label="Estimated Cost">KES {Number(campaign.estimated_cost).toFixed(2)}</Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Messages Table */}
      <Card title="Message Log" bordered={false} style={{ borderRadius: 12 }}>
        <Table
          dataSource={messages}
          columns={msgColumns}
          rowKey="id"
          pagination={{ pageSize: 50 }}
          scroll={{ x: 700 }}
          size="small"
        />
      </Card>
    </div>
  );
};

export default CampaignDetail;
