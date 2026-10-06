# Deployment Playbook

## 1. Staging Environment
Before rolling out to production, build and deploy the Docker image to a staging server:
```bash
docker-compose -f docker-compose.staging.yml up -d --build
```
Run the test suite against the staging database:
```bash
docker exec -t gtek-app pytest tests/
```

## 2. Production Deployment Steps
1. **Freeze Code:** Tag the release in Git (`git tag v1.0.0`).
2. **Build Docker Image:** Build and push the image to a container registry (ECR, DockerHub).
3. **Database Migration:** Run Alembic migrations against the production database:
   ```bash
   alembic upgrade head
   ```
4. **Deploy App:** Perform a rolling restart of the FastAPI containers to minimize downtime.
5. **Verify:** Check `/docs` and the `/` health check endpoint. Run a manual smoke test on login and transcript generation.

## 3. Rollback Strategy
If the API fails to start, immediately roll back to the previous Docker image tag.
If a database migration caused the issue, downgrade using:
```bash
alembic downgrade -1
```
(Note: Never drop tables in migrations without a solid backup).
