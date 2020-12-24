dev:
	@fkill -s :3000 :1081
	@make -s watch & make -s watch-mail

database:
	@make -s migration-create

watch: deps
	@make -s dist DIST_FLAGS="--watch" & make -s watch-app

watch-app: deps
	@npx jam server up --cwd app/pages --no-inline --no-redis --watch

watch-mail: deps
	@npx jam build mail --watch

schema: deps
	@npx jam build schema

repl: deps
	@npx jam repl

prune:
	@rm -rf shared/database/migrations
	@rm -f shared/database/schema.*

purge:
	@rm -f shared/database/db.sqlite

check: deps
	@npx jam check {app,routes,shared}

dist: deps
	@npx jam dist app --cwd app/pages $(DIST_FLAGS)

pages: deps
	@npx jam build pages --dest build/dist

start: deps
	@npx jam server up --cwd app/pages --uws --no-redis

clean:
	@rm -rf build/*
	@rm -rf shared/{database,mailings}/generated
	@rm -f cache.json templates.json

install:
	@npx jam build mail
	@make -s dist schema database

migrate:
	@make -s migration-up migration-apply

migration-%: deps
	@npx jam migrate --$(subst :, --,$*)

migrations:
	@make -s migration-make

deps:
	@(((ls node_modules | grep .) > /dev/null 2>&1) || npm i --silent) || true
