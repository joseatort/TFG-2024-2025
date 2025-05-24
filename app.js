"use strict";

const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const client = require('./db/mongoDb');

// Importar las rutas
const indexRouter = require('./routes/index');
const usuariosRouter = require('./routes/usuarios');
const granjasRouter = require('./routes/granjas');
const molinosRouter = require('./routes/molinos');
const gemeloDigitalRouter = require('./routes/gemeloDigital');

const app = express();
const port = 3000;

app.use(session({
  secret: 'mi_clave_secreta', // Clave segura
  resave: false, // Evita guardar sesión en cada request
  saveUninitialized: false, // No guarda sesiones vacías
  store: MongoStore.create({
      client: client, //Usa la conexión de mongoDb.js
      dbName: 'TFG', // Nombre de la base de datos
      collectionName: 'sesiones', // Nombre de la colección
      ttl: 60 * 60 * 24, // Tiempo de expiración (24 horas)
  }),
  cookie: { secure: false, maxAge: 86400000 } // 1 día
}));

// Configuración del motor de vistas (EJS)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middlewares generales
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/logica', (req, res, next) => {
  if (!req.path.endsWith('.js')) {
      req.url += '.js';
  }
  next();
}, express.static(path.join(__dirname, 'views/logica')));

app.use(flashMiddleware);

// Middleware para la autenticación del usuario
app.use((req, res, next) => {
  if (req.session && req.session.auth) {
    res.locals.usuario = req.session.usuario;
  }
  next();
});

// Definición de rutas
app.use('/', indexRouter);
app.use('/usuarios', usuariosRouter);
app.use('/granjas', granjasRouter);
app.use('/molinos', molinosRouter);
app.use('/gemeloDigital', gemeloDigitalRouter);

// Manejo de errores 404
app.use(function(req, res, next) {
  next(createError(404, "Pagina no encontrada"));
});

// Manejador de errores
app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.render('error', {error: err, message: err.message});
});

app.listen(port, (err) =>
{
  if(err) console.log(`Ha ocurrido un error al lanzar el servidor`);
  else console.log(`Servidor en http://localhost:${port}`)
})

// Middleware para flash messages
function flashMiddleware(req, res, next) {
  res.setFlash = function (msg) {
    req.session.flashMsg = msg;
  };

  res.locals.getAndClearFlash = function () {
    let msg = req.session.flashMsg || null;
    delete req.session.flashMsg;
    return msg;
  };

  next();
}