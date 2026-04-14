PWD=$(shell pwd)
GJS_ARGS="--help"
UNAME_S=$(shell uname -s)

BROWSER ?= chrome:headless
TARGET_BRANCH=gh-pages
NODE_ENV=production

FROM_BRANCH=next
FROM_FOLDER=build/static
COMMIT_MESSAGE=Release: $(shell date)

MAILDEV=1
EDITOR=zed
DIST_TASK=dist
FORCE_COLOR=1
GIT_REVISION=$(shell git rev-parse --short=7 HEAD)

LIB_ADWAITA=/opt/homebrew/Cellar/libadwaita/1.8.3/lib
LIB_CAIRO=/opt/homebrew/Cellar/cairo/1.18.4/lib
LIB_PANGO=/opt/homebrew/Cellar/pango/1.57.0_1/lib
LIB_SOUP=/opt/homebrew/Cellar/libsoup/3.6.5/lib
LIB_GDK=/opt/homebrew/Cellar/gdk-pixbuf/2.44.4/lib
LIB_GTK4=/opt/homebrew/Cellar/gjs/1.86.0/lib:/opt/homebrew/Cellar/gtk4/4.20.3/lib
LIB_PATH=$(LIB_GTK4):$(LIB_PANGO):$(LIB_GDK):$(LIB_SOUP):$(LIB_ADWAITA):$(LIB_CAIRO)

ifneq ($(wildcard .env),)
	include .env
endif

export EDITOR APP_KEY MAILDEV FORCE_COLOR GIT_REVISION DYLD_LIBRARY_PATH LIB_PATH

.PHONY: seed dist docs install examples coverage playground

ci: dist smoke

coverage:
ifneq ($(GITHUB_ENV),)
	@npm run codecov
endif

ci\:dev:
	@make ci CI=1 BROWSER=chromium:headless
ci\:full:
	@make ci CI=1 DIST_TASK=dist:min

check:
	@npm run build:types
	@npm run lint

test: dist smoke
	@make -s test-bun || true
	@make -s test-deno || true
	@make -s winterjs-test || true

test-ci:
	@make -s gjs-test
	@make -s test-nodejs
	@make -s test-bun
	@make -s test-deno

test-bun:
	@echo "== bun =="
	@make -s bun:build CI=1
	@bun run scripts/bun-testing.js
	@HAPPY_DOM=1 bun run scripts/bun-testing.js
	@make -s seed:bun
	@bun run scripts/check.ts
	@make -s e2e:bun
test-deno:
	@echo "== deno =="
	@make -s deno:build CI=1
	@make -s deno:test
	@DENO_DOM=1 make -s deno:test
	@make -s seed:deno
	@deno run --import-map=import_map.json --node -A scripts/check.ts
	@make -s e2e:deno
test-nodejs:
	@echo "== node =="
	@make -s nodejs:build CI=1
	@node scripts/node-testing.mjs
	@JS_DOM=1 node scripts/node-testing.mjs
	@HAPPY_DOM=1 node scripts/node-testing.mjs
	@make -s seed:node
	@node --experimental-transform-types scripts/check.ts
	@make -s e2e:node

docs:
	@bin/node dev --src ./userguide --host 127.0.0.1
index:
	@bin/node build --src ./userguide
	@bin/node write NODE_ENV=production
	@npx -y pagefind --site $(FROM_FOLDER) --serve
