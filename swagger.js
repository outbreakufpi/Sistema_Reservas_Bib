import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API de Reservas de Salas',
      version: '1.0.0',
      description: 'API para gerenciamento de reservas de salas de biblioteca',
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Servidor de desenvolvimento',
      },
    ],
  },
  apis: ['./index.js'], // arquivos que contêm anotações
};

export const specs = swaggerJsdoc(options); 