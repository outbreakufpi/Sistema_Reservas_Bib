import express from 'express';
import session from 'express-session';
import flash from 'connect-flash';
import methodOverride from 'method-override';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import sequelize from './config/database.js';

// Configuração do dotenv
dotenv.config();

// Configuração do __dirname para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Importação das rotas
import authRoutes from './routes/auth.js';
import salaRoutes from './routes/sala.js';
import reservaRoutes from './routes/reserva.js';

const app = express();

// Configurações do Express
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

// Configuração da sessão
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Configuração do Flash Messages
app.use(flash());

// Middleware para disponibilizar user e messages em todas as views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  next();
});

// Rotas
app.use('/auth', authRoutes);
app.use('/salas', salaRoutes);
app.use('/reservas', reservaRoutes);

// Rota principal
app.get('/', (req, res) => {
  res.render('pages/home');
});

// Sincronização do banco de dados e inicialização do servidor
const PORT = process.env.PORT || 3000;

sequelize.sync({ alter: true }).then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Erro ao sincronizar com o banco de dados:', err);
}); 