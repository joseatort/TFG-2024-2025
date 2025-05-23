"use strict";

const express = require("express");
const router = express.Router();

const client = require("../db/mongoDb.js");

const nameRegex = /^[a-zA-Z\s]+$/;

// Ruta POST para añadir una nueva granja eólica
router.post("/createGranja", async function (req, res, next) {
  const { nombre, lat, long } = req.body;
  const usuario = req.session.usuario;

  if (!nameRegex.test(nombre)) {
    return res.status(422).json({ error: "Invalid farm name. Only letters and spaces are allowed." });
  }

  if (!usuario || !usuario.compania)
    return res.status(401).json({ error: "Unauthenticated user." });

  if (!nombre || isNaN(lat) || isNaN(long))
    return res.status(422).json({
      error: "Name and position (latitude and longitude) are mandatory.",
    });

  try {
    const db = client.db("TFG");
    const collection = db.collection("Granjas");

    let existeNombre = await collection.find({ nombre: nombre, compania: usuario.compania }).toArray();
    if (existeNombre.length > 0)
      return res
        .status(409)
        .json({ error: "There is already a farm with that name." });

    //Sacamos informacion del clima en esa zona
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${long}&appid=5cd8dc159d049ad33d4e248f0c1793d3`;

    const response = await fetch(url);
    const data = await response.json();

    if (!data || !data.main || !data.wind) {
      console.error(
        `Could not retrieve weather data for the wind turbine with ID ${molino.idMolino}`
      );
      return;
    }

    const nuevaGranja = {
      nombre,
      pos: { lat: lat, long: long },
      molinos: [],
      weather: {},
      compania: usuario.compania,
      weather: {
        velocidadViento: data.wind.speed,
        temperatura: data.main.temp - 273.15,
      },
    };

    // Insertar la nueva granja
    await collection.insertOne(nuevaGranja);
    return res.status(201).json({ message: "Wind farm successfully added." });
  } catch (err) {
    res.status(500).json({ error: "Error adding the wind farm." });
  }
});

router.get("/granjasCompania", async function (req, res, next) {
  try {
    if (!req.session.usuario || !req.session.usuario.compania) {
      return res
        .status(401)
        .json({ error: "Not authenticated or company not specified." });
    }

    const db = client.db("TFG");
    const granjasCollection = db.collection("Granjas");
    const molinosCollection = db.collection("Molinos");

    // Obtener las granjas asociadas a la compañía del usuario
    const granjas = await granjasCollection
      .find({ compania: req.session.usuario.compania })
      .toArray();

    if (!granjas || granjas.length === 0) {
      return res
        .status(404)
        .json({ error: "No wind farms found for this company." });
    }

    // Para cada granja, buscar los molinos asociados
    for (const granja of granjas) {
      for (const [index, molino] of granja.molinos.entries()) {
        const datosMolino = await molinosCollection
          .aggregate([
            { $match: { idMolino: molino.idMolino } },
            {
              $facet: {
                simulacion: [
                  {
                    $match: {
                      velocidadAngularGenerador: { $exists: true },
                      timestamp: { $gte: new Date(Date.now() - 5000) }, // Filtra registros dentro de los últimos 5 segundos
                    },
                  },
                  { $sort: { timestamp: -1 } },
                  { $limit: 1 },
                ],
                alertas: [{ $unwind: "$alertas" }, { $count: "numeroAlertas" }],
              },
            },
            {
              $project: {
                _id: 0,
                simulacion: { $arrayElemAt: ["$simulacion", 0] },
                numeroAlertas: { $arrayElemAt: ["$alertas.numeroAlertas", 0] },
              },
            },
          ])
          .toArray();

        granja.molinos[index].simulacion = datosMolino[0].simulacion || {};
        granja.molinos[index].numeroAlertas = datosMolino[0].numeroAlertas || 0;
      }
    }

    res.json(granjas);
  } catch (err) {
    console.error("Error retrieving wind farms with turbines:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

router.patch("/actualizarWeather", async (req, res, next) => {
  try {
    var collectionGranjas = client.db("TFG").collection("Granjas");

    // Obtener todas las granjas con sus respectivos molinos
    const granjas = await collectionGranjas.find().toArray();

    // Función para actualizar el clima de un molino
    granjas.forEach(async (granja) => {
      const { lat, long } = granja.pos;
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${long}&appid=5cd8dc159d049ad33d4e248f0c1793d3`;

      try {
        const response = await fetch(url);
        const data = await response.json();

        if (!data || !data.main || !data.wind) {
          console.error(
            `Could not retrieve weather data for the wind turbine with ID ${molino.idMolino}`
          );
          return;
        }

        const doc = {
          weather: {
            velocidadViento: data.wind.speed,
            temperatura: data.main.temp - 273.15,
          },
        };

        await collectionGranjas.updateOne(
          { nombre: granja.nombre },
          { $set: doc },
          { upsert: true }
        );
      } catch (error) {
        console.error(
          `Error retrieving weather data for the farm ${granja.nombre}:`,
          error
        );
      }
    });

    res.status(200).json({ message: "Weather data successfully updated" });
  } catch (error) {
    console.error("Error updating weather data:", error);
    res
      .status(500)
      .json({ error: "An error occurred while updating weather data." });
  }
});

