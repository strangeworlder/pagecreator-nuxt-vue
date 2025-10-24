.PHONY: dev build-ssr run-ssr build-static run-static stop logs sh generate test lint typecheck validate-content biome-check biome-format test-run

dev:
	docker compose -f docker-compose.dev.yml up --build

stop:
	docker compose -f docker-compose.dev.yml down

logs:
	docker compose -f docker-compose.dev.yml logs -f

sh:
	docker compose -f docker-compose.dev.yml exec web sh

build-ssr:
	docker build -t tss-ssr --target runner-ssr .


run-ssr:
	docker run --rm -p 3000:3000 --env-file .env tss-ssr

build-static:
	docker build -t tss-static --target runner-static .

run-static:
	docker run --rm -p 8080:80 tss-static

generate:
	docker build -t tss-gen --target build-static . && docker create --name tss-gen tss-gen && docker cp tss-gen:/app/.output/public ./dist && docker rm tss-gen

test:
	docker compose -f docker-compose.dev.yml run --rm web sh -lc "corepack enable && pnpm test"

lint:
	docker compose -f docker-compose.dev.yml run --rm web sh -lc "corepack enable && pnpm lint"

typecheck:
	docker compose -f docker-compose.dev.yml run --rm web sh -lc "corepack enable && pnpm typecheck"

validate-content:
	docker compose -f docker-compose.dev.yml run --rm web sh -lc "corepack enable && pnpm validate:content"

biome-check:
	docker compose -f docker-compose.dev.yml run --rm web sh -lc "corepack enable && pnpm biome:check"

biome-format:
	docker compose -f docker-compose.dev.yml run --rm web sh -lc "corepack enable && pnpm biome:format"

test-run:
	docker compose -f docker-compose.dev.yml run --rm web sh -lc "corepack enable && pnpm test:run"


