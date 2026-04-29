api:
	cd apps/api && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

web:
	cd apps/web && npm run dev -- --host 0.0.0.0 --port 5173

test-api:
	cd apps/api && pytest

test-web:
	cd apps/web && npm run test -- --run

lint-web:
	cd apps/web && npm run lint

