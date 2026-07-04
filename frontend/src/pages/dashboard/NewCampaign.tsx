import React, { useState, useEffect, useRef } from 'react';
import {
  Card, Form, Input, Select, Button, Steps, Row, Col, Alert,
  Switch, DatePicker, ColorPicker, Typography, Statistic, Upload,
  Table, Tag, Space, Modal, Divider, InputNumber, Spin,
} from 'antd';
import {
  MessageOutlined, WhatsAppOutlined, UploadOutlined,
  SendOutlined, WalletOutlined, CalendarOutlined,
  CheckCircleOutlined, InboxOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../../services/api';
import { ContactList, WhatsAppTemplate, CostEstimate } from '../../types';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;

interface UploadResult {
  imported: number;
  total_in_file: number;
  invalid_in_file: number;
  file_duplicates_removed: number;
  blacklisted_skipped: number;
  contact_list: ContactList;
}

const NewCampaign: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(0);
  const [form] = Form.useForm();
  const [channel, setChannel] = useState<'sms' | 'whatsapp' | 'both'>(
    (searchParams.get('channel') as 'sms' | 'whatsapp' | 'both') || 'sms'
  );
  const [useCustomSender, setUseCustomSender] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [contactLists, setContactLists] = useState<ContactList[]>([]);
  const [selectedList, setSelectedList] = useState<ContactList | null>(null);
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [costEstimate, setCostEstimate] = useState<CostEstimate | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [createdListId, setCreatedListId] = useState('');
  const [campaignId, setCampaignId] = useState('');
  const [reportColor, setReportColor] = useState('#1890ff');
  const [charCount, setCharCount] = useState(0);
  const [smsUnits, setSmsUnits] = useState(1);
  const messageRef = useRef<string>('');

  useEffect(() => {
    loadInitial();
  }, []);

  useEffect(() => {
    if (selectedList) estimateCost();
  }, [channel, useCustomSender, selectedList]);

  const loadInitial = async () => {
    const [listsResp, walletResp, tplResp] = await Promise.all([
      api.get('/contacts/lists'),
      api.get('/wallet/'),
      api.get('/templates/'),
    ]);
    setContactLists(listsResp.data.contact_lists);
    setWalletBalance(walletResp.data.wallet.balance);
    setTemplates(tplResp.data.templates);
  };

  const estimateCost = async () => {
    if (!selectedList) return;
    try {
      const resp = await api.post('/wallet/estimate', {
        channel,
        contact_count: selectedList.valid_contacts,
        use_custom_sender_id: useCustomSender,
      });
      setCostEstimate(resp.data);
    } catch { /* silent */ }
  };

  const handleMessageChange = (val: string) => {
    messageRef.current = val;
    setCharCount(val.length);
    const units = val.length <= 160 ? 1 : Math.ceil(val.length / 153);
    setSmsUnits(units);
  };

  const createNewList = async () => {
    if (!newListName.trim()) return;
    const resp = await api.post('/contacts/lists', { name: newListName });
    const list = resp.data.contact_list;
    setContactLists(prev => [list, ...prev]);
    setCreatedListId(list.id);
    setNewListName('');
  };

  const handleFileUpload = async (file: File) => {
    const listId = createdListId || form.getFieldValue('contact_list_id');
    if (!listId) { setError('Please create or select a contact list first'); return false; }

    setUploadLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const resp = await api.post(`/contacts/lists/${listId}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      } as object);
      setUploadResult(resp.data);
      const list = resp.data.contact_list;
      setSelectedList(list);
      setContactLists(prev => prev.map(l => l.id === list.id ? list : l));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err.response?.data?.error || 'Upload failed');
    } finally { setUploadLoading(false); }
    return false;
  };

  const handleCreateCampaign = async () => {
    try {
      await form.validateFields();
    } catch { return; }

    const values = form.getFieldsValue();
    if (!selectedList && !values.contact_list_id) {
      setError('Please select a contact list'); return;
    }

    setLoading(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        name: values.campaign_name,
        message: values.message,
        channel,
        contact_list_id: selectedList?.id || values.contact_list_id,
        use_custom_sender_id: useCustomSender,
        sender_id: useCustomSender ? values.sender_id : undefined,
        template_id: values.template_id || undefined,
        template_variables: values.template_variables || {},
        report_color: reportColor,
        scheduled_at: isScheduled && values.scheduled_at ? values.scheduled_at.toISOString() : undefined,
      };

      const resp = await api.post('/campaigns/', payload);
      setCampaignId(resp.data.campaign.id);
      setStep(3);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err.response?.data?.error || 'Failed to create campaign');
    } finally { setLoading(false); }
  };

  const handlePayAndSend = async () => {
    if (!campaignId) return;
    setLoading(true);
    setError('');
    try {
      await api.post(`/campaigns/${campaignId}/pay`);
      navigate(`/campaigns/${campaignId}`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      setError(err.response?.data?.error || 'Payment failed');
    } finally { setLoading(false); }
  };

  const STEPS = ['Contacts', 'Compose', 'Options', 'Review & Pay'];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>New Campaign</Title>
        <Text type="secondary">Create and send a bulk messaging campaign</Text>
      </div>

      <Steps
        current={step}
        items={STEPS.map(s => ({ title: s }))}
        style={{ marginBottom: 32 }}
      />

      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 16 }} closable onClose={() => setError('')} />}

      <Form form={form} layout="vertical" size="large">
        {/* Step 0: Contacts */}
        {step === 0 && (
          <Card bordered={false} style={{ borderRadius: 16 }}>
            <Title level={4}>Contact List</Title>
            <Form.Item label="Campaign Name" name="campaign_name" rules={[{ required: true, message: 'Name required' }]}>
              <Input placeholder="e.g. July Promotions" />
            </Form.Item>

            <Divider>Select Existing List</Divider>
            <Form.Item name="contact_list_id" label="Contact List">
              <Select
                placeholder="Select a contact list"
                onChange={(id) => {
                  const list = contactLists.find(l => l.id === id) || null;
                  setSelectedList(list);
                }}
                options={contactLists.map(l => ({
                  label: `${l.name} (${l.valid_contacts} valid contacts)`,
                  value: l.id,
                }))}
              />
            </Form.Item>

            <Divider>Or Create New List & Upload</Divider>
            <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
              <Input
                placeholder="New list name"
                value={newListName}
                onChange={e => setNewListName(e.target.value)}
              />
              <Button type="primary" onClick={createNewList}>Create</Button>
            </Space.Compact>

            {(createdListId || form.getFieldValue('contact_list_id')) && (
              <Dragger
                accept=".csv,.xlsx,.xls"
                beforeUpload={handleFileUpload}
                showUploadList={false}
              >
                <p className="ant-upload-drag-icon">
                  {uploadLoading ? <Spin /> : <InboxOutlined />}
                </p>
                <p className="ant-upload-text">Click or drag CSV/Excel to upload contacts</p>
                <p className="ant-upload-hint">
                  Required column: <strong>phone</strong>. Optional: name, email + custom columns.
                </p>
              </Dragger>
            )}

            {uploadResult && (
              <Alert
                style={{ marginTop: 16 }}
                type="success"
                message={`Imported ${uploadResult.imported} contacts`}
                description={
                  <Space direction="vertical" size={2}>
                    <span>Total in file: {uploadResult.total_in_file}</span>
                    <span>Invalid numbers: {uploadResult.invalid_in_file}</span>
                    <span>Duplicates removed: {uploadResult.file_duplicates_removed}</span>
                    <span>Blacklisted skipped: {uploadResult.blacklisted_skipped}</span>
                  </Space>
                }
              />
            )}

            {selectedList && (
              <Card size="small" style={{ marginTop: 16, background: '#f0f7ff' }}>
                <Row gutter={16}>
                  <Col span={12}><Statistic title="Total Contacts" value={selectedList.total_contacts} /></Col>
                  <Col span={12}><Statistic title="Valid Contacts" value={selectedList.valid_contacts} /></Col>
                </Row>
              </Card>
            )}

            <Button
              type="primary"
              style={{ marginTop: 24 }}
              block
              disabled={!selectedList && !form.getFieldValue('contact_list_id')}
              onClick={() => setStep(1)}
            >
              Continue
            </Button>
          </Card>
        )}

        {/* Step 1: Compose */}
        {step === 1 && (
          <Card bordered={false} style={{ borderRadius: 16 }}>
            <Title level={4}>Compose Message</Title>

            <Form.Item label="Channel" required>
              <Select
                value={channel}
                onChange={(v) => setChannel(v)}
                options={[
                  { label: <span><MessageOutlined /> SMS only</span>, value: 'sms' },
                  { label: <span><WhatsAppOutlined /> WhatsApp only</span>, value: 'whatsapp' },
                  { label: <span><MessageOutlined /> + <WhatsAppOutlined /> SMS & WhatsApp</span>, value: 'both' },
                ]}
              />
            </Form.Item>

            {(channel === 'whatsapp' || channel === 'both') && (
              <Form.Item label="WhatsApp Template (optional)" name="template_id">
                <Select
                  placeholder="Select approved template or use custom message"
                  allowClear
                  options={templates.map(t => ({
                    label: `${t.name} (${t.language})`,
                    value: t.id,
                  }))}
                />
              </Form.Item>
            )}

            <Form.Item label="Message" name="message" rules={[{ required: true, message: 'Message is required' }]}>
              <TextArea
                rows={5}
                placeholder="Type your message here..."
                showCount
                maxLength={1600}
                onChange={e => handleMessageChange(e.target.value)}
              />
            </Form.Item>
            {channel !== 'whatsapp' && (
              <div style={{ color: '#8c8c8c', fontSize: 12, marginTop: -12, marginBottom: 16 }}>
                {charCount} chars · {smsUnits} SMS unit{smsUnits > 1 ? 's' : ''} per contact
              </div>
            )}

            <Space>
              <Button onClick={() => setStep(0)}>Back</Button>
              <Button type="primary" onClick={() => { form.validateFields(['message']); setStep(2); }}>
                Continue
              </Button>
            </Space>
          </Card>
        )}

        {/* Step 2: Options */}
        {step === 2 && (
          <Card bordered={false} style={{ borderRadius: 16 }}>
            <Title level={4}>Campaign Options</Title>

            {channel !== 'whatsapp' && (
              <Form.Item label="Custom Sender ID">
                <Switch checked={useCustomSender} onChange={setUseCustomSender} />
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 13 }}>
                  KES 500/month — replace shortcode with your brand name
                </Text>
              </Form.Item>
            )}

            {useCustomSender && (
              <Form.Item name="sender_id" label="Sender ID" rules={[{ required: true, max: 11, message: 'Max 11 chars' }]}>
                <Input placeholder="e.g. SHOPNAME" maxLength={11} />
              </Form.Item>
            )}

            <Form.Item label="Schedule Campaign">
              <Switch checked={isScheduled} onChange={setIsScheduled} />
              <Text type="secondary" style={{ marginLeft: 8, fontSize: 13 }}>
                Send at a specific date/time
              </Text>
            </Form.Item>

            {isScheduled && (
              <Form.Item name="scheduled_at" label="Schedule Date & Time" rules={[{ required: true }]}>
                <DatePicker
                  showTime
                  format="YYYY-MM-DD HH:mm"
                  style={{ width: '100%' }}
                  disabledDate={(d) => d.isBefore(dayjs(), 'day')}
                />
              </Form.Item>
            )}

            <Form.Item label="Report Theme Color">
              <Space>
                <ColorPicker
                  value={reportColor}
                  onChange={(c) => setReportColor(c.toHexString())}
                  presets={[{
                    label: 'Brand Colors',
                    colors: ['#1890ff', '#52c41a', '#722ed1', '#fa8c16', '#f5222d', '#13c2c2'],
                  }]}
                />
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Used in your campaign PDF report
                </Text>
              </Space>
            </Form.Item>

            <Space>
              <Button onClick={() => setStep(1)}>Back</Button>
              <Button type="primary" onClick={handleCreateCampaign} loading={loading}>
                Create Campaign
              </Button>
            </Space>
          </Card>
        )}

        {/* Step 3: Review & Pay */}
        {step === 3 && (
          <Card bordered={false} style={{ borderRadius: 16 }}>
            <Title level={4}>Review & Pay</Title>

            <Card size="small" style={{ background: '#f0f7ff', marginBottom: 20 }}>
              <Row gutter={[16, 8]}>
                <Col span={12}><Text type="secondary">Channel:</Text> <strong>{channel.toUpperCase()}</strong></Col>
                <Col span={12}><Text type="secondary">Contacts:</Text> <strong>{selectedList?.valid_contacts}</strong></Col>
                {useCustomSender && <Col span={12}><Text type="secondary">Custom Sender ID:</Text> <strong>{form.getFieldValue('sender_id')}</strong></Col>}
                {isScheduled && <Col span={12}><Text type="secondary">Scheduled:</Text> <strong>{form.getFieldValue('scheduled_at')?.format('DD MMM YYYY HH:mm')}</strong></Col>}
              </Row>
            </Card>

            {costEstimate && (
              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {costEstimate.sms_cost > 0 && (
                  <Col span={8}>
                    <Statistic title="SMS Cost" value={costEstimate.sms_cost} prefix="KES" precision={2} />
                  </Col>
                )}
                {costEstimate.whatsapp_cost > 0 && (
                  <Col span={8}>
                    <Statistic title="WhatsApp Cost" value={costEstimate.whatsapp_cost} prefix="KES" precision={2} />
                  </Col>
                )}
                {costEstimate.custom_sender_id_fee > 0 && (
                  <Col span={8}>
                    <Statistic title="Sender ID Fee" value={costEstimate.custom_sender_id_fee} prefix="KES" precision={2} />
                  </Col>
                )}
                <Col span={24}>
                  <Card size="small" style={{ background: costEstimate.total > walletBalance ? '#fff1f0' : '#f6ffed' }}>
                    <Row justify="space-between" align="middle">
                      <Col>
                        <Title level={4} style={{ margin: 0 }}>Total: KES {costEstimate.total.toFixed(2)}</Title>
                        <Text type="secondary">Wallet Balance: KES {walletBalance.toFixed(2)}</Text>
                      </Col>
                      <Col>
                        {costEstimate.total > walletBalance ? (
                          <Tag color="error">Insufficient balance</Tag>
                        ) : (
                          <Tag color="success">Sufficient balance</Tag>
                        )}
                      </Col>
                    </Row>
                  </Card>
                </Col>
              </Row>
            )}

            {costEstimate && costEstimate.total > walletBalance && (
              <Alert
                message="Insufficient wallet balance"
                description={`You need KES ${(costEstimate.total - walletBalance).toFixed(2)} more. Top up your wallet before sending.`}
                type="error"
                showIcon
                action={<Button size="small" onClick={() => navigate('/wallet')}>Top Up</Button>}
                style={{ marginBottom: 16 }}
              />
            )}

            <Space>
              <Button onClick={() => setStep(2)}>Back</Button>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handlePayAndSend}
                loading={loading}
                disabled={costEstimate ? costEstimate.total > walletBalance : false}
                size="large"
              >
                {isScheduled ? 'Pay & Schedule' : 'Pay & Send Now'}
              </Button>
            </Space>
          </Card>
        )}
      </Form>
    </div>
  );
};

export default NewCampaign;
