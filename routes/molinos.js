"use strict";

const express = require("express");
const router = express.Router();

const client = require("../db/mongoDb.js");

const nameRegex = /^[a-zA-Z\s]+$/;

// Ruta GET para obtener molinos (reales y virtuales) de una granja específica
router.get("/:nombreGranja", async function (req, res, next) {
  const nombreGranja = req.params.nombreGranja;
  req.session.nombreGranja = nombreGranja;

  if (!nameRegex.test(nombreGranja)) {
    return res.status(422).json({ error: "Invalid farm name. Only letters and spaces are allowed." });
  }

  try {
    const db = client.db("TFG");

    // Obtener la granja y sus molinos virtuales
    const granjasCollection = db.collection("Granjas");
    const granja = await granjasCollection.findOne({ nombre: nombreGranja });

    if (!granja) {
      return res.status(404).json({ error: "Farm not found." });
    }

    res.render("molinos", { molinos: granja.molinos, nombreGranja });
  } catch (err) {
    console.error("Error retrieving wind turbines: ", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

//utilizamos una función que implementa la fórmula de Haversine para calcular la distancia entre 2 puntos
//en la superficie de la tierra
const haversineDistance = (coord1, coord2) => {
  const R = 6371; // Radio de la Tierra en kilómetros
  const lat1 = parseFloat(coord1.lat);
  const lon1 = parseFloat(coord1.long);
  const lat2 = parseFloat(coord2.lat);
  const lon2 = parseFloat(coord2.long);

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distancia en kilómetros
};

// Ruta POST para añadir un molino a una granja
router.post("/addMolino", async (req, res, next) => {
  try {
    const { lat, long, granja, potenciaNominal } = req.body;

    const pos = { lat: parseFloat(lat), long: parseFloat(long) };

    if (lat > 90 || lat < -90)
      return res
        .status(400)
        .json({ error: "Latitude must be between -90° and 90°" });

    if (long > 180 || long < -180)
      return res
        .status(400)
        .json({ error: "Longitude must be between -180° and 180°" });

    if (!pos || !granja || !potenciaNominal)
      return res.status(400).json({ error: "Missing parameters" });

    // Conectar a la base de datos
    const collectionGranjas = client.db("TFG").collection("Granjas");
    const granjaData = await collectionGranjas.findOne({ nombre: granja });

    if (!granjaData) {
      return res
        .status(404)
        .json({ error: "The farm does not exist in the database." });
    }

    const centroGranja = granjaData.pos;
    const molinoPos = { lat: parseFloat(lat), long: parseFloat(long) };

    // Calcular la distancia entre el molino y el centro de la granja
    const distancia = haversineDistance(centroGranja, molinoPos);
    const umbral = 20; // Umbral en kilómetros

    if (distancia > umbral)
      return res
        .status(400)
        .json({
          error: `The wind turbine is too far from the farm center (${distancia.toFixed(
            2
          )} km). Máximo permitido: ${umbral} km.`,
        });

    // Crear un ID aleatorio para el molino
    const collectionMolinos = client.db("TFG").collection("Molinos");

    const molinoMayorID = await collectionMolinos.findOne(
      {},
      { sort: { idMolino: -1 } }
    );
    let num_molinos = molinoMayorID ? parseInt(molinoMayorID.idMolino) + 1 : 1;

    const doc = {
      pos: pos,
      potenciaNominal: parseInt(potenciaNominal),
      longitudAspas: potenciaNominal == 15 ? 115 : 63,
      fechaCreacion: new Date(),
      idMolino: num_molinos,
      alarmas: { rpm: 14, anguloPlataforma: 8, TTD: 1, velocidadViento: 30 },
    };

    const result = await collectionGranjas.updateOne(
      { nombre: granja },
      { $push: { molinos: doc } }
    );

    const doc2 = {
      timestamp: new Date(),
      idMolino: num_molinos,
    };

    //Este insert nos permite tener un control del numero de ID actual
    const result2 = await collectionMolinos.insertOne(doc2);

    if (result.modifiedCount > 0 && result2.insertedId) {
      return res.status(200).json(doc);
    } else
      return res
        .status(500)
        .json({ error: "Error inserting the wind turbine into the database." });
  } catch (error) {
    console.error("Error en /addMolino:", error);
    return res
      .status(500)
      .json({ error: "An error occurred while adding the wind turbine." });
  }
});

router.delete("/eliminarMolino", async (req, res) => {
  try {
    const { idMolino, nombreGranja } = req.body;

    if(isNaN(idMolino)){
      return res.status(400).json({ error: "Wind turbine ID not allowed." });
    }

    if (!nameRegex.test(nombreGranja)) {
      return res.status(422).json({ error: "Invalid farm name. Only letters and spaces are allowed." });
    }

    if (!idMolino) {
      return res.status(400).json({ error: "Wind turbine ID is missing." });
    }

    const collectionMolinos = client.db("TFG").collection("Molinos");
    const collectionGranja = client.db("TFG").collection("Granjas");

    const molinos = await collectionMolinos.deleteMany({
      idMolino: parseInt(idMolino),
    });
    const granjas = await collectionGranja.updateOne(
      { nombre: nombreGranja },
      { $pull: { molinos: { idMolino: parseInt(idMolino) } } }
    );

    if (molinos.deletedCount === 0 && granjas.modifiedCount === 0) {
      return res.status(400).json({ error: "Wind turbine not found." });
    } else {
      res.json({ success: true });
    }
  } catch (error) {
    console.error("Error deleting or rearranging the wind turbines.:", error);
    res
      .status(500)
      .json({
        error:
          "An error occurred while deleting or rearranging the wind turbines.",
      });
  }
});

router.get("/molinos/:nombreGranja", async (req, res) => {
  try {
    const { nombreGranja } = req.params;
    const collectionMolinos = client.db("TFG").collection("Molinos");

    if (!nameRegex.test(nombreGranja)) {
      return res.status(422).json({ error: "Invalid farm name. Only letters and spaces are allowed." });
    }

    // Obtener los molinos asociados a la granja, ordenados por ID
    const molinos = await collectionMolinos
      .find({ nombreGranja })
      .sort({ idMolino: 1 })
      .toArray();

    // Renderizar el contenido del panel actualizado
    res.render("molinosPanel", { molinos, nombreGranja });
  } catch (error) {
    console.error("Error retrieving the wind turbines.:", error);
    res.status(500).send("Error retrieving the wind turbines.");
  }
});

module.exports = router;
