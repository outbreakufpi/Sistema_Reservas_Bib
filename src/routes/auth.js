import express from 'express';
import { isAuthenticated } from '../middlewares/auth.js';
import User from '../models/User.js';

const router = express.Router();

// Rota de login
router.get('/login', (req, res) => {
  res.render('pages/auth/login');
});

router.post('/login', async (req, res) => {
  try {
    const { matricula, senha } = req.body;
    const user = await User.findOne({ where: { matricula } });

    if (!user || !(await user.checkPassword(senha))) {
      req.flash('error_msg', 'Matrícula ou senha inválidos');
      return res.redirect('/auth/login');
    }

    req.session.user = {
      id: user.id,
      nome: user.nome,
      matricula: user.matricula,
      role: user.role
    };

    req.flash('success_msg', 'Login realizado com sucesso!');
    res.redirect('/');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Erro ao realizar login');
    res.redirect('/auth/login');
  }
});

// Rota de registro
router.get('/register', (req, res) => {
  res.render('pages/auth/register');
});

router.post('/register', async (req, res) => {
  try {
    const { nome, matricula, email, senha } = req.body;

    const userExists = await User.findOne({
      where: {
        [Op.or]: [{ matricula }, { email }]
      }
    });

    if (userExists) {
      req.flash('error_msg', 'Matrícula ou email já cadastrado');
      return res.redirect('/auth/register');
    }

    await User.create({
      nome,
      matricula,
      email,
      senha
    });

    req.flash('success_msg', 'Cadastro realizado com sucesso! Faça login para continuar');
    res.redirect('/auth/login');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Erro ao realizar cadastro');
    res.redirect('/auth/register');
  }
});

// Rota de logout
router.get('/logout', isAuthenticated, (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

export default router; 