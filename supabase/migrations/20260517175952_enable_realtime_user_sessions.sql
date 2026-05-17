-- تفعيل Realtime على جدول user_sessions لإنهاء الجلسات فورياً
-- REPLICA IDENTITY FULL مطلوب حتى يرسل Realtime القيم القديمة والجديدة مع UPDATE events

ALTER TABLE public.user_sessions REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_sessions;
