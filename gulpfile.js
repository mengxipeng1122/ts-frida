
const gulp = require('gulp');
const ts = require('gulp-typescript');
const replace = require('gulp-replace');

// Compile TypeScript files
gulp.task('compile', () => {
    const tsProject = ts.createProject('tsconfig.json');
    return gulp.src('src/**/*.ts')
        .pipe(tsProject())
        .pipe(gulp.dest('dist'));
});

// Add shebang to scripts and output to dist/bin
gulp.task('scripts', () => {
    return gulp.src('dist/bin/*.js')
        .pipe(replace(/^/, '#!/usr/bin/env noden'))
        .pipe(gulp.dest('dist/bin'));
});

// Default task
gulp.task('default', gulp.series('compile', 'scripts'));

