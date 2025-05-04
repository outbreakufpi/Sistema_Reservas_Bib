import express from 'express'
import pkg from 'pg'
import dotenv from 'dotenv'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import swaggerUi from 'swagger-ui-express'
import { specs } from './swagger.js'
import expressLayouts from 'express-ejs-layouts'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import cookieParser from 'cookie-parser'
import session from 'express-session'
import nodemailer from 'nodemailer'

const { Pool } = pkg
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Carregar variáveis de ambiente
dotenv.config()

const app = express()
const port = process.env.PORT || 3001

// Configuração do banco de dados
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
})

// Configuração do EJS
app.set('view engine', 'ejs')
app.set('views', join(__dirname, 'views'))
app.use(expressLayouts)
app.set('layout', 'layout')

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static('public'))
app.use(cookieParser())
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}))

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs))

// Configuração do nodemailer para envio de e-mails
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Rota inicial
app.get('/', (req, res) => {
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1]
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      res.redirect('/dashboard')
    } catch (error) {
      res.redirect('/login')
    }
  } else {
    res.redirect('/login')
  }
})

// Rota de logout
app.get('/logout', (req, res) => {
    // Limpar a sessão
    req.session.destroy((err) => {
        if (err) {
            console.error('Erro ao fazer logout:', err);
        }
        // Limpar o cookie
        res.clearCookie('token');
        // Redirecionar para a página de login
        res.redirect('/login');
    });
});

// Middleware para verificar autenticação em todas as rotas protegidas
app.use(async (req, res, next) => {
    // Rotas públicas que não precisam de autenticação
    const publicRoutes = [
        '/login',
        '/registro',
        '/esqueci-senha',
        '/redefinir-senha',
        '/api/auth/login',
        '/api/auth/registro',
        '/api/auth/recuperar-senha',
        '/api/auth/redefinir-senha'
    ];

    if (publicRoutes.includes(req.path)) {
        return next();
    }

    const token = req.session?.token || req.headers.authorization?.split(' ')[1] || req.cookies?.token;
    
    if (!token) {
        return res.redirect('/login');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Buscar informações do usuário no banco de dados
        const userResult = await pool.query(
            'SELECT id, nome, matricula, email, tipo_usuario FROM usuarios WHERE id = $1',
            [decoded.id]
        );
        
        if (userResult.rows.length === 0) {
            return res.redirect('/login');
        }

        // Adicionar o usuário ao objeto de requisição
        req.user = {
            id: userResult.rows[0].id,
            nome: userResult.rows[0].nome,
            matricula: userResult.rows[0].matricula,
            email: userResult.rows[0].email,
            tipo: userResult.rows[0].tipo_usuario
        };

        // Passar o usuário para todas as views
        res.locals.user = req.user;
        
        next();
    } catch (error) {
        console.error('Erro ao verificar token:', error);
        return res.redirect('/login');
    }
});

// Rotas de autenticação
app.post('/api/auth/login', async (req, res) => {
  const { matricula, senha } = req.body
  try {
    console.log('Tentativa de login:', { matricula })
    
    const result = await pool.query(
      'SELECT * FROM usuarios WHERE matricula = $1',
      [matricula]
    )
    
    console.log('Resultado da busca:', result.rows[0])
    
    if (result.rows.length === 0) {
      console.log('Usuário não encontrado')
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }
    
    const user = result.rows[0]
    console.log('Senha fornecida:', senha)
    console.log('Hash armazenado:', user.senha)
    
    const senhaValida = await bcrypt.compare(senha, user.senha)
    console.log('Senha válida:', senhaValida)
    
    if (!senhaValida) {
      console.log('Senha inválida')
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    const token = jwt.sign(
      { id: user.id, tipo: user.tipo_usuario },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    )

    // Configurar sessão
    req.session.user = {
      id: user.id,
      tipo: user.tipo_usuario,
      nome: user.nome
    }
    req.session.token = token

    // Configurar cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 horas
    })

    console.log('Tipo de usuário:', user.tipo_usuario) // Debug

    res.json({ 
      token, 
      user: { 
        id: user.id, 
        tipo: user.tipo_usuario,
        nome: user.nome
      } 
    })
  } catch (error) {
    console.error('Erro no login:', error)
    res.status(500).json({ error: 'Erro ao fazer login' })
  }
})

app.get('/registro', (req, res) => {
  res.render('registro', { title: 'Registro' })
})

