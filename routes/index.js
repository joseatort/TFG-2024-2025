"use strict";

var express = require("express");
var router = express.Router();

const client = require("../db/mongoDb.js");

var intervalo = null;
const nameRegex = /^[a-zA-Z\s]+$/;

// Middleware que comprueba si hay alertas en los molinos y tipos de alertas
const alertas = [
  (req, res, next) => {
    const db = client.db("TFG");
    const collectionMolinos = db.collection("Molinos");
    const collectionGranjas = db.collection("Granjas");
    var tiempo = null;
    const regulador = 5000;

    if (!intervalo) intervalo = setInterval(molinosActivos, regulador);

    next();

    async function molinosActivos() {
      const fechaTiempo =
        tiempo && tiempo !== "null" && !isNaN(Date.parse(tiempo))
          ? new Date(tiempo)
          : null;

      let matchStage = {
        $match: {
          potenciaGenerador: { $gt: 0 },
          timestamp: { $exists: true },
        },
      };

      if (fechaTiempo) {
        matchStage.$match.timestamp.$gt = fechaTiempo;
      }

      const infoMolinos = await collectionMolinos
        .aggregate([
          matchStage,
          {
            $project: {
              _id: 0,
              velocidadAngularRotor: 1,
              anguloPlataforma: 1,
              TTD: 1,
              idMolino: 1,
              alertas: 1,
              timestamp: 1,
              weather: 1,
            },
          },
        ])
        .toArray();

      const alertasNuevas = [];

      for (let molino of infoMolinos) {
        const resultado = await collectionGranjas
          .aggregate([
            {
              $unwind: "$molinos", // Desestructuramos el array 'molinos'
            },
            {
              $match: {
                "molinos.idMolino": molino.idMolino, // Filtramos por 'idMolino' dentro de los elementos del array 'molinos'
              },
            },
            {
              $project: {
                _id: 0,
                "molinos.alarmas": 1,
              },
            },
          ])
          .toArray();

        const alertasMolino = [];
        if (resultado.length != 0) {

          if (typeof molino.velocidadAngularRotor !== 'number' || !Number.isFinite(molino.velocidadAngularRotor)) {
            return res.status(422).json({ error: "Invalid rotor speed. It must be a finite number." });
          }
          //Alerta de Velocidad del Rotor**
          if (molino.velocidadAngularRotor > resultado[0].molinos.alarmas.rpm) {
            // 10% sobre la velocidad nominal
            alertasMolino.push({
              tipo: "High Rotor Speed",
              descripcion: `The rotor speed has exceeded ${resultado[0].molinos.alarmas.rpm} rpm`,
              timestamp: new Date(),
            });
          }

          //Alerta de Ángulos de la Plataforma**
          const { x, y, z } = molino.anguloPlataforma;
          if (typeof x !== 'number' || !Number.isFinite(x)) {
            return res.status(422).json({ error: "Invalid x coordinate. It must be a finite number." });
          }
          if (typeof y !== 'number' || !Number.isFinite(y)) {
            return res.status(422).json({ error: "Invalid y coordinate. It must be a finite number." });
          }
          if (typeof z !== 'number' || !Number.isFinite(z)) {
            return res.status(422).json({ error: "Invalid z coordinate. It must be a finite number." });
          }
          if (
            Math.abs(x) > resultado[0].molinos.alarmas.anguloPlataforma ||
            Math.abs(y) > resultado[0].molinos.alarmas.anguloPlataforma ||
            Math.abs(z) > resultado[0].molinos.alarmas.anguloPlataforma
          ) {
            // ±10° en cualquier eje
            alertasMolino.push({
              tipo: "Excessive Tilt",
              descripcion: `The platform has exceeded ${resultado[0].molinos.alarmas.anguloPlataforma}° on one of the axes`,
              timestamp: new Date(),
            });
          }

          //Alerta de Movimiento TTD**
          const { ForeAft, SideToSide } = molino.TTD;
          if (typeof ForeAft !== 'number' || !Number.isFinite(ForeAft)) {
            return res.status(422).json({ error: "Invalid ForeAft value. It must be a finite number." });
          }
          if (typeof SideToSide !== 'number' || !Number.isFinite(SideToSide)) {
            return res.status(422).json({ error: "Invalid SideToSide value. It must be a finite number." });
          }
          if (
            Math.abs(ForeAft) > resultado[0].molinos.alarmas.TTD ||
            Math.abs(SideToSide) > resultado[0].molinos.alarmas.TTD
          ) {
            // ±2 metros en cualquier dirección
            alertasMolino.push({
              tipo: "Structural Displacement",
              descripcion: `TTD displacement has exceeded ${resultado[0].molinos.alarmas.TTD} metres`,
              timestamp: new Date(),
            });
          }

          if(typeof molino.weather.velocidadViento !== 'number' || !Number.isFinite(molino.weather.velocidadViento)) {
            return res.status(422).json({ error: "Invalid wind speed. It must be a finite number." });
          }
          //Alerta de Velocidad del Viento**
          if (molino.weather.velocidadViento > resultado[0].molinos.alarmas.velocidadViento){
            alertasMolino.push({
              tipo: "High Wind Speed",
              descripcion: `The wind speed has exceeded ${resultado[0].molinos.alarmas.velocidadViento} m/s`,
              timestamp: new Date(),
            });
          }
        }

        //Guardar alertas en la base de datos**
        if (alertasMolino.length > 0) {
          const existingAlert = await collectionMolinos.findOne({
            idMolino: molino.idMolino,
            alertas: {
              $elemMatch: {
                tipo: { $in: alertasMolino.map((a) => a.tipo) },
                descripcion: { $in: alertasMolino.map((a) => a.descripcion) },
                timestamp: { $gt: new Date(Date.now() - regulador) },
              },
            },
          });

          if (!existingAlert) {
            await collectionMolinos.insertOne({
              idMolino: molino.idMolino,
              timestamp: new Date(), // Asegúrate de que el timestamp es válido
              alertas: alertasMolino,
            });
            alertasNuevas.push(...alertasMolino);
          }
        }
      }

      tiempo = new Date();
    }
  },
];

