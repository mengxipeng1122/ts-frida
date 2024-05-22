
all:
	rm -fr ./dist
	npx gulp
	npm pack
