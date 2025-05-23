"use strict";

const bcrypt = require('bcrypt');

async function generateHashedPassword(password) {
  let contrasennaCifrada = await bcrypt.hash(password, 10);  // Generar el hash con 10 salt rounds
  console.log(contrasennaCifrada);
}

generateHashedPassword(process.argv[2])