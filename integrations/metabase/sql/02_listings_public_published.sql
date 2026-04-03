-- Metabase: Listings — آگهی‌های منتشرشدهٔ عمومی
SELECT COUNT(*) AS published_public
FROM listings
WHERE visibility = 'PUBLIC' AND status = 'published';