// GET que renderizan la página principal o la pantalla de login.
router.get("/", alertas, async (req, res, next) => {
  if (req.session.auth) {
    const db = client.db("TFG");
    const collection = db.collection("Granjas");
    const granjas = await collection
      .find({ compania: req.session.usuario.compania })
      .toArray();
    res.render("main", {
      tipoGemelo: req.session.tipoGemelo || null,
      granjasUsuario: granjas,
      nombreGranja: req.session.nombreGranja || null,
      ultimaUbicacion: req.session.ultimaUbicacion || null,
      idMolino: req.session.idMolino || null,
    });
  } else {
    res.render("main", {
      usuario: null,
      tipoGemelo: null,
      nombreGranja: null,
      ultimaUbicacion: null,
    });
  }
});

//post para cambiar la vista a la del gemelo digital
router.patch("/cambioVista", (req, res) => {
  const { tipoGemelo, idMolino, nombreGranja, ultimaUbicacion } = req.body;

  if(isNaN(idMolino)){
    return res.status(400).json({ error: "Wind turbine ID not allowed." });
  }

  if (!nameRegex.test(nombreGranja)) {
    return res.status(422).json({ error: "Invalid farm name. Only letters and spaces are allowed." });
  }

  if (!tipoGemelo || !idMolino || !nombreGranja) {
    return res.status(400).json({ error: "Required data are missing" });
  }
  req.session.nombreGranja = nombreGranja;
  req.session.ultimaUbicacion = ultimaUbicacion;
  req.session.tipoGemelo = req.session.tipoGemelo !== null ? null : tipoGemelo;

  if (req.session.tipoGemelo != null) req.session.idMolino = idMolino;

  res.sendStatus(200);
});

module.exports = router;
