build:
	@docker compose build

up:
	@docker compose up -d

up-attached:
	@docker compose up

down:
	@docker compose down

deploy:
	git fetch origin main
	git reset --hard origin/main
	@docker compose -f compose.prod.yaml up -d --build

deploy-down:
	@docker compose -f compose.prod.yaml down

deploy-dev:
	git fetch origin development
	git reset --hard origin/development
	@docker compose -f compose.dev.yaml up -d --build

deploy-dev-down:
	@docker compose -f compose.dev.yaml down