dist-docs:
	@rm -rf userguide/pagefind/*
	@bin/node build --src ./userguide --write NODE_ENV=production # --target /jamrock
	@npx -y pagefind --site $(FROM_FOLDER)

playground:
	@node playground/server.mjs

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

start\:gjs:
	@bin/gjs serve --port 3000 --src examples $(START_FLAGS)
start\:%:
	@bin/$* serve --port 3000 --src examples $(START_FLAGS)

e2e\:%:
	@npx testcafe '$(BROWSER) --disable-features=LocalNetworkAccessChecks' tests/e2e/cases --colors -a 'make start:$*' -S $(TESTCAFE_FLAGS)
	@rm -rf build

e2e:
	@make dist
	@bin/node serve --src examples/ --watch
dev: deps
	@npm run dev
shot:
	@make -sC seed dist

smoke:
	@rm -rf generated
	@npm run lint
	@npm run test:ci
	@npm run test:run -- --examples

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
	@deno run -q --allow-all --import-map=import_map.json --unstable --node scripts/deno-testing.ts
deno: deno-deps
	@deno run -q --no-check --import-map=import_map.json --unstable --allow-all scripts/deno-server.ts

bun\:build:
	@bun run scripts/bun-build.js
bun:
	@bun run scripts/bun-server.js

gjs-esm:
	@gjs -m scripts/esm-check.js || true

gjs-async-test:
ifeq ($(UNAME_S),Darwin)
	@for i in 1 2 3 4 5 6 7 8; do \
		printf "  handler$$i: "; \
		env DYLD_LIBRARY_PATH=$(LIB_PATH) gjs -m scripts/soup-async-test.mjs $$i 2>&1 | tail -1; \
	done
else
	@for i in 1 2 3 4 5 6 7 8; do \
		printf "  handler$$i: "; \
		gjs -m scripts/soup-async-test.mjs $$i 2>&1 | tail -1; \
	done
endif

gjs-async-server:
ifeq ($(UNAME_S),Darwin)
	@env DYLD_LIBRARY_PATH=$(LIB_PATH) gjs -m scripts/gjs-server-test.mjs 2>&1
else
	@gjs -m scripts/gjs-server-test.mjs 2>&1
endif

gjs-gtk4-renderer:
ifeq ($(UNAME_S),Darwin)
	@env DYLD_LIBRARY_PATH=$(LIB_PATH) gjs -m scripts/gtk4-widgets.js 2>&1
else
	@gjs -m scripts/gtk4-widgets.js 2>&1
endif

gjs-test: gjs-esm
	@make -s gjs-check GJS_ARGS="init x-gtk-sandbox --force"
	@make -s gjs-check GJS_ARGS="build --src x-gtk-sandbox"
	@make -s gjs-check GJS_ARGS="route --src x-gtk-sandbox"
	@make -s gjs-check GJS_ARGS="build --write --src x-gtk-sandbox"

gjs-serve:
	@make -s gjs-check GJS_ARGS="dev --src x-gtk-sandbox"
gjs-route:
	@make -s gjs-check GJS_ARGS="route --src x-gtk-sandbox"

gjs-check:
	@bin/gjs $(GJS_ARGS)

vendor:
	@npx bun run scripts/bundle-vendor.mjs

gjs-css-test:
ifeq ($(UNAME_S),Darwin)
	env DYLD_LIBRARY_PATH=$(LIB_PATH) gjs -m scripts/gjs-css-test.mjs 2>&1
else
	gjs -m scripts/gjs-css-test.mjs 2>&1
endif

#dev: deps
#	@npm run watch
# & make -s client

clean: clean-ts
	@rm -rf dist generated coverage .nyc_output
clean-ts:
	@rm -rf build scripts/routes.d.ts

prune: clean
	@rm -f package-lock.json
	@rm -rf lib/vendor
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
	@deno run $(DENO_FLAGS) -q --allow-all --unstable lib/deno/deps.js
deno-deps\:%:
	@make -s deno-deps DENO_FLAGS="--$(subst :, --,$*)"

winterjs-test:
	@echo "== winterjs =="
	@wasmer run wasmer/winterjs --volume=$(PWD):$(PWD) -- exec lib/winterjs/test.js

txiki-server-test:
	@echo "== txiki integration =="
	@tjs run scripts/txiki-server-test.mjs

winterjs-server-test:
	@echo "== winterjs integration =="
	@wasmer run wasmer/winterjs --net \
	  --volume=$(PWD):$(PWD) \
	  -- $(PWD)/scripts/winterjs-server-test.mjs & \
	  PID=$$!; \
	  sleep 2; \
	  BODY=$$(curl -s http://localhost:8080/pages); \
	  if echo "$$BODY" | grep -q "WinterJS HTTP test"; then \
	    echo "PASS (status=200 body=\"$$BODY\")"; \
	    kill $$PID 2>/dev/null; \
	  else \
	    echo "FAIL (body=\"$$BODY\")"; \
	    kill $$PID 2>/dev/null; \
	    exit 1; \
	  fi

runtime-integration-tests: gjs-async-server txiki-server-test winterjs-server-test
