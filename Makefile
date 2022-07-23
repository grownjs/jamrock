PWD=$(shell pwd)

MAILDEV=YES
BROWSER=chrome:headless
GIT_REVISION=$(shell git rev-parse --short=7 HEAD)

ifneq ($(wildcard .env),)
	include .env
endif

export MAILDEV GIT_REVISION

.PHONY: seed dist

ci:
	@npm run lint
	@npm run test:ci
ifneq ($(CI),)
	@npm run codecov
endif
	@make -s demo
	@make -sC seed prune

test:
	@time node scripts/test
	@JS_DOM=1 time node scripts/test
	@HAPPY_DOM=1 time node scripts/test

e2e:
	@npx testcafe $(BROWSER) tests/e2e/cases --colors -a 'make -sC seed start' --debug-on-fail

shot:
	@rm -rf seed/cache.json seed/build
	@make -sC seed dist

check: build
ifneq ($(CI),)
	@npm run lint
endif
	@LCOV_OUTPUT=html npm run test:ci

dist:
	@VERSION=$(shell jq -r .version package.json) NODE_ENV=production npm run build

nodejs\:build:
	@node scripts/node-build.mjs
nodejs:
	@node scripts/node-server.mjs

deno\:build:
	@deno run --allow-read --allow-write --allow-env --allow-run --node-modules-dir scripts/deno-build.ts
deno:
	@deno run --no-check --unstable --allow-env --allow-net --allow-read --import-map imports.json scripts/deno-server.ts

bun\:build:
	@bun run scripts/bun-build.js
bun:
	@bun run scripts/bun-server.js

smoke:
	@deno run --no-check --allow-read scripts/smoke.mjs
	@bun run scripts/smoke.mjs
	@node scripts/smoke.mjs

seed: deps
	@make -sC seed dist

dev: deps
	@npm run watch & make -s client

clean:
	@rm -rf seed/build cache.json index.toml .coverage
	@rm -rf dist generated node_modules .nyc_output
	@make -sC seed clean

prune: clean
	@rm -f cache.json seed/cache.json
	@rm -rf node_modules seed/node_modules

build: deps
	@npm run build -- -f --verbose

client:
	@npm run watch:browser

source: deps
	@npm link
	@make -s install

watch: seed
	@npm test -- -w

install: deps
	@make -sC seed deps
	@(cd seed && npm link jamrock)
	@make -sC seed install

deps:
	@(((ls node_modules | grep .) > /dev/null 2>&1) || npm i) || true
