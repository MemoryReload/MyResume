const gulp = require('gulp')
const sass = require('gulp-sass')
const autoprefixer = require('gulp-autoprefixer')
const jade = require('gulp-jade')
const copy = require('gulp-copy')
const rimrafPromise = require('rimraf-promise')
const ghPages = require('gulp-gh-pages')
const fs = require('fs')
const connect = require('gulp-connect')
const generatePdf = require('./generate_pdf')

//转译resume.scss
gulp.task('resume-sass', function () {
  gulp.src('src/scss/resume.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(autoprefixer({
      browsers: ['last 4 versions'],
      cascade: false
    }))
    .pipe(gulp.dest('dist/css/'))
    .pipe(connect.reload())
})

//转译iconfont.scss
gulp.task('icon-sass', function () {
  gulp.src('src/scss/iconfont.scss')
    .pipe(sass().on('error', sass.logError))
    .pipe(autoprefixer({
      browsers: ['last 4 versions'],
      cascade: false
    }))
    .pipe(gulp.dest('dist/iconfont/'))
    .pipe(connect.reload())
})

//实时监控所有的scss文件修改，并转译
gulp.task('sass:watch', function () {
  gulp.watch('./src/scss/resume.scss', ['resume-sass'])
  gulp.watch('./src/scss/iconfont.scss', ['icon-sass'])
  gulp.watch('./src/scss/components/*.scss', ['resume-sass'])
})

//渲染jade模版
gulp.task('json2jade', function () {
  var info = JSON.parse(fs.readFileSync('./info.json', 'utf-8'))
  var locals = highlight(info)
  gulp.src('./src/jade/index.jade')
    .pipe(jade({
      locals: locals
    }))
    .pipe(gulp.dest('./dist/'))
    .pipe(connect.reload())
})

//实时监控jade模版修改，并转译
gulp.task('json2jade:watch', function () {
  gulp.watch('./info.json', ['json2jade'])
})

function src2dist(dir) {
  return gulp.src(`./src/${dir}/*.*`).pipe(gulp.dest(`./dist/${dir}/`))
}

function highlight(locals) {
  var locals = JSON.stringify(locals)
  var re = /`(.+?)`/g
  locals = locals.replace(re, '<strong>$1</strong>')
  return JSON.parse(locals)
}

//拷贝项目资源，包括字体、图片、pdf，以及CNAME文件
gulp.task('copy', () => {
  src2dist('iconfont')
  src2dist('img')
  src2dist('pdf')
  // gulp.src('./CNAME').pipe(gulp.dest('./dist'))
})

//清理目标目录
gulp.task('clean', () => {
  rimrafPromise('./dist/')
})

//推送转译后的目标代码到仓库
gulp.task('deploy', function () {
  return gulp.src('./dist/**/*')
    .pipe(ghPages({
      remoteUrl: 'git@github.com:MemoryReload/MemoryReload.github.io.git',
      branch: 'master'
    }))
})

//启动web服务
gulp.task('webserver', function () {
  connect.server({
    root: './dist',
    livereload: true,
    port: 8081
  })
})

//定义默认任务，转译所有的源文件到dist目录
gulp.task('default', ['icon-sass', 'resume-sass', 'json2jade', 'copy'])

//定义开发任务：执行默认的变异任务，并启动所有的源文件修改监视
gulp.task('dev', ['default', 'json2jade:watch', 'sass:watch', 'webserver'])

//生成pdf任务：执行默认任务，并且启动web服务，之后截图生成pdf
gulp.task('pdf', ['default', 'webserver'], async () => {
  await generatePdf('http://localhost:8081')
  connect.serverClose()
  process.exit(0)
})
