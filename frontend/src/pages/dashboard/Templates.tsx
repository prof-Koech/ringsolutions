import React, { useEffect, useState } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, Select, Tag,
  Space, Popconfirm, message, Typography, Alert, Divider,
} from 'antd';
import { PlusOutlined, SyncOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import api from '../../services/api';
import { WhatsAppTemplate } from '../../types';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const Templates: React.FC = () => {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<WhatsAppTemplate | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => { loadTemplates(); }, []);

  const loadTemplates = async () => {
    setLoading(true);
    const resp = await api.get('/templates/');
    setTemplates(resp.data.templates);
    setLoading(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const resp = await api.post('/templates/sync-whatsapp');
      message.success(`Synced ${resp.data.synced} new templates from WhatsApp Business`);
      loadTemplates();
    } catch {
      message.error('Failed to sync templates. Check WhatsApp API credentials.');
    } finally { setSyncing(false); }
  };

  const handleSave = async (values: Record<string, string>) => {
    try {
      if (editTemplate) {
        await api.put(`/templates/${editTemplate.id}`, values);
        message.success('Template updated');
      } else {
        await api.post('/templates/', values);
        message.success('Template created');
      }
      setCreateOpen(false);
      setEditTemplate(null);
      form.resetFields();
      loadTemplates();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      message.error(err.response?.data?.error || 'Save failed');
    }
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/templates/${id}`);
    message.success('Template deleted');
    loadTemplates();
  };

  const openEdit = (tpl: WhatsAppTemplate) => {
    setEditTemplate(tpl);
    form.setFieldsValue(tpl);
    setCreateOpen(true);
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      render: (name: string, row: WhatsAppTemplate) => (
        <div>
          <div style={{ fontWeight: 600 }}>{name}</div>
          {row.wa_template_name && <Text type="secondary" style={{ fontSize: 11 }}>WA: {row.wa_template_name}</Text>}
        </div>
      ),
    },
    {
      title: 'Language',
      dataIndex: 'language',
      render: (l: string) => <Tag>{l}</Tag>,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      render: (c: string) => c ? <Tag color="blue">{c}</Tag> : '—',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (s: string) => (
        <Tag color={s === 'approved' ? 'green' : s === 'pending' ? 'orange' : 'red'}>
          {s?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Body Preview',
      dataIndex: 'body_text',
      render: (b: string) => <Text style={{ fontSize: 12 }} type="secondary">{b?.slice(0, 80)}{b?.length > 80 ? '...' : ''}</Text>,
    },
    {
      title: 'Actions',
      render: (_: unknown, row: WhatsAppTemplate) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)} />
          <Popconfirm title="Delete this template?" onConfirm={() => handleDelete(row.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>WhatsApp Templates</Title>
        <Space>
          <Button icon={<SyncOutlined />} loading={syncing} onClick={handleSync}>
            Sync from WhatsApp Business
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditTemplate(null); form.resetFields(); setCreateOpen(true); }}>
            Add Template
          </Button>
        </Space>
      </div>

      <Alert
        message="About WhatsApp Templates"
        description="WhatsApp Business API requires pre-approved message templates for outbound messaging. Sync your approved templates from Meta Business Manager or create local templates."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        closable
      />

      <Card bordered={false} style={{ borderRadius: 12 }}>
        <Table
          dataSource={templates}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <Modal
        open={createOpen}
        title={editTemplate ? 'Edit Template' : 'New WhatsApp Template'}
        onCancel={() => { setCreateOpen(false); setEditTemplate(null); }}
        footer={null}
        width={600}
      >
        <Form form={form} onFinish={handleSave} layout="vertical">
          <Form.Item name="name" label="Template Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. promo_july_2024" />
          </Form.Item>
          <Form.Item name="wa_template_name" label="WhatsApp Template Name (from Meta)">
            <Input placeholder="Exact name as approved in Meta" />
          </Form.Item>
          <Form.Item name="language" label="Language" initialValue="en">
            <Select options={[
              { label: 'English', value: 'en' },
              { label: 'Swahili', value: 'sw' },
              { label: 'English (US)', value: 'en_US' },
            ]} />
          </Form.Item>
          <Form.Item name="category" label="Category">
            <Select options={[
              { label: 'Utility', value: 'UTILITY' },
              { label: 'Marketing', value: 'MARKETING' },
              { label: 'Authentication', value: 'AUTHENTICATION' },
            ]} />
          </Form.Item>
          <Form.Item name="header_text" label="Header Text (optional)">
            <Input placeholder="Short header (max 60 chars)" maxLength={60} />
          </Form.Item>
          <Form.Item name="body_text" label="Body Text" rules={[{ required: true }]}>
            <TextArea rows={4} placeholder="Use {{1}}, {{2}} for variables e.g. Hello {{1}}, your order {{2}} is ready!" />
          </Form.Item>
          <Form.Item name="footer_text" label="Footer Text (optional)">
            <Input placeholder="Footer text" maxLength={60} />
          </Form.Item>
          <Divider />
          <Button type="primary" htmlType="submit" block>
            {editTemplate ? 'Update Template' : 'Save Template'}
          </Button>
        </Form>
      </Modal>
    </div>
  );
};

export default Templates;
