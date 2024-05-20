
const gulp = require('gulp');
const ts = require('gulp-typescript');
const replace = require('gulp-replace');
const rename = require('gulp-rename');

gulp.task('rename', function(){
  return gulp.src('dist/**/*.js')  // This will get all .js files in src and its sub-directories
    .pipe(rename(function(path) {
      path.extname = ".cjs";
    }))
    .pipe(gulp.dest('dist'));  // Output the renamed files in the same directory
});

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
        .pipe(replace(/^/, '#!/usr/bin/env node'))
        .pipe(gulp.dest('dist/bin'));
});

var filesToMove = [
  './src/bin/so2ts.py',
  './src/bin/so2ts.jinja',
];

gulp.task('copyFiles', function(){
  // Get the files from the file paths
  return gulp.src(filesToMove)
    // Perform the copy operation
    .pipe(gulp.dest('./dist/bin'));  // specify the destination folder
});


// Default task
gulp.task('default', gulp.series('compile', 'scripts', 'rename', 'copyFiles'));

