-- Metabase: Visits — ویزیت‌های هفت روز اخیر
SELECT status, COUNT(*) AS n
FROM visits
WHERE scheduled_at >= NOW() - INTERVAL '7 days'
GROUP BY status
ORDER BY n DESC;
