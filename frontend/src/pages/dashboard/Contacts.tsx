import React, { useEffect, useState } from 'react';
import {
  Card, Table, Button, Modal, Form, Input, Space, Tabs, Tag,
  Upload, Alert, Statistic, Row, Col, Popconfirm, message, Typography,
} from 'antd';
import {
  PlusOutlined, UploadOutlined, DeleteOutlined, InboxOutlined,
  UserOutlined, StopOutlined,
} from '@ant-design/icons';
import api from '../../services/api';
import { ContactList, Contact } from '../../types';

const { Title, Text } = Typography;
const { Dragger } = Upload;

const Contacts: React.FC = () => {
  const [lists, setLists] = useState<ContactList[]>([]);
  const [selectedList, setSelectedList] = useState<ContactList | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [blacklist, setBlacklist] = useState<{ id: string; phone: string; reason: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [blacklistOpen, setBlacklistOpen] = useState(false);
  const [uploadResult, setUploadResult] = useState<Record<string, unknown> | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [form] = Form.useForm();
  const [blForm] = Form.useForm();

  useEffect(() => { loadLists(); loadBlacklist(); }, []);

  const loadLists = async () => {
    setLoading(true);
    const resp = await api.get('/contacts/lists');
    setLists(resp.data.contact_lists);
    setLoading(false);
  };

  const loadBlacklist = async () => {
    const resp = await api.get('/contacts/blacklist');
    setBlacklist(resp.data.blacklist);
  };

  const loadContacts = async (listId: string) => {
    const resp = await api.get(`/contacts/lists/${listId}`);
    setContacts(resp.data.contacts);
    setSelectedList(resp.data.contact_list);
  };

  const handleCreate = async (values: { name: string; description: string }) => {
    await api.post('/contacts/lists', values);
    setCreateOpen(false);
    form.resetFields();
    loadLists();
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/contacts/lists/${id}`);
    message.success('List deleted');
    if (selectedList?.id === id) setSelectedList(null);
    loadLists();
  };

  const handleUpload = async (file: File) => {
    if (!selectedList) return false;
    setUploadLoading(true);
    setUploadResult(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const resp = await api.post(`/contacts/lists/${selectedList.id}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      } as object);
      setUploadResult(resp.data);
      loadContacts(selectedList.id);
      loadLists();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      message.error(err.response?.data?.error || 'Upload failed');
    } finally { setUploadLoading(false); }
    return false;
  };

  const handleBlacklist = async (values: { phone: string; reason: string }) => {
    await api.post('/contacts/blacklist', values);
    setBlacklistOpen(false);
    blForm.resetFields();
    loadBlacklist();
  };

  const listColumns = [
    {
      title: 'List Name',
      dataIndex: 'name',
      render: (name: string, row: ContactList) => (
        <div style={{ cursor: 'pointer', color: '#1890ff', fontWeight: 600 }} onClick={() => loadContacts(row.id)}>
          {name}
        </div>
      ),
    },
    { title: 'Total', dataIndex: 'total_contacts' },
    { title: 'Valid', dataIndex: 'valid_contacts', render: (v: number) => <Tag color="green">{v}</Tag> },
    { title: 'Created', dataIndex: 'created_at', render: (d: string) => new Date(d).toLocaleDateString() },
    {
      title: 'Actions',
      render: (_: unknown, row: ContactList) => (
        <Popconfirm title="Delete this list and all its contacts?" onConfirm={() => handleDelete(row.id)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  const contactColumns = [
    { title: 'Phone', dataIndex: 'phone' },
    { title: 'Name', dataIndex: 'name', render: (n: string) => n || '—' },
    { title: 'Email', dataIndex: 'email', render: (e: string) => e || '—' },
    {
      title: 'Status',
      render: (_: unknown, row: Contact) => (
        <Space>
          {!row.is_valid && <Tag color="error">Invalid</Tag>}
          {row.is_opted_out && <Tag color="orange">Opted Out</Tag>}
          {row.is_valid && !row.is_opted_out && <Tag color="success">Active</Tag>}
        </Space>
      ),
    },
  ];

  const blColumns = [
    { title: 'Phone', dataIndex: 'phone' },
    { title: 'Reason', dataIndex: 'reason', render: (r: string) => r || '—' },
    { title: 'Added', dataIndex: 'created_at', render: (d: string) => new Date(d).toLocaleDateString() },
    {
      title: '',
      render: (_: unknown, row: { id: string }) => (
        <Popconfirm title="Remove from blacklist?" onConfirm={async () => {
          await api.delete(`/contacts/blacklist/${row.id}`);
          loadBlacklist();
        }}>
          <Button size="small">Remove</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Contacts</Title>
        <Space>
          <Button icon={<StopOutlined />} onClick={() => setBlacklistOpen(true)}>Manage Blacklist</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            New Contact List
          </Button>
        </Space>
      </div>

      <Tabs
        items={[
          {
            key: 'lists',
            label: 'Contact Lists',
            children: (
              <Card bordered={false} style={{ borderRadius: 12 }}>
                <Table
                  dataSource={lists}
                  columns={listColumns}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 20 }}
                />
              </Card>
            ),
          },
          {
            key: 'contacts',
            label: selectedList ? `${selectedList.name} Contacts` : 'Select a list to view contacts',
            disabled: !selectedList,
            children: selectedList ? (
              <Card
                title={`${selectedList.name} — ${selectedList.valid_contacts} valid contacts`}
                bordered={false}
                style={{ borderRadius: 12 }}
                extra={
                  <Dragger
                    accept=".csv,.xlsx,.xls"
                    beforeUpload={handleUpload}
                    showUploadList={false}
                    style={{ border: 'none', background: 'none' }}
                  >
                    <Button icon={<UploadOutlined />} loading={uploadLoading}>Upload More</Button>
                  </Dragger>
                }
              >
                {uploadResult && (
                  <Alert
                    style={{ marginBottom: 16 }}
                    type="success"
                    message={`Imported ${uploadResult.imported as number} new contacts`}
                    closable
                  />
                )}
                <Table
                  dataSource={contacts}
                  columns={contactColumns}
                  rowKey="id"
                  pagination={{ pageSize: 50 }}
                  scroll={{ x: 500 }}
                />
              </Card>
            ) : null,
          },
          {
            key: 'blacklist',
            label: `Blacklist (${blacklist.length})`,
            children: (
              <Card
                title="Blacklisted Numbers"
                bordered={false}
                style={{ borderRadius: 12 }}
                extra={<Button type="primary" onClick={() => setBlacklistOpen(true)}>Add Number</Button>}
              >
                <Table dataSource={blacklist} columns={blColumns} rowKey="id" pagination={{ pageSize: 50 }} />
              </Card>
            ),
          },
        ]}
      />

      {/* Create List Modal */}
      <Modal open={createOpen} title="Create Contact List" onCancel={() => setCreateOpen(false)} footer={null}>
        <Form form={form} onFinish={handleCreate} layout="vertical">
          <Form.Item name="name" label="List Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. VIP Customers" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input placeholder="Optional description" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>Create</Button>
        </Form>
      </Modal>

      {/* Blacklist Modal */}
      <Modal open={blacklistOpen} title="Add to Blacklist" onCancel={() => setBlacklistOpen(false)} footer={null}>
        <Form form={blForm} onFinish={handleBlacklist} layout="vertical">
          <Form.Item name="phone" label="Phone Number" rules={[{ required: true }]}>
            <Input placeholder="e.g. +254712345678" />
          </Form.Item>
          <Form.Item name="reason" label="Reason">
            <Input placeholder="e.g. Opted out" />
          </Form.Item>
          <Button type="primary" htmlType="submit" danger block>Add to Blacklist</Button>
        </Form>
      </Modal>
    </div>
  );
};

export default Contacts;
