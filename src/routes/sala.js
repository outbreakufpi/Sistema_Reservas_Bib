import express from 'express';
import { isAuthenticated, isAdmin } from '../middlewares/auth.js';
import Sala from '../models/Sala.js';

const router = express.Router();

// Listar todas as salas
router.get('/', async (req, res) => {
  try {
    const salas = await Sala.findAll();
    res.render('pages/sala/index', { salas });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Erro ao listar salas');
    res.redirect('/');
  }
});

// Formulário para criar sala (apenas admin)
router.get('/create', isAdmin, (req, res) => {
  res.render('pages/sala/create');
});

// Criar nova sala (apenas admin)
router.post('/', isAdmin, async (req, res) => {
  try {
    const { nome, capacidade, descricao } = req.body;
    await Sala.create({ nome, capacidade, descricao });
    req.flash('success_msg', 'Sala criada com sucesso!');
    res.redirect('/salas');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Erro ao criar sala');
    res.redirect('/salas/create');
  }
});

// Formulário para editar sala (apenas admin)
router.get('/:id/edit', isAdmin, async (req, res) => {
  try {
    const sala = await Sala.findByPk(req.params.id);
    if (!sala) {
      req.flash('error_msg', 'Sala não encontrada');
      return res.redirect('/salas');
    }
    res.render('pages/sala/edit', { sala });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Erro ao carregar sala');
    res.redirect('/salas');
  }
});

// Atualizar sala (apenas admin)
router.put('/:id', isAdmin, async (req, res) => {
  try {
    const { nome, capacidade, descricao, status } = req.body;
    const sala = await Sala.findByPk(req.params.id);
    
    if (!sala) {
      req.flash('error_msg', 'Sala não encontrada');
      return res.redirect('/salas');
    }

    await sala.update({ nome, capacidade, descricao, status });
    req.flash('success_msg', 'Sala atualizada com sucesso!');
    res.redirect('/salas');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Erro ao atualizar sala');
    res.redirect(`/salas/${req.params.id}/edit`);
  }
});

// Excluir sala (apenas admin)
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const sala = await Sala.findByPk(req.params.id);
    if (!sala) {
      req.flash('error_msg', 'Sala não encontrada');
      return res.redirect('/salas');
    }
    await sala.destroy();
    req.flash('success_msg', 'Sala excluída com sucesso!');
    res.redirect('/salas');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Erro ao excluir sala');
    res.redirect('/salas');
  }
});

export default router; 