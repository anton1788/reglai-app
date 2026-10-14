// supabase/functions/send-push/index.ts
// ═══════════════════════════════════════════════════════════
// 🔔 Edge Function: рассылка Web Push
// Вызывается автоматически Database Webhook'ом
// при INSERT INTO notifications
// ═══════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'https://esm.sh/web-push@3.6.7';

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')!;
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!;
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:support@reglai.ru';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

serve(async (req) => {
  try {
    const payload = await req.json();
    const notification = payload.record || payload;

    console.log('[send-push] Received:', JSON.stringify(notification));

    if (!notification?.user_id) {
      return new Response(JSON.stringify({ error: 'no user_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', notification.user_id);

    if (error) throw error;

    if (!subs || subs.length === 0) {
      console.log('[send-push] No subscriptions for user', notification.user_id);
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const relatedData = notification.related_data || {};
    let targetUrl = '/';
    if (relatedData.action === 'open_application' && relatedData.application_id) {
      targetUrl = `/?open=application&id=${relatedData.application_id}`;
    } else if (relatedData.action === 'open_chat' && relatedData.chat_id) {
      targetUrl = `/?open=chat&id=${relatedData.chat_id}`;
    } else if (relatedData.action === 'open_warehouse') {
      targetUrl = '/?view=warehouse';
    }

    const pushPayload = JSON.stringify({
      id: notification.id,
      title: notification.title || 'Реглай',
      body: notification.message || 'Новое уведомление',
      url: targetUrl,
      icon: '/icon-192.png',
      badge: '/icon-96.png',
    });

    const results = await Promise.allSettled(
      subs.map((sub) =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          pushPayload
        )
      )
    );

    const deadEndpoints: string[] = [];
    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        const code = (r.reason as any)?.statusCode;
        console.warn('[send-push] Send failed:', code, r.reason?.message);
        if (code === 410 || code === 404) {
          deadEndpoints.push(subs[i].endpoint);
        }
      }
    });

    if (deadEndpoints.length > 0) {
      await supabase.from('push_subscriptions').delete().in('endpoint', deadEndpoints);
      console.log('[send-push] Removed dead subscriptions:', deadEndpoints.length);
    }

    const sent = results.filter((r) => r.status === 'fulfilled').length;

    return new Response(JSON.stringify({ ok: true, sent, total: subs.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[send-push] ERROR:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});