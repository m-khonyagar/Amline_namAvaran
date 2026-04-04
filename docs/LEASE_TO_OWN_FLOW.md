# فلو اجاره به شرط تملیک (LEASE_TO_OWN)

SSOT kind: `LEASE_TO_OWN` — نوع API: `LEASE_TO_OWN`.

## مراحل

1. `POST /api/v1/contracts/start` با `contract_type: LEASE_TO_OWN`.
2. نقش‌ها: `LESSOR` / `LESSEE` (در terms و parties آینده؛ فعلاً terms از طریق API).
3. `PATCH .../terms` با `LeaseToOwnTerms`: اجاره ماهانه، مدت، قیمت نهایی، سهم اجاره از قیمت، مهلت گزینه خرید.
