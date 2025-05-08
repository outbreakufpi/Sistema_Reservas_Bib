-- Criar o banco de dados
CREATE DATABASE sistema_reservas;

-- Conectar ao banco de dados
\c sistema_reservas;

-- Criar tabela de usuários
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    matricula VARCHAR(20) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha VARCHAR(100) NOT NULL,
    tipo_usuario VARCHAR(20) NOT NULL DEFAULT 'usuario'
);

-- Criar tabela de salas
CREATE TABLE salas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    capacidade INTEGER NOT NULL,
    recursos TEXT[]
);

-- Criar tabela de reservas
CREATE TABLE reservas (
    id SERIAL PRIMARY KEY,
    sala_id INTEGER REFERENCES salas(id),
    usuario_id INTEGER REFERENCES usuarios(id),
    data_inicio TIMESTAMP NOT NULL,
    data_fim TIMESTAMP NOT NULL,
    motivo TEXT,
    status VARCHAR(20) DEFAULT 'pendente'
);

-- Criar usuário admin inicial
-- Senha: admin123 (você deve alterar isso após o primeiro login)
INSERT INTO usuarios (matricula, nome, email, senha, tipo_usuario)
VALUES (
    'ADMIN001',
    'Administrador',
    'admin@sistema.com',
    '$2a$10$YourHashedPasswordHere', -- Esta é uma senha hash de exemplo, será substituída pelo hash real
    'admin'
); 