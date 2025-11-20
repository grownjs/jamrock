PWD=$(shell pwd)

FROM_FOLDER=build/public
FROM_BRANCH=next
TARGET_BRANCH=gh-pages
COMMIT_MESSAGE=Release: $(shell date)

NODE_ENV=production
MAILDEV=1
EDITOR=zed
BROWSER=chrome:headless
DIST_TASK=dist
FORCE_COLOR=1
GIT_REVISION=$(shell git rev-parse --short=7 HEAD)

ifneq ($(wildcard .env),)
	include .env
endif

export EDITOR APP_KEY MAILDEV FORCE_COLOR GIT_REVISION

.PHONY: seed dist docs install examples

ci: install clean dist
	@npm run lint
	@npm run test:ci
ifneq ($(CI),)
	@make -s test-ci
endif
ifneq ($(GITHUB_ENV),)
	@npm run codecov
endif

ci\:dev:
	@make ci CI=1 BROWSER=chromium:headless
ci\:full:
	@make ci CI=1 DIST_TASK=dist:min

test: dist
	@npm run test:ci
	@make -s test-nodejs || true
	@make -s test-bun || true
	@make -s test-deno || true

test-ci:
	@make -s test-nodejs
	@make -s test-bun
	@make -s test-deno

test-bun:
	@echo "== bun =="
	@rm -rf node_modules
	@bun install
	@make -s bun:build CI=1
	@bun run scripts/bun-testing.js
	@HAPPY_DOM=1 bun run scripts/bun-testing.js
	@make -s seed:bun
	@bun run scripts/check.ts
	@make -s e2e:bun
test-deno:
	@echo "== deno =="
	@rm -rf node_modules
	@deno install
	@make -s deno:build CI=1
	@make -s deno:test
	@DENO_DOM=1 make -s deno:test
	@make -s seed:deno
	@deno run --import-map=import_map.json -A scripts/check.ts
	@make -s e2e:deno
test-nodejs:
	@echo "== node =="
	@rm -rf node_modules
	@npm install
	@make -s nodejs:build CI=1
	@node scripts/node-testing.mjs
	@JS_DOM=1 node scripts/node-testing.mjs
	@HAPPY_DOM=1 node scripts/node-testing.mjs
	@make -s seed:node
	@node scripts/check.ts
	@make -s e2e:node

docs:
	@bin/node dev --src ./userguide
dist-docs:
	@bin/node build --src ./userguide
	@bin/node write --target jamrock

index:
	@bin/node build --src ./userguide
	@bin/node write NODE_ENV=production
	@npx -y pagefind --site build/public --serve

live:
	@npm pack
	@mv jamrock-0.0.0.tgz build/
	@npm run live -- -w

local: live
	@./install.sh

pages:
	@(git fetch origin $(TARGET_BRANCH) 2> /dev/null || (\
		git checkout --orphan $(TARGET_BRANCH);\
		git rm -rf . > /dev/null;\
		git commit --allow-empty -m "initial commit";\
		git checkout $(FROM_BRANCH)))

deploy: pages
	@(mv $(FROM_FOLDER) .backup > /dev/null 2>&1) || true
	@(git worktree remove $(FROM_FOLDER) --force > /dev/null 2>&1) || true
	@(git worktree add $(FROM_FOLDER) $(TARGET_BRANCH) && (cp -r .backup/* $(FROM_FOLDER) > /dev/null 2>&1)) || true
	@cd $(FROM_FOLDER) && git add . && git commit -m "$(COMMIT_MESSAGE)" || true
	@(mv .backup $(FROM_FOLDER) > /dev/null 2>&1) || true
	@git push origin $(TARGET_BRANCH) -f || true
	@rm -rf $(FROM_FOLDER)/.backup

seed\:%: clean-ts
	@bin/$* build --src examples
	@bin/$* route --dts scripts/routes.d.ts --from ../lib/env

admin:
	@pocketbase migrate
	@pocketbase superuser create yo@soypache.co Password.123

start\:%:
	@bin/$* serve --port 3000 --src examples $(START_FLAGS)

e2e\:%:
	npx testcafe '$(BROWSER) --disable-features=LocalNetworkAccessChecks' tests/e2e/cases --colors -a 'make start:$*' -S $(TESTCAFE_FLAGS)

e2e:
	@make dist
	@bin/node serve --src examples/ --watch
dev: deps
	@npm run dev
shot:
	@make -sC seed dist

check: build
ifneq ($(CI),)
	@npm run lint
endif
	@LCOV_OUTPUT=html npm run test:ci

dist: deps
	@VERSION=$(shell jq -r .version package.json) npm run $(DIST_TASK)

install: deps

nodejs\:build:
	@node --trace-warnings scripts/node-build.mjs
nodejs:
	@node --trace-warnings scripts/node-server.mjs

deno\:build: deno-deps
	@deno run -q --allow-all --import-map=import_map.json --unstable --node-modules-dir scripts/deno-build.ts
deno\:test: deno-deps
	@deno run -q --allow-all --import-map=import_map.json --unstable scripts/deno-testing.ts
deno: deno-deps
	@deno run -q --no-check --import-map=import_map.json --unstable --allow-all scripts/deno-server.ts

bun\:build:
	@bun run scripts/bun-build.js
bun:
	@bun run scripts/bun-server.js

#dev: deps
#	@npm run watch
# & make -s client

clean: clean-ts
	@rm -rf dist/* generated/* .nyc_output
clean-ts:
	@rm -rf build/* scripts/routes.d.ts

prune: clean
	@rm -f deno.lock
	@rm -f cache.json
	@rm -rf node_modules

build: deps
	@npm run build -- -f --verbose

#client:
#	@npm run watch:browser

examples: clean dist
	@bin/node build --src ./examples
server:
	@bin/node serve --src ./examples --watch lib
static:
	@bin/node build --src ./examples --static
preview:
	@npx sirv-cli build/public

source: deps
	@npm link
	@make -s install

watch: seed
	@npm test -- -w

deps:
	@(((ls node_modules | grep .) > /dev/null 2>&1) || npm i) || true

deno-deps:
	@deno run $(DENO_FLAGS) --allow-all --unstable lib/deno/deps.js
deno-deps\:%:
	@make -s deno-deps DENO_FLAGS="--$(subst :, --,$*)"
