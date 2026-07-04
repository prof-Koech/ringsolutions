import React, { useState } from 'react';
import { Button, Row, Col, Card, Space, Divider, Modal, Form, Input, message } from 'antd';
import {
  MessageOutlined, WhatsAppOutlined, ThunderboltOutlined,
  SafetyCertificateOutlined, BarChartOutlined, MobileOutlined,
  CheckCircleFilled, ArrowRightOutlined, GlobalOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import Logo, { RingIcon } from '../components/common/Logo';
import CountUp from '../components/common/CountUp';
import api from '../services/api';

const FEATURES = [
  {
    icon: <MessageOutlined style={{ fontSize: 32, color: '#1890ff' }} />,
    title: 'Bulk SMS',
    desc: "Send thousands of SMS messages instantly across Kenya and Africa using Africa's Talking API with real delivery reports.",
  },
  {
    icon: <WhatsAppOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
    title: 'WhatsApp Business',
    desc: 'Reach customers on WhatsApp using approved templates. Higher open rates, richer media, read receipts.',
  },
  {
    icon: <MobileOutlined style={{ fontSize: 32, color: '#722ed1' }} />,
    title: 'M-Pesa Payments',
    desc: 'Top up your wallet exclusively via M-Pesa Lipa Na STK Push. No card required — pay from your phone.',
  },
  {
    icon: <BarChartOutlined style={{ fontSize: 32, color: '#fa8c16' }} />,
    title: 'Analytics & Reports',
    desc: 'Beautiful branded PDF reports for every campaign. Track delivery rates, open rates, and ROI.',
  },
  {
    icon: <ThunderboltOutlined style={{ fontSize: 32, color: '#f5222d' }} />,
    title: 'Campaign Scheduling',
    desc: 'Schedule campaigns to send at the perfect time. Set it and forget it — we handle the delivery.',
  },
  {
    icon: <SafetyCertificateOutlined style={{ fontSize: 32, color: '#13c2c2' }} />,
    title: 'Opt-Out Management',
    desc: 'GDPR-compliant blacklist management. Contacts who reply STOP are automatically removed.',
  },
];

const PRICING = [
  { channel: 'SMS', price: 'KES 0.80', per: 'per message', color: '#1890ff', icon: <MessageOutlined /> },
  { channel: 'WhatsApp', price: 'KES 1.20', per: 'per message', color: '#52c41a', icon: <WhatsAppOutlined /> },
  { channel: 'Custom Sender ID', price: 'KES 500', per: 'per month', color: '#722ed1', icon: <GlobalOutlined /> },
];

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [form] = Form.useForm();

  const submitSubscribe = async (values: { email: string; name?: string }) => {
    try {
      await api.post('/subscribe', { email: values.email, name: values.name });
      message.success('Subscribed — we will keep you posted');
      setSubscribeOpen(false);
      form.resetFields();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } };
      message.error(err.response?.data?.error || 'Subscription failed');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      {/* Header */}
      <header style={{
        padding: '16px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #f0f0f0',
        position: 'sticky',
        top: 0,
        background: '#fff',
        zIndex: 100,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <Logo size={40} />
        <Space>
          <Button onClick={() => navigate('/login')}>Sign In</Button>
          <Button type="primary" onClick={() => navigate('/register')} size="large">
            Get Started Free
          </Button>
        </Space>
      </header>

      {/* Hero */}
      <section style={{
        background: 'linear-gradient(135deg, #001529 0%, #003a70 50%, #0050b3 100%)',
        padding: '100px 40px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.05 }}>
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              borderRadius: '50%',
              border: '2px solid white',
              width: 60 + i * 40,
              height: 60 + i * 40,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              transform: 'translate(-50%, -50%)',
            }} />
          ))}
        </div>
        <div style={{ position: 'relative', maxWidth: 800, margin: '0 auto' }}>
          {/* Rolling ring hero graphic */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 36 }}>
            <div className="rs-ring-hero">
              <RingIcon size={148} />
            </div>
          </div>

          <h1 style={{
            color: '#fff',
            fontSize: 'clamp(32px, 5vw, 64px)',
            fontWeight: 800,
            lineHeight: 1.15,
            marginBottom: 24,
          }}>
            Send Bulk SMS & WhatsApp<br />
            <span style={{ color: '#40a9ff' }}>Messages at Scale</span>
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: 20,
            maxWidth: 600,
            margin: '0 auto 40px',
            lineHeight: 1.6,
          }}>
            Professional bulk messaging platform powered by Africa's Talking and WhatsApp Business API.
            Pay with M-Pesa. Reach thousands in seconds.
          </p>
          <Space size={16} wrap style={{ justifyContent: 'center' }}>
            <Button
              type="primary"
              size="large"
              onClick={() => navigate('/register')}
              icon={<ArrowRightOutlined />}
              style={{ height: 52, paddingInline: 36, fontSize: 16, fontWeight: 600 }}
            >
              Start Sending Now
            </Button>
            <Button
              size="large"
              onClick={() => navigate('/login')}
              style={{ height: 52, paddingInline: 36, fontSize: 16, background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}
            >
              Sign In
            </Button>
            <Button size="large" onClick={() => setSubscribeOpen(true)} style={{ height: 52 }}>
              Subscribe
            </Button>
          </Space>
          <div style={{ marginTop: 40, display: 'flex', gap: 40, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { end: 10000000, label: 'Messages Sent', format: (n: number) => `${Math.round(n / 1000000)}M+` },
              { end: 99.5, label: 'Uptime SLA', decimals: 1, format: (n: number) => `${n.toFixed(1)}%` },
              { end: 3, label: 'Average Delivery', prefix: '<', suffix: 's', format: (n: number) => `< ${n.toFixed(0)}s` },
              { end: 0.8, label: 'SMS Rate', decimals: 2, format: (n: number) => `KES ${n.toFixed(2)}` },
            ].map(stat => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#40a9ff' }}>
                  <CountUp end={stat.end} duration={900} decimals={stat.decimals || 0} formatter={stat.format} />
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '80px 40px', background: '#fafafa' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 36, fontWeight: 800, color: '#001529' }}>Everything You Need</h2>
            <p style={{ color: '#595959', fontSize: 16 }}>One platform for all your bulk messaging needs</p>
          </div>
          <Row gutter={[24, 24]}>
            {FEATURES.map(f => (
              <Col xs={24} sm={12} lg={8} key={f.title}>
                <Card
                  bordered={false}
                  style={{
                    height: '100%',
                    borderRadius: 16,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                  hoverable
                >
                  <div style={{ marginBottom: 16 }}>{f.icon}</div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
                  <p style={{ color: '#595959', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* How it Works */}
      <section style={{ padding: '80px 40px', background: '#fff' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 8 }}>How It Works</h2>
          <p style={{ color: '#595959', marginBottom: 56, fontSize: 16 }}>Start sending in under 5 minutes</p>
          <Row gutter={[32, 32]}>
            {[
              { step: '01', title: 'Create Account', desc: 'Register with email, verify, and log in.' },
              { step: '02', title: 'Top Up via M-Pesa', desc: 'Use Lipa Na M-Pesa STK Push to fund your wallet.' },
              { step: '03', title: 'Upload Contacts', desc: 'Import your contact list from CSV or Excel.' },
              { step: '04', title: 'Send Campaign', desc: 'Compose your message, choose SMS/WhatsApp, and send.' },
            ].map(s => (
              <Col xs={24} sm={12} md={6} key={s.step}>
                <div style={{
                  background: 'linear-gradient(135deg, #e6f7ff, #bae7ff)',
                  borderRadius: 50,
                  width: 64,
                  height: 64,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: '#1890ff' }}>{s.step}</span>
                </div>
                <h3 style={{ fontWeight: 700 }}>{s.title}</h3>
                <p style={{ color: '#595959' }}>{s.desc}</p>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* Pricing */}
      <section style={{ padding: '80px 40px', background: '#f0f7ff' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 36, fontWeight: 800, marginBottom: 8 }}>Simple Pricing</h2>
          <p style={{ color: '#595959', marginBottom: 56, fontSize: 16 }}>Pay only for what you send. No monthly fees.</p>
          <Row gutter={[24, 24]} justify="center">
            {PRICING.map(p => (
              <Col xs={24} sm={8} key={p.channel}>
                <Card
                  bordered={false}
                  style={{ borderRadius: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', textAlign: 'center' }}
                >
                  <div style={{ fontSize: 28, color: p.color, marginBottom: 8 }}>{p.icon}</div>
                  <div style={{ fontSize: 14, color: '#8c8c8c', marginBottom: 4 }}>{p.channel}</div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: p.color }}>{p.price}</div>
                  <div style={{ color: '#8c8c8c' }}>{p.per}</div>
                </Card>
              </Col>
            ))}
          </Row>
          <div style={{ marginTop: 32 }}>
            {['Prepaid wallet — no credit needed', 'No setup fees', 'No monthly minimums', 'M-Pesa payments only'].map(f => (
              <div key={f} style={{ marginBottom: 8 }}>
                <CheckCircleFilled style={{ color: '#52c41a', marginRight: 8 }} />
                {f}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{
        background: 'linear-gradient(135deg, #1890ff, #0050b3)',
        padding: '80px 40px',
        textAlign: 'center',
      }}>
        <h2 style={{ color: '#fff', fontSize: 36, fontWeight: 800, marginBottom: 16 }}>
          Ready to Reach Your Audience?
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 18, marginBottom: 32 }}>
          Join businesses using RingSolutions to connect with their customers.
        </p>
        <Button
          type="primary"
          size="large"
          onClick={() => navigate('/register')}
          style={{
            background: '#fff',
            color: '#1890ff',
            fontWeight: 700,
            height: 52,
            paddingInline: 40,
            fontSize: 16,
            border: 'none',
          }}
        >
          Create Free Account
        </Button>
      </section>

      {/* Footer */}
      <footer style={{ padding: '24px 40px', background: '#001529', color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
        <Logo size={28} light />
        <Divider style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '16px 0' }} />
        <p style={{ margin: 0 }}>© {new Date().getFullYear()} RingSolutions | support@ringsolutions.com | ringsolutions.com</p>
      </footer>
      <Modal
        title="Subscribe for updates"
        open={subscribeOpen}
        onCancel={() => setSubscribeOpen(false)}
        okText="Subscribe"
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={submitSubscribe}>
          <Form.Item name="name" label="Name">
            <Input placeholder="Optional name" />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Email required' }, { type: 'email', message: 'Enter a valid email' }] }>
            <Input placeholder="you@company.com" />
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        /*
         * Rolling-wheel entrance for the hero ring.
         *
         * Physics: a wheel rolling RIGHT rotates CLOCKWISE.
         * In CSS clockwise = positive degrees, so we go from negative → 0.
         * translateX(-100vw) → translateX(0): ring slides right.
         * rotate(-720deg) → rotate(0deg): ring spins clockwise (two full turns).
         * Combined, this is exact rolling physics.
         *
         * After the entrance, ring-idle takes over the transform property
         * and spins the ring slowly forever. No visual jump because both
         * animations share rotate(0deg) at the handoff point.
         */
        @keyframes rs-ring-roll-in {
          0% {
            transform: translateX(-100vw) rotate(-720deg);
            opacity: 0;
            filter: drop-shadow(0 0 0px rgba(64,169,255,0));
          }
          20% { opacity: 1; }
          82% {
            transform: translateX(8px) rotate(6deg);
            filter: drop-shadow(0 0 32px rgba(64,169,255,0.9));
          }
          100% {
            transform: translateX(0) rotate(0deg);
            opacity: 1;
            filter: drop-shadow(0 0 22px rgba(64,169,255,0.55));
          }
        }
        @keyframes rs-ring-idle {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .rs-ring-hero {
          animation:
            rs-ring-roll-in 1.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards,
            rs-ring-idle 14s linear 1.4s infinite;
          will-change: transform;
          display: inline-block;
          filter: drop-shadow(0 0 22px rgba(64,169,255,0.55));
        }
        @media (prefers-reduced-motion: reduce) {
          .rs-ring-hero {
            animation: rs-ring-idle 14s linear infinite;
          }
        }
      `}</style>
    </div>
  );
};

export default Landing;
