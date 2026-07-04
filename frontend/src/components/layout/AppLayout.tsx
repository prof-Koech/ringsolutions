import React, { useEffect, useState } from 'react';
import { Layout, Menu, Badge, Dropdown, Button, Space, Tag, Drawer } from 'antd';
import {
  DashboardOutlined, MessageOutlined, ContactsOutlined, WalletOutlined,
  BellOutlined, SettingOutlined, LogoutOutlined, BarChartOutlined,
  FileTextOutlined, UserOutlined, MenuOutlined, AppstoreOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useAuth } from '../../hooks/useAuth';
import { AppDispatch } from '../../store';
import { setNotifications, markAllRead } from '../../store/notificationSlice';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import Logo from '../common/Logo';
import RingAvatar from '../common/RingAvatar';
import api from '../../services/api';

const { Header, Sider, Content } = Layout;

const MENU_ITEMS = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/campaigns', icon: <MessageOutlined />, label: 'Campaigns' },
  { key: '/campaigns/new', icon: <ThunderboltOutlined />, label: 'New Campaign' },
  { key: '/contacts', icon: <ContactsOutlined />, label: 'Contacts' },
  { key: '/templates', icon: <AppstoreOutlined />, label: 'WA Templates' },
  { key: '/wallet', icon: <WalletOutlined />, label: 'Wallet' },
  { key: '/reports', icon: <BarChartOutlined />, label: 'Analytics' },
  { key: '/settings', icon: <SettingOutlined />, label: 'Settings' },
];

const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const { user, logout } = useAuth();
  const { unreadCount } = useSelector((s: RootState) => s.notifications);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setLocalNotifications] = useState<{ id: string; title: string; message: string; is_read: boolean; created_at: string }[]>([]);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const resp = await api.get('/notifications/?per_page=10');
      dispatch(setNotifications({
        notifications: resp.data.notifications,
        unread_count: resp.data.unread_count,
      }));
      setLocalNotifications(resp.data.notifications);
    } catch {
      // silent
    }
  };

  const handleMarkAllRead = async () => {
    await api.post('/notifications/mark-read', { ids: [] });
    dispatch(markAllRead());
    setLocalNotifications(n => n.map(x => ({ ...x, is_read: true })));
  };

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: 'Profile' },
      { key: 'settings', icon: <SettingOutlined />, label: 'Settings' },
      { type: 'divider' as const },
      { key: 'logout', icon: <LogoutOutlined />, label: 'Sign Out', danger: true },
    ],
    onClick: ({ key }: { key: string }) => {
      if (key === 'logout') { logout(); navigate('/login'); }
      else if (key === 'settings') navigate('/settings');
      else if (key === 'profile') navigate('/settings');
    },
  };

  const sidebarContent = (
    <>
      <div style={{
        padding: '20px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        marginBottom: 8,
      }}>
        <Logo size={32} showText={!collapsed} light />
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={MENU_ITEMS.map(item => ({
          key: item.key,
          icon: item.icon,
          label: item.label,
          onClick: () => { navigate(item.key); setMobileOpen(false); },
        }))}
        style={{ border: 'none', background: 'transparent' }}
      />
      {user?.is_admin && (
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={[
            {
              key: '/admin',
              icon: <FileTextOutlined />,
              label: 'Admin Panel',
              onClick: () => navigate('/admin'),
            },
          ]}
          style={{ border: 'none', background: 'transparent', marginTop: 8 }}
        />
      )}
    </>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Desktop Sider */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        collapsedWidth={64}
        style={{
          background: 'linear-gradient(180deg, #001529 0%, #002140 100%)',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
        }}
        className="desktop-sider"
      >
        {sidebarContent}
      </Sider>

      {/* Mobile Drawer */}
      <Drawer
        placement="left"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        bodyStyle={{ padding: 0, background: '#001529' }}
        width={220}
      >
        {sidebarContent}
      </Drawer>

      <Layout style={{ marginLeft: collapsed ? 64 : 200, transition: 'margin 0.2s' }}>
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          position: 'sticky',
          top: 0,
          zIndex: 99,
        }}>
          <Space>
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setMobileOpen(true)}
              className="mobile-menu-btn"
              style={{ display: 'none' }}
            />
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a2e' }}>
              {MENU_ITEMS.find(m => location.pathname.startsWith(m.key))?.label || 'Dashboard'}
            </div>
          </Space>

          <Space size={16}>
            {user && !user.is_verified && (
              <Tag color="warning">Email not verified</Tag>
            )}
            <Badge count={unreadCount} overflowCount={9}>
              <Button
                type="text"
                icon={<BellOutlined style={{ fontSize: 18 }} />}
                onClick={() => { setNotifOpen(true); }}
              />
            </Badge>
            <Dropdown menu={userMenu} trigger={['click']}>
              <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <RingAvatar name={user?.full_name} size={36} />
                <div style={{ lineHeight: 1.2 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{user?.full_name}</div>
                  <div style={{ fontSize: 11, color: '#8c8c8c' }}>{user?.email}</div>
                </div>
              </div>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{
          margin: '24px',
          minHeight: 'calc(100vh - 88px)',
        }}>
          <Outlet />
        </Content>
      </Layout>

      {/* Notifications Drawer */}
      <Drawer
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Notifications</span>
            {unreadCount > 0 && (
              <Button type="link" size="small" onClick={handleMarkAllRead}>
                Mark all read
              </Button>
            )}
          </div>
        }
        placement="right"
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        width={380}
      >
        {notifications.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#8c8c8c', padding: 40 }}>No notifications</div>
        ) : (
          notifications.map(n => (
            <div key={n.id} style={{
              padding: '12px 0',
              borderBottom: '1px solid #f0f0f0',
              background: n.is_read ? 'transparent' : '#f0f7ff',
              borderRadius: 8,
              paddingLeft: 12,
              paddingRight: 12,
              marginBottom: 4,
            }}>
              <div style={{ fontWeight: n.is_read ? 400 : 600, fontSize: 14 }}>{n.title}</div>
              <div style={{ color: '#595959', fontSize: 13, marginTop: 2 }}>{n.message}</div>
              <div style={{ color: '#bfbfbf', fontSize: 11, marginTop: 4 }}>
                {new Date(n.created_at).toLocaleString()}
              </div>
            </div>
          ))
        )}
      </Drawer>

      <style>{`
        @media (max-width: 992px) {
          .desktop-sider { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </Layout>
  );
};

export default AppLayout;