app.get('/esqueci-senha', (req, res) => {
  res.render('esqueci-senha', { title: 'Recuperar Senha' })
})

app.post('/api/auth/registro', async (req, res) => {
  const { matricula, nome, email, senha } = req.body
  try {
    // Verificar se matrícula ou email já existem
    const userExists = await pool.query(
      'SELECT * FROM usuarios WHERE matricula = $1 OR email = $2',
      [matricula, email]
    )
    
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'Matrícula ou email já cadastrados' })
    }

    // Hash da senha
    const salt = await bcrypt.genSalt(10)
    const senhaHash = await bcrypt.hash(senha, salt)

    // Criar novo usuário (por padrão é tipo 'usuario')
    const result = await pool.query(
      'INSERT INTO usuarios (matricula, nome, email, senha, tipo_usuario) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [matricula, nome, email, senhaHash, 'usuario']
    )
    
    res.status(201).json({ message: 'Usuário criado com sucesso' })
  } catch (error) {
    console.error('Erro ao criar usuário:', error)
    res.status(500).json({ error: 'Erro ao criar usuário' })
  }
})

app.post('/api/auth/recuperar-senha', async (req, res) => {
    try {
        const { matricula, email } = req.body;
        
        // Buscar usuário no banco de dados
        const result = await pool.query(
            'SELECT * FROM usuarios WHERE matricula = $1 AND email = $2',
            [matricula, email]
        );
        
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Usuário não encontrado' });
        }

        const user = result.rows[0];

        // Gerar token de recuperação
        const token = jwt.sign(
            { id: user.id },
            process.env.JWT_SECRET || 'chave_secreta_temporaria',
            { expiresIn: '1h' }
        );

        // Criar link de recuperação
        const resetLink = `${process.env.BASE_URL || 'http://localhost:3001'}/redefinir-senha?token=${token}`;

        // Configurar e-mail
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Recuperação de Senha - Sistema de Reservas',
            html: `
                <h1>Recuperação de Senha</h1>
                <p>Olá ${user.nome},</p>
                <p>Você solicitou a recuperação de senha. Clique no link abaixo para redefinir sua senha:</p>
                <p><a href="${resetLink}">Redefinir Senha</a></p>
                <p>Este link expira em 1 hora.</p>
                <p>Se você não solicitou esta recuperação, ignore este e-mail.</p>
            `
        };

        // Enviar e-mail
        await transporter.sendMail(mailOptions);
        console.log('E-mail de recuperação enviado com sucesso');

        res.json({ message: 'E-mail de recuperação enviado com sucesso' });
    } catch (error) {
        console.error('Erro ao processar recuperação de senha:', error);
        res.status(500).json({ error: 'Erro ao processar recuperação de senha' });
    }
});

// Rota para exibir a página de redefinição de senha
app.get('/redefinir-senha', (req, res) => {
    const { token } = req.query;
    if (!token) {
        return res.redirect('/esqueci-senha');
    }
    res.render('redefinir-senha', { token });
});

