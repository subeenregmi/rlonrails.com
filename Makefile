build:
	@docker compose build

up:
	@docker compose up -d

up-attached:
	@docker compose up

down:
	@docker compose down

# The homeserver's deploy key runs a fixed command, so `deploy` is the only
# target a push or a release can reach. It moves production to the newest
# release tag and then hands off to the development checkout beside it, which
# is what lets one command serve both sites.
DEV_CHECKOUT ?= ../dev.rlonrails.com

deploy:
	git fetch origin --tags --force
	@tag=$$(git tag -l 'v*' --sort=-v:refname | grep -v -- '-' | head -n1); \
	  test -n "$$tag" || { echo "no stable v* tag yet, leaving production as it is"; exit 0; }; \
	  echo "production -> $$tag"; \
	  git reset --hard "$$tag"; \
	  docker compose -f compose.prod.yaml up -d --build
	-@if [ -f $(DEV_CHECKOUT)/Makefile ]; then make -C $(DEV_CHECKOUT) deploy-dev; else echo "no development checkout at $(DEV_CHECKOUT), skipping"; fi

deploy-down:
	@docker compose -f compose.prod.yaml down

deploy-dev:
	git fetch origin main
	git reset --hard origin/main
	@docker compose -f compose.dev.yaml up -d --build

deploy-dev-down:
	@docker compose -f compose.dev.yaml down
