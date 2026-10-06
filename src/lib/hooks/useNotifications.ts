'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { DbNotification, NotificationType } from '@/types/database';

interface UseNotificationsReturn {
  notifications: DbNotification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (ids: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismiss: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useNotifications(userId: string | null): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<DbNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetch = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    setNotifications(data ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetch();

    if (!userId) return;

    // Realtime subscription for new notifications
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications(prev => [payload.new as DbNotification, ...prev]);
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetch]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = useCallback(async (ids: string[]) => {
    await supabase.rpc('mark_notifications_read', { p_notification_ids: ids });
    setNotifications(prev =>
      prev.map(n => ids.includes(n.id) ? { ...n, is_read: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await markAsRead(unreadIds);
  }, [notifications, markAsRead]);

  const dismiss = useCallback(async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead, dismiss, refetch: fetch };
}

// ─── Helper: create a notification (service-side, called from API routes) ────
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  options?: { actionUrl?: string; metadata?: Record<string, unknown> }
) {
  return supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    body,
    action_url: options?.actionUrl ?? null,
    metadata: options?.metadata ?? {},
  });
}
