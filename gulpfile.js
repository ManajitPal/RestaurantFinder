/*eslint-env node */

const gulp = require('gulp');
const sass =require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const imagemin = require('gulp-imagemin');
const browserSync = require('browser-sync').create();
const webp = require('gulp-webp');
const minify = require('gulp-minify');
const csso = require('gulp-csso');

gulp.task('default', ['styles' , 'images', 'scripts'], () => {
    
	browserSync.init({
		server: './'
	});

	gulp.watch('sass/**/*.scss', ['styles']);
	gulp.watch('*.html').on('change', browserSync.reload);
});

gulp.task('styles', (done) => {

	gulp.src('sass/**/*.scss')
		.pipe(sass().on('error', sass.logError))
		.pipe(autoprefixer({
			browsers: ['last 2 versions']
		}))
		.pipe(csso())
		.pipe(gulp.dest('dist/css'))
		
		.pipe(browserSync.stream());

	browserSync.reload();
	done();

});

gulp.task('images', () => {
    return gulp.src('img/*.jpg')
        .pipe(imagemin({
			progressive: true,
			interlaced: true,
    		optimizationLevel: 5,
    		svgoPlugins: [{removeViewBox: true}]

		}))
		.pipe(webp())
        .pipe(gulp.dest('dist/img'));
});

gulp.task('scripts', () => {
	return gulp.src('js/*.js')
	.pipe(minify())
	.pipe(gulp.dest('dist/js'));		
});