// Rota para processar a redefinição de senha
app.post('/api/auth/redefinir-senha', async (req, res) => {
    try {
        const { token, novaSenha } = req.body;

        // Verificar token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Hash da nova senha
        const hashedPassword = await bcrypt.hash(novaSenha, 10);

        // Atualizar senha no banco de dados
        const result = await pool.query(
            'UPDATE usuarios SET senha = $1 WHERE id = $2 RETURNING *',
            [hashedPassword, decoded.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Token inválido ou expirado' });
        }

        res.json({ message: 'Senha redefinida com sucesso' });
    } catch (error) {
        console.error('Erro ao redefinir senha:', error);
        res.status(400).json({ error: 'Token inválido ou expirado' });
    }
});

// Rotas da aplicação
app.get('/login', (req, res) => {
  res.render('login', { title: 'Login' })
})

app.get('/dashboard', async (req, res) => {
  try {
    const userResult = await pool.query(
      'SELECT id, nome, matricula, email, tipo_usuario FROM usuarios WHERE id = $1',
      [req.user.id]
    )
    
    if (userResult.rows.length === 0) {
      return res.redirect('/login')
    }
    
    const user = userResult.rows[0]
    res.render('dashboard', { 
      title: 'Dashboard', 
      user,
      error: null
    })
  } catch (error) {
    console.error('Erro ao carregar dashboard:', error)
    res.render('dashboard', { 
      title: 'Dashboard', 
      user: req.session.user,
      error: 'Erro ao carregar dados do usuário'
    })
  }
})

// Rotas protegidas para admin
app.get('/admin/salas', async (req, res) => {
  if (req.user.tipo !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado' })
  }
  try {
    const result = await pool.query('SELECT * FROM salas ORDER BY nome')
    res.render('admin/salas', { title: 'Gerenciar Salas', salas: result.rows })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar salas' })
  }
})

app.get('/admin/reservas', async (req, res) => {
  if (req.user.tipo !== 'admin') {
    return res.status(403).json({ error: 'Acesso negado' })
  }
  try {
    const result = await pool.query(`
      SELECT r.*, s.nome as sala_nome, u.nome as usuario_nome 
      FROM reservas r 
      JOIN salas s ON r.sala_id = s.id 
      JOIN usuarios u ON r.usuario_id = u.id 
      ORDER BY r.data_inicio DESC
    `)
    res.render('admin/reservas', { title: 'Todas as Reservas', reservas: result.rows })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar reservas' })
  }
})

// Rotas para usuários comuns
app.get('/minhas-reservas', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, s.nome as sala_nome 
      FROM reservas r 
      JOIN salas s ON r.sala_id = s.id 
      WHERE r.usuario_id = $1 
      ORDER BY r.data_inicio DESC
    `, [req.user.id])
    res.render('minhas-reservas', { 
      title: 'Minhas Reservas', 
      reservas: result.rows,
      user: req.user,
      userType: req.user.tipo
    })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar reservas' })
  }
})

// Rotas das Views
app.get('/salas', async (req, res) => {
  try {
    const salas = await pool.query('SELECT * FROM salas')
    res.render('pages/sala/index', { 
      salas: salas.rows,
      title: 'Salas Disponíveis',
      user: req.user
    })
  } catch (error) {
    console.error('Erro:', error)
    res.status(500).send('Erro ao carregar a página')
  }
})

app.get('/reservas', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, s.nome as sala_nome, u.nome as usuario_nome 
      FROM reservas r 
      JOIN salas s ON r.sala_id = s.id 
      JOIN usuarios u ON r.usuario_id = u.id
      ORDER BY r.data_inicio DESC
    `)
    res.render('reservas', { 
      title: 'Reservas',
      reservas: result.rows,
      user: {
        id: req.user.id,
        tipo: req.user.tipo,
        nome: req.session?.user?.nome || ''
      }
    })
  } catch (error) {
    console.error('Erro:', error)
    res.status(500).send('Erro ao carregar reservas')
  }
})

app.get('/nova-reserva', async (req, res) => {
  try {
    const salas = await pool.query('SELECT * FROM salas')
    res.render('nova-reserva', { 
      salas: salas.rows,
      title: 'Nova Reserva',
      request: req
    })
  } catch (error) {
    console.error('Erro:', error)
    res.status(500).send('Erro ao carregar formulário')
  }
})

/**
 * @swagger
 * components:
 *   schemas:
 *     Usuario:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         nome:
 *           type: string
 *         email:
 *           type: string
 *         tipo:
 *           type: string
 *           enum: [admin, usuario]
 *     Sala:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         nome:
 *           type: string
 *         capacidade:
 *           type: integer
 *         recursos:
 *           type: array
 *           items:
 *             type: string
 *     Reserva:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         sala_id:
 *           type: integer
 *         usuario_id:
 *           type: integer
 *         data:
 *           type: string
 *           format: date
 *         horario_inicio:
 *           type: string
 *         horario_fim:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pendente, confirmada, cancelada]
 *         observacoes:
 *           type: string
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Realiza login no sistema
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - senha
 *             properties:
 *               email:
 *                 type: string
 *               senha:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/Usuario'
 *       401:
 *         description: Credenciais inválidas
 */

/**
 * @swagger
 * /api/salas:
 *   get:
 *     summary: Lista todas as salas
 *     tags: [Salas]
 *     responses:
 *       200:
 *         description: Lista de salas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Sala'
 */
app.get('/api/salas', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM salas ORDER BY nome');
        console.log('Salas encontradas:', result.rows); // Debug
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao listar salas:', error);
        res.status(500).json({ error: 'Erro ao listar salas' });
    }
});

