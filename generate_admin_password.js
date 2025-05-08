import bcrypt from 'bcryptjs';

const senha = 'admin123';
const salt = await bcrypt.genSalt(10);
const hash = await bcrypt.hash(senha, salt);

console.log('Senha hash para o usuário admin:');
console.log(hash); 