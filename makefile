
all:
	rm -fr ./dist
	gulp
	npm pack
