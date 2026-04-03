-- Metabase: Revenue — پرداخت‌های تکمیل‌شده (پروکسی درآمد)
SELECT
  DATE_TRUNC('day', updated_at) AS day,
  COUNT(*) AS completed_count,
  COALESCE(SUM(amount_cents), 0) AS total_cents
FROM payment_intents
WHERE status = 'COMPLETED'
GROUP BY 1
ORDER BY 1 DESC
LIMIT 90;