// Ruta para actualizar el centro de la granja
router.patch("/actualizarCentro/:nombre", async (req, res) => {
  const nombreGranja = req.params.nombre;
  const { centroide } = req.body;

  if (!nameRegex.test(nombreGranja)) {
    return res.status(422).json({ error: "Invalid farm name. Only letters and spaces are allowed." });
  }

  if (!centroide || !centroide.latitude || !centroide.longitude) {
    return res.status(400).json({ error: "Invalid or incomplete centroid." });
  }

  try {
    const db = client.db("TFG");
    const collection = db.collection("Granjas");

    // Buscar y actualizar la granja en la base de datos
    const result = await collection.updateOne(
      { nombre: nombreGranja },
      {
        $set: {
          "pos.lat": centroide.latitude,
          "pos.long": centroide.longitude,
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Farm not found." });
    }

    res.status(200).json({ message: "Center successfully updated." });
  } catch (err) {
    console.error("Error updating the farm center:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

router.delete("/eliminarGranja", async (req, res) => {
  try {
    const { nombreGranja } = req.body;

    if (!nameRegex.test(nombreGranja)) {
      return res.status(422).json({ error: "Invalid farm name. Only letters and spaces are allowed." });
    }

    if (!nombreGranja) {
      return res.status(400).json({ error: "Farm name is missing." });
    }

    const collectionMolinos = client.db("TFG").collection("Molinos");
    const collectionGranjas = client.db("TFG").collection("Granjas");

    // Obtener la granja
    const granja = await collectionGranjas.findOne({ nombre: nombreGranja });

    if (!granja) {
      return res.status(404).json({ error: "Farm not found." });
    }

    // Obtener los IDs de los molinos asociados a la granja
    const idMolinos = granja.molinos.map((molino) => molino.idMolino);

    // Eliminar los documentos de los molinos en la colección de Molinos
    await collectionMolinos.deleteMany({ idMolino: { $in: idMolinos } });

    // Eliminar la granja
    await collectionGranjas.deleteOne({ nombre: nombreGranja });

    res.json({
      success: true,
      message: "Farm and associated wind turbines successfully deleted.",
    });
  } catch (error) {
    console.error(
      "Error deleting the farm and associated wind turbines:",
      error
    );
    res.status(500).json({
      error:
        "An error occurred while deleting the farm and associated wind turbines",
    });
  }
});

router.get("/informacionGeneral/:ultimoUpdate", async (req, res, next) => {
  try {
    const nombreGranja = req.session.nombreGranja; // Nombre de la granja desde sesión
    const tiempo = req.params.ultimoUpdate;
    
    if (!nameRegex.test(nombreGranja)) {
      return res.status(422).json({ error: "Invalid farm name. Only letters and spaces are allowed." });
    }

    if (!nombreGranja) {
      return res.status(400).json({ error: "Farm name not found in session." });
    }

    const db = client.db("TFG");
    const granjasCollection = db.collection("Granjas");
    const molinosCollection = db.collection("Molinos"); // Time Series

    // Obtener la granja y sus molinos
    const granja = await granjasCollection.findOne({ nombre: nombreGranja });

    if (!granja) {
      return res.status(404).json({ error: "Farm not found." });
    }

    const idsMolinos = granja.molinos.map((m) => m.idMolino); // Obtener todos los ID de molinos de la granja

    const fechaTiempo =
      tiempo && tiempo !== "null" && !isNaN(Date.parse(tiempo))
        ? new Date(tiempo)
        : null;

    let matchStage = {
      $match: {
        idMolino: { $in: idsMolinos }, // Solo los molinos de la granja
        potenciaGenerador: { $exists: true },
        weather: { $exists: true },
        timestamp: {
          $exists: true,
          $gte: new Date(Date.now() - 1000),
        },
      },
    };

    // Agregación para obtener los datos de los molinos en la granja
    const potenciasClima = await molinosCollection
      .aggregate([
        {
          $match: {
            idMolino: { $in: idsMolinos },
            potenciaGenerador: { $gt: 0 },
            timestamp: {
              $exists: true,
              $gte: new Date(Date.now() - 1000),
            },
          },
        },
        { $sort: { idMolino: 1, timestamp: -1 } },
        {
          $group: {
            _id: "$idMolino",
            potenciaGenerador: { $first: "$potenciaGenerador" },
            weather: { $first: "$weather" }, // Agregar el campo "weather"
          },
        },
        { $project: { _id: 0, potenciaGenerador: 1, weather: 1 } },
      ])
      .toArray();

    if (fechaTiempo) {
      matchStage.$match.timestamp = { $gt: fechaTiempo };
    }

    // Agregación para obtener los datos de los molinos en la granja
    const molino = await molinosCollection
      .aggregate([
        matchStage,
        {
          $project: {
            _id: 0,
            idMolino: 1,
            potenciaGenerador: 1,
            weather: 1,
            timestamp: 1,
          },
        },
      ])
      .toArray();

    let defecto = {
      idMolino: -1,
      potenciaGenerador: 0,
      timestamp: new Date(),
      weather: {
        velocidadViento: 0,
        orientacionViento: 0,
        alturaOlas: 0,
      },
    };

    res.json({
      infoMolino: molino.length !== 0 ? molino : [defecto],
      infoGranja: granja,
      time: molino.length !== 0 ? molino[molino.length - 1].timestamp : new Date(),
      ultimasPotenciasClima: potenciasClima,
    });
  } catch (error) {
    console.error("Error retrieving control data.", error);
    res.status(500).json({ error: "Server error." });
  }
});

module.exports = router;
