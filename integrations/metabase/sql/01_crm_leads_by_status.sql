-- Metabase: CRM — تعداد لید به تفکیک وضعیت
SELECT status, COUNT(*) AS n
FROM crm_leads
GROUP BY status
ORDER BY n DESC;
