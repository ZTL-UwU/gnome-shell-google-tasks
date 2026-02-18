UUID = googletasks@ztluwu.dev
SCHEMA_XML = schemas/org.gnome.shell.extensions.googletasks.gschema.xml
DIST_SCHEMA_XML = dist/schemas/org.gnome.shell.extensions.googletasks.gschema.xml
DIST_ASSETS = dist/metadata.json dist/stylesheet.css $(DIST_SCHEMA_XML)

.PHONY: all lint-dist pack install clean

all: dist/extension.js $(DIST_ASSETS)

bun.lock: package.json
	bun install

dist/extension.js: bun.lock src/*.ts src/*.d.ts
	bun run build

dist/metadata.json: metadata.json
	@cp metadata.json dist/

dist/stylesheet.css: src/stylesheet.css
	@cp src/stylesheet.css dist/

$(DIST_SCHEMA_XML): $(SCHEMA_XML)
	@mkdir -p dist/schemas
	@cp $(SCHEMA_XML) $(DIST_SCHEMA_XML)

$(UUID).zip: lint-dist dist/extension.js $(DIST_ASSETS)
	@(cd dist && zip ../$(UUID).zip -9r .)

lint-dist: dist/extension.js $(DIST_ASSETS)
	-bun run lint:dist

pack: $(UUID).zip

install: $(DIST_ASSETS) $(UUID).zip
	@gnome-extensions install --force $(UUID).zip

clean:
	@rm -rf dist node_modules $(UUID).zip
