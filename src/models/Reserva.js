import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import User from './User.js';
import Sala from './Sala.js';

const Reserva = sequelize.define('Reserva', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  data_inicio: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  data_fim: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pendente', 'confirmada', 'cancelada'),
    defaultValue: 'pendente',
  },
  motivo: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
});

// Relacionamentos
Reserva.belongsTo(User, { foreignKey: 'user_id' });
Reserva.belongsTo(Sala, { foreignKey: 'sala_id' });

export default Reserva; 