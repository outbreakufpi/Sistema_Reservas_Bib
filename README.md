# Sistema de Reservas de Salas

## Requisitos
- Node.js (versão 14 ou superior)
- PostgreSQL (versão 12 ou superior)
- NPM ou Yarn

## Configuração do Ambiente

1. Clone o repositório:
```bash
git clone https://github.com/outbreakufpi/Sistema_Reservas_Bib
cd Sistema_Reservas_Bib
```

2. Instale as dependências:
```bash
npm install
```

3. Configure o banco de dados:
   - Instale o PostgreSQL se ainda não tiver instalado
   - Crie um arquivo `.env` na raiz do projeto com o seguinte conteúdo:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sistema_reservas
DB_USER=seu_usuario_postgres
DB_PASSWORD=sua_senha_postgres
JWT_SECRET=uma_chave_secreta_muito_segura
PORT=3001
```

4. Execute o script de configuração do banco de dados:
```bash
psql -U seu_usuario_postgres -f setup_database.sql
```

5. Inicie o servidor:
```bash
npm start
```

## Acesso ao Sistema

### Usuário Administrador Inicial
- Matrícula: ADMIN001
- Senha: admin123
- Email: admin@sistema.com

**IMPORTANTE**: Altere a senha do administrador após o primeiro login por questões de segurança.

## Funcionalidades

- Login e registro de usuários
- Gerenciamento de salas (apenas admin)
- Reserva de salas
- Visualização de reservas
- Gerenciamento de usuários (apenas admin)

## Documentação da API

A documentação completa da API está disponível em:
```
http://localhost:3001/api-docs
```

## Suporte

Em caso de dúvidas ou problemas, entre em contato com o administrador do sistema. 
