# G-TEK Open Campus Ops & Backup Runbook

## 1. Database Backups
To take a snapshot of the production PostgreSQL database:
```bash
docker exec -t gtek-db pg_dump -U postgres gtek-open-campus > backup_$(date +%Y%m%d).sql
```

## 2. Restoring a Backup
```bash
cat backup_20261006.sql | docker exec -i gtek-db psql -U postgres gtek-open-campus
```

## 3. Slow Query Logging
The Postgres container is configured to log any query taking longer than 1000ms. Check the logs:
```bash
docker logs gtek-db | grep "duration:"
```

## 4. Scheduled Jobs (Cron)
Materialized views should be refreshed nightly via a cron job making a POST request to `/api/v1/reporting/refresh-views`.
