var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var kanbanAddRouter = require('./routes/kb-add');
var kanbanListRouter = require('./routes/kb-ls');
var skuListRouter = require('./routes/sku-ls');
var skuAddRouter = require('./routes/sku-add');
var skuEditRouter = require('./routes/sku-edit');
var countryAddRouter = require('./routes/cnty-add');
var countryListRouter = require('./routes/cnty-ls');
var cpAddRouter = require('./routes/cp-add');
var cpListRouter = require('./routes/cp-ls');
var profitRouter = require('./routes/profit');
var vcalRouter = require('./routes/v-cal');
var amzRouter = require('./routes/amz-kv');

var kanbanApiRouter = require('./routes/api/kanban');
var skuApiRouter = require('./routes/api/sku');
var countryApiRouter = require('./routes/api/country');
var cpApiRouter = require('./routes/api/cp');
var locaApiRouter = require('./routes/api/loca');
var kvApiRouter = require('./routes/api/kv');


var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//API Routes
app.use('/api/sku', skuApiRouter);
app.use('/api/kanban', kanbanApiRouter);
app.use('/api/country', countryApiRouter);
app.use('/api/cp', cpApiRouter);
app.use('/api/loca', locaApiRouter);
app.use('/api/kv', kvApiRouter);

// Web Routes
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/kbadd', kanbanAddRouter);
app.use('/kbls', kanbanListRouter);
app.use('/skuadd', skuAddRouter);
app.use('/skuedit', skuEditRouter);
app.use('/skuls', skuListRouter);
app.use('/cntyadd', countryAddRouter);
app.use('/cntyls', countryListRouter);
app.use('/cpadd', cpAddRouter);
app.use('/cpls', cpListRouter);
app.use('/profit', profitRouter);
app.use('/vcal', vcalRouter);
app.use('/amzkv', amzRouter);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