/**
 * @swagger
 * /api/salas:
 *   post:
 *     summary: Cria uma nova sala
 *     tags: [Salas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *               - capacidade
 *             properties:
 *               nome:
 *                 type: string
 *               capacidade:
 *                 type: integer
 *               descricao:
 *                 type: string
 *     responses:
 *       201:
 *         description: Sala criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Sala'
 */
app.post('/api/salas', async (req, res) => {
    try {
        const { nome, capacidade, recursos } = req.body;
        console.log('Dados recebidos:', { nome, capacidade, recursos }); // Debug
        
        if (!nome || !capacidade) {
            return res.status(400).json({ error: 'Nome e capacidade são obrigatórios' });
        }
        
        console.log('Executando query de inserção...'); // Debug
        const result = await pool.query(
            'INSERT INTO salas (nome, capacidade, recursos) VALUES ($1, $2, $3) RETURNING *',
            [nome, capacidade, JSON.stringify(recursos)] // Convertendo array para JSON
        );
        console.log('Resultado da inserção:', result.rows[0]); // Debug
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro detalhado ao criar sala:', error); // Debug
        res.status(500).json({ error: 'Erro ao criar sala: ' + error.message });
    }
});

/**
 * @swagger
 * /api/reservas:
 *   get:
 *     summary: Lista todas as reservas
 *     tags: [Reservas]
 *     responses:
 *       200:
 *         description: Lista de reservas
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Reserva'
 */
app.get('/api/reservas', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, s.nome as sala_nome, u.nome as usuario_nome 
      FROM reservas r 
      JOIN salas s ON r.sala_id = s.id 
      JOIN usuarios u ON r.usuario_id = u.id
    `)
    res.json(result.rows)
  } catch (error) {
    console.error('Erro ao buscar reservas:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

app.get('/api/reservas/minhas', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT r.*, s.nome as sala_nome 
            FROM reservas r 
            JOIN salas s ON r.sala_id = s.id 
            WHERE r.usuario_id = $1 
            ORDER BY r.data_inicio DESC
        `, [req.user.id]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao listar reservas do usuário:', error);
        res.status(500).json({ error: 'Erro ao listar reservas' });
    }
});

/**
 * @swagger
 * /api/reservas:
 *   post:
 *     summary: Cria uma nova reserva
 *     tags: [Reservas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sala_id
 *               - usuario_id
 *               - data_inicio
 *               - data_fim
 *               - motivo
 *             properties:
 *               sala_id:
 *                 type: integer
 *               usuario_id:
 *                 type: integer
 *               data_inicio:
 *                 type: string
 *                 format: date-time
 *               data_fim:
 *                 type: string
 *                 format: date-time
 *               motivo:
 *                 type: string
 *     responses:
 *       201:
 *         description: Reserva criada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Reserva'
 *       400:
 *         description: Sala já está reservada neste período
 */
app.post('/api/reservas', async (req, res) => {
  const { sala_id, data_inicio, data_fim, motivo } = req.body
  try {
    const verificarDisponibilidade = await pool.query(
      `SELECT * FROM reservas 
       WHERE sala_id = $1 
       AND status != 'cancelada'
       AND (
         (data_inicio <= $2 AND data_fim >= $2)
         OR (data_inicio <= $3 AND data_fim >= $3)
         OR (data_inicio >= $2 AND data_fim <= $3)
       )`,
      [sala_id, data_inicio, data_fim]
    )

    if (verificarDisponibilidade.rows.length > 0) {
      return res.status(400).json({ error: 'Sala já está reservada neste período' })
    }

    const result = await pool.query(
      'INSERT INTO reservas (sala_id, usuario_id, data_inicio, data_fim, motivo, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [sala_id, req.user.id, data_inicio, data_fim, motivo, 'confirmada']
    )
    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Erro ao criar reserva:', error)
    res.status(500).json({ error: 'Erro interno do servidor' })
  }
})

/**
 * @swagger
 * /api/reservas/{id}/cancelar:
 *   put:
 *     summary: Cancela uma reserva
 *     tags: [Reservas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da reserva
 *     responses:
 *       200:
 *         description: Reserva cancelada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Reserva'
 *       404:
 *         description: Reserva não encontrada
 */
