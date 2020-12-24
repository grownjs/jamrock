PWD=$(shell pwd)

MAILDEV=YES
BROWSER=chrome:headless
GIT_REVISION=$(shell git rev-parse --short=7 HEAD)

ifneq ($(wildcard .env),)
	include .env
endif

export MAILDEV GIT_REVISION

.PHONY: seed

ci:
	@npm run lint
	@npm run test:ci
ifneq ($(CI),)
	@npm run codecov
endif
	@make -s demo
	@make -sC seed prune

demo:
	@node demo
	@SYNC=1 node demo
	@BUNDLE=1 node demo

e2e:
	@npx testcafe $(BROWSER) tests/e2e/cases --colors -a 'make -sC seed start' --debug-on-fail

shot:
	@rm -rf seed/cache.json seed/build
	@make -sC seed dist

check: build
	@npm run lint
	@LCOV_OUTPUT=html npm run test:ci

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
