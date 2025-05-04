import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import bcrypt from 'bcryptjs';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  matricula: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  nome: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  senha: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('admin', 'user'),
    defaultValue: 'user',
  },
}, {
  hooks: {
    beforeCreate: async (user) => {
      if (user.senha) {
        user.senha = await bcrypt.hash(user.senha, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('senha')) {
        user.senha = await bcrypt.hash(user.senha, 10);
      }
    },
  },
});

User.prototype.checkPassword = function(senha) {
  return bcrypt.compare(senha, this.senha);
};

export default User; 