app.put('/api/reservas/:id/cancelar', async (req, res) => {
  const { id } = req.params
  try {
    console.log('Tentando cancelar reserva:', id);
    console.log('Usuário atual:', req.user);

    // Verifica se a reserva existe
    const verificarReserva = await pool.query(
      'SELECT * FROM reservas WHERE id = $1',
      [id]
    )

    if (verificarReserva.rows.length === 0) {
      console.log('Reserva não encontrada');
      return res.status(404).json({ error: 'Reserva não encontrada' })
    }

    // Se o usuário não for admin, verifica se é o dono da reserva
    if (req.user.tipo !== 'admin') {
      if (verificarReserva.rows[0].usuario_id !== req.user.id) {
        console.log('Usuário não tem permissão para cancelar esta reserva');
        return res.status(403).json({ error: 'Você não tem permissão para cancelar esta reserva' })
      }
    }

    // Cancela a reserva
    const result = await pool.query(
      'UPDATE reservas SET status = $1 WHERE id = $2 RETURNING *',
      ['cancelada', id]
    )
    
    console.log('Reserva cancelada com sucesso:', result.rows[0]);
    res.json(result.rows[0])
  } catch (error) {
    console.error('Erro detalhado ao cancelar reserva:', error);
    res.status(500).json({ error: 'Erro ao cancelar reserva: ' + error.message })
  }
})

app.put('/api/salas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, capacidade, recursos } = req.body;
        
        if (!nome || !capacidade) {
            return res.status(400).json({ error: 'Nome e capacidade são obrigatórios' });
        }
        
        const result = await pool.query(
            'UPDATE salas SET nome = $1, capacidade = $2, recursos = $3 WHERE id = $4 RETURNING *',
            [nome, capacidade, recursos, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Sala não encontrada' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao atualizar sala:', error);
        res.status(500).json({ error: 'Erro ao atualizar sala' });
    }
});

app.delete('/api/salas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM salas WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Sala não encontrada' });
        }
        
        res.json({ message: 'Sala excluída com sucesso' });
    } catch (error) {
        console.error('Erro ao excluir sala:', error);
        res.status(500).json({ error: 'Erro ao excluir sala' });
    }
});

app.get('/api/salas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM salas WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Sala não encontrada' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao buscar sala:', error);
        res.status(500).json({ error: 'Erro ao buscar sala' });
    }
});

app.get('/api/reservas/:id', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT r.*, s.nome as sala_nome, u.nome as usuario_nome 
             FROM reservas r 
             JOIN salas s ON r.sala_id = s.id 
             JOIN usuarios u ON r.usuario_id = u.id 
             WHERE r.id = $1`,
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Reserva não encontrada' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Erro ao buscar detalhes da reserva:', error);
        res.status(500).json({ error: 'Erro ao buscar detalhes da reserva' });
    }
});

/**
 * @swagger
 * /api/reservas/minhas:
 *   get:
 *     summary: Lista as reservas do usuário autenticado
 *     tags: [Reservas]
 *     responses:
 *       200:
 *         description: Lista de reservas do usuário
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Reserva'
 */

/**
 * @swagger
 * /api/salas/{id}:
 *   put:
 *     summary: Atualiza uma sala existente
 *     tags: [Salas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da sala
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *               - capacidade
 *             properties:
 *               nome:
 *                 type: string
 *               capacidade:
 *                 type: integer
 *               recursos:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Sala atualizada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Sala'
 *       404:
 *         description: Sala não encontrada
 */

/**
 * @swagger
 * /api/salas/{id}:
 *   delete:
 *     summary: Remove uma sala
 *     tags: [Salas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da sala
 *     responses:
 *       200:
 *         description: Sala removida com sucesso
 *       404:
 *         description: Sala não encontrada
 */

/**
 * @swagger
 * /api/salas/{id}:
 *   get:
 *     summary: Obtém detalhes de uma sala específica
 *     tags: [Salas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da sala
 *     responses:
 *       200:
 *         description: Detalhes da sala
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Sala'
 *       404:
 *         description: Sala não encontrada
 */

/**
 * @swagger
 * /api/reservas/{id}:
 *   get:
 *     summary: Obtém detalhes de uma reserva específica
 *     tags: [Reservas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da reserva
 *     responses:
 *       200:
 *         description: Detalhes da reserva
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Reserva'
 *       404:
 *         description: Reserva não encontrada
 */

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`)
  console.log(`Documentação Swagger disponível em http://localhost:${port}/api-docs`)
})
