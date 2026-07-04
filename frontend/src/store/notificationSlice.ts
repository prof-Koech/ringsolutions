import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Notification } from '../types';

interface NotificationState {
  items: Notification[];
  unreadCount: number;
}

const initialState: NotificationState = {
  items: [],
  unreadCount: 0,
};

export const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setNotifications(state, action: PayloadAction<{ notifications: Notification[]; unread_count: number }>) {
      state.items = action.payload.notifications;
      state.unreadCount = action.payload.unread_count;
    },
    markAllRead(state) {
      state.items = state.items.map(n => ({ ...n, is_read: true }));
      state.unreadCount = 0;
    },
    decrementUnread(state) {
      state.unreadCount = Math.max(0, state.unreadCount - 1);
    },
  },
});

export const { setNotifications, markAllRead, decrementUnread } = notificationSlice.actions;
export default notificationSlice.reducer;
