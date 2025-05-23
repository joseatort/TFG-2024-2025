const uri = "mongodb://localhost:27017"; // Cambia esta URI si usas MongoDB Atlas
const { MongoClient } = require('mongodb');
const client = new MongoClient(uri);

async function connectDB() {
    try {
      await client.connect();
      console.log("Conectado a MongoDB");
    } catch (err) {
      console.error("Error al conectar a MongoDB: ", err);
    }
  }

connectDB(); 

module.exports = client;