import express from 'express';
import { isAuthenticated } from '../middlewares/auth.js';
import Reserva from '../models/Reserva.js';
import Sala from '../models/Sala.js';
import { Op } from 'sequelize';

const router = express.Router();

// Listar reservas do usuário
router.get('/minhas', isAuthenticated, async (req, res) => {
  try {
    const reservas = await Reserva.findAll({
      where: { user_id: req.session.user.id },
      include: [{ model: Sala }],
      order: [['data_inicio', 'DESC']]
    });
    res.render('pages/reserva/minhas', { reservas });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Erro ao listar reservas');
    res.redirect('/');
  }
});

// Formulário para criar reserva
router.get('/create/:salaId', isAuthenticated, async (req, res) => {
  try {
    const sala = await Sala.findByPk(req.params.salaId);
    if (!sala) {
      req.flash('error_msg', 'Sala não encontrada');
      return res.redirect('/salas');
    }
    res.render('pages/reserva/create', { sala });
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Erro ao carregar formulário');
    res.redirect('/salas');
  }
});

// Criar nova reserva
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { sala_id, data_inicio, data_fim, motivo } = req.body;

    // Verificar se a sala está disponível no período
    const reservaExistente = await Reserva.findOne({
      where: {
        sala_id,
        status: 'confirmada',
        [Op.or]: [
          {
            data_inicio: {
              [Op.between]: [data_inicio, data_fim]
            }
          },
          {
            data_fim: {
              [Op.between]: [data_inicio, data_fim]
            }
          }
        ]
      }
    });

    if (reservaExistente) {
      req.flash('error_msg', 'Já existe uma reserva para este período');
      return res.redirect(`/reservas/create/${sala_id}`);
    }

    await Reserva.create({
      user_id: req.session.user.id,
      sala_id,
      data_inicio,
      data_fim,
      motivo
    });

    req.flash('success_msg', 'Reserva criada com sucesso!');
    res.redirect('/reservas/minhas');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Erro ao criar reserva');
    res.redirect(`/reservas/create/${req.body.sala_id}`);
  }
});

// Cancelar reserva
router.post('/:id/cancel', isAuthenticated, async (req, res) => {
  try {
    const reserva = await Reserva.findOne({
      where: {
        id: req.params.id,
        user_id: req.session.user.id
      }
    });

    if (!reserva) {
      req.flash('error_msg', 'Reserva não encontrada');
      return res.redirect('/reservas/minhas');
    }

    await reserva.update({ status: 'cancelada' });
    req.flash('success_msg', 'Reserva cancelada com sucesso!');
    res.redirect('/reservas/minhas');
  } catch (error) {
    console.error(error);
    req.flash('error_msg', 'Erro ao cancelar reserva');
    res.redirect('/reservas/minhas');
  }
});

export default router; 