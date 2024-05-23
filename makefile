
all:
	rm -fr ./dist
	./node_modules/.bin/gulp
	npm pack
