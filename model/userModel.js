// In-memory user database
const bcrypt = require('bcryptjs');
const users = [
  {
    username: 'julio',
    password: bcrypt.hashSync('123456', 8),
    favorecidos: ['priscila'],
    saldo: 1000
  }
];

module.exports = {
  users
};
