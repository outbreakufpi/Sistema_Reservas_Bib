import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Sala = sequelize.define('Sala', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nome: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  capacidade: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  descricao: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('disponivel', 'manutencao', 'indisponivel'),
    defaultValue: 'disponivel',
  },
});

export default Sala; 