"use strict";

const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");

const client = require("../db/mongoDb.js");

router.get("/rpm", async function (req, res, next) {
  try {
    const idMolino = req.session.idMolino;

    if(isNaN(idMolino)){
      return res.status(400).json({ error: "Wind turbine ID not allowed." });
    }

    if (!idMolino) {
      return res
        .status(400)
        .json({ error: "Wind turbine ID not found in session." });
    }

    const db = client.db("TFG");
    const collection = db.collection("Molinos");

    const molino = await collection.findOne(
      {
        idMolino: idMolino,
        velocidadAngularRotor: { $exists: true },
        timestamp: { $gte: new Date(Date.now() - 5000) },
      },
      { sort: { timestamp: -1 } }
    );

    res.json({ rotationSpeed: molino ? molino.velocidadAngularRotor : 0 });
  } catch (error) {
    console.error("Error retrieving angular velocity:", error);
    res.status(500).json({ error: "Server error." });
  }
});

router.get("/anguloAspas", async function (req, res, next) {
  try {
    const idMolino = req.session.idMolino;

    if(isNaN(idMolino)){
        return res.status(400).json({ error: "Wind turbine ID not allowed." });
    }

    if (!idMolino) {
      return res
        .status(400)
        .json({ error: "Wind turbine ID not found in session." });
    }

    const db = client.db("TFG");
    const collection = db.collection("Molinos");

    const molino = await collection.findOne(
      {
        idMolino: idMolino,
        anguloAspas: { $exists: true },
        timestamp: { $gte: new Date(Date.now() - 5000) },
      },
      { sort: { timestamp: -1 } }
    );

    res.json({
      anguloAspas: molino ? molino.anguloAspas : { 1: 0, 2: 0, 3: 0 },
    });
  } catch (error) {
    console.error("Error retrieving angular velocity:", error);
    res.status(500).json({ error: "Server error." });
  }
});

router.get("/anguloPlataforma", async function (req, res, next) {
  try {
    const idMolino = req.session.idMolino;

    if(isNaN(idMolino)){
        return res.status(400).json({ error: "Wind turbine ID not allowed." });
    }

    if (!idMolino) {
      return res
        .status(400)
        .json({ error: "Wind turbine ID not found in session." });
    }

    const db = client.db("TFG");
    const collection = db.collection("Molinos");

    const molino = await collection.findOne(
      {
        idMolino: idMolino,
        anguloPlataforma: { $exists: true },
        timestamp: { $gte: new Date(Date.now() - 5000) },
      },
      { sort: { timestamp: -1 } }
    );

    res.json({
      anguloPlataforma: molino ? molino.anguloPlataforma : { x: 0, y: 0, z: 0 },
    });
  } catch (error) {
    console.error("Error retrieving angular velocity:", error);
    res.status(500).json({ error: "Server error." });
  }
});

router.get("/plataforma/:ultimoUpdate", async function (req, res, next) {
  try {
    const idMolino = req.session.idMolino;
    const tiempo = req.params.ultimoUpdate;

    if(isNaN(idMolino)){
        return res.status(400).json({ error: "Wind turbine ID not allowed." });
    }

    if (!idMolino) {
      return res
        .status(400)
        .json({ error: "Wind turbine ID not found in session." });
    }

    const db = client.db("TFG");
    const collection = db.collection("Molinos");

    const fechaTiempo =
      tiempo && tiempo !== "null" && !isNaN(Date.parse(tiempo))
        ? new Date(tiempo)
        : null;

    let matchStage = {
      $match: {
        idMolino: idMolino,
        movimientoPlataforma: { $exists: true },
        anguloPlataforma: { $exists: true },
        timestamp: { $exists: true },
      },
    };

    if (fechaTiempo) {
      matchStage.$match.timestamp.$gt = fechaTiempo;
    }

    const molino = await collection
      .aggregate([
        matchStage,
        {
          $project: {
            _id: 0,
            movimientoPlataforma: 1,
            anguloPlataforma: 1,
            timestamp: 1,
          },
        },
      ])
      .toArray();

    let defecto = {
      anguloPlataforma: {
        x: 0,
        y: 0,
        z: 0,
      },
      movimientoPlataforma: {
        x: 0,
        y: 0,
        z: 0,
      },
      timestamp: new Date(),
    };
    res.json({
      infoMolino: molino.length !== 0 ? molino : [defecto],
      time: molino.length !== 0 ? molino[molino.length - 1].timestamp : new Date()
    });
  } catch (error) {
    console.error("Error retrieving angular velocity:", error);
    res.status(500).json({ error: "Server error." });
  }
});

router.get("/salidas/:ultimoUpdate", async function (req, res, next) {
  try {
    const idMolino = req.session.idMolino;
    const tiempo = req.params.ultimoUpdate;

    if(isNaN(idMolino)){
        return res.status(400).json({ error: "Wind turbine ID not allowed." });
    }

    if (!idMolino) {
      return res
        .status(400)
        .json({ error: "Wind turbine ID not found in session." });
    }

    const db = client.db("TFG");
    const collection = db.collection("Molinos");

    const fechaTiempo =
      tiempo && tiempo !== "null" && !isNaN(Date.parse(tiempo))
        ? new Date(tiempo)
        : null;

    let matchStage = {
      $match: {
        idMolino: idMolino,
        velocidadAngularRotor: { $exists: true },
        velocidadAngularGenerador: { $exists: true },
        potenciaGenerador: { $exists: true },
        timestamp: { $exists: true },
      },
    };

    if (fechaTiempo) {
      matchStage.$match.timestamp.$gt = fechaTiempo;
    }

    const molino = await collection
      .aggregate([
        matchStage,
        {
          $project: {
            _id: 0,
            velocidadAngularRotor: 1,
            velocidadAngularGenerador: 1,
            potenciaGenerador: 1,
            TTD: 1,
            timestamp: 1,
          },
        },
      ])
      .toArray();

    let defecto = {
      TTD: {
        ForeAft: 0,
        SideToSide: 0,
        Twist: 0,
      },
      potenciaGenerador: 0,
      timestamp: new Date(),
      velocidadAngularGenerador: 0,
      velocidadAngularRotor: 0,
    };

    res.json({
      infoMolino: molino.length !== 0 ? molino : [defecto],
      time: molino.length !== 0 ? molino[molino.length - 1].timestamp : new Date()
    });
  } catch (error) {
    console.error("Error retrieving angular velocity.:", error);
    res.status(500).json({ error: "Server error." });
  }
});

router.get("/controles/:ultimoUpdate", async function (req, res, next) {
  try {
    const idMolino = req.session.idMolino;
    const tiempo = req.params.ultimoUpdate;

    if(isNaN(idMolino)){
        return res.status(400).json({ error: "Wind turbine ID not allowed." });
    }

    if (!idMolino) {
      return res
        .status(400)
        .json({ error: "Wind turbine ID not found in session." });
    }

    const db = client.db("TFG");
    const collection = db.collection("Molinos");

    const fechaTiempo =
      tiempo && tiempo !== "null" && !isNaN(Date.parse(tiempo))
        ? new Date(tiempo)
        : null;

    let matchStage = {
      $match: {
        idMolino: idMolino,
        anguloAspas: { $exists: true },
        torqueGenerador: { $exists: true },
        orientacionGondola: { $exists: true },
        timestamp: { $exists: true },
      },
    };

    if (fechaTiempo) {
      matchStage.$match.timestamp.$gt = fechaTiempo;
    }

    const molino = await collection
      .aggregate([
        matchStage,
        {
          $project: {
            _id: 0,
            anguloAspas: 1,
            torqueGenerador: 1,
            orientacionGondola: 1,
            timestamp: 1,
          },
        },
      ])
      .toArray();

    let defecto = {
      anguloAspas: {
        1: 0,
        2: 0,
        3: 0,
      },
      orientacionGondola: 0,
      timestamp: new Date(),
      torqueGenerador: 0,
    };

    res.json({
      infoMolino: molino.length !== 0 ? molino : [defecto],
      time: molino.length !== 0 ? molino[molino.length - 1].timestamp : new Date()
    });
  } catch (error) {
    console.error("Error retrieving control data:", error);
    res.status(500).json({ error: "Server error." });
  }
});

router.get("/climaMolino", async (req, res) => {
  try {
    // Asegurar que la sesión tiene los datos necesarios
    if (!req.session || !req.session.idMolino || !req.session.nombreGranja) {
      return res
        .status(401)
        .json({ error: "No valid session or farm data found." });
    }

    if(isNaN(req.session.idMolino)){
        return res.status(400).json({ error: "Wind turbine ID not allowed." });
    }

    const idMolino = parseInt(req.session.idMolino);

    if (!idMolino) {
      return res
        .status(400)
        .json({ error: "Missing wind turbine or farm data in session." });
    }

    const collection = client.db("TFG").collection("Molinos");

    let matchStage = {
      $match: {
        idMolino: idMolino,
        weather: { $exists: true },
        timestamp: {
          $exists: true,
          $gte: new Date(Date.now() - 5000),
        },
      },
    };

    const molino = await collection
      .aggregate([
        matchStage,
        { $sort: { timestamp: -1 } },
        { $limit: 1 },
        { $project: { _id: 0, weather: 1, timestamp: 1 } },
      ])
      .toArray();

    let defecto = {
      timestamp: new Date(),
      weather: {
        velocidadViento: 0,
        orientacionViento: 0,
        alturaOlas: 0,
      },
    };

    res.json({ infoMolino: molino.length !== 0 ? molino[0] : defecto });
  } catch (error) {
    console.error("Error retrieving weather data:", error);
    res.status(500).json({ error: "Error retrieving weather data." });
  }
});

router.get("/clima/:tipo/:ultimoUpdate", async function (req, res, next) {
  try {
    const idMolino = req.session.idMolino;
    const tipo = req.params.tipo;
    const tiempo = req.params.ultimoUpdate;

    if(isNaN(idMolino)){
        return res.status(400).json({ error: "Wind turbine ID not allowed." });
    }

    if (!idMolino) {
      return res
        .status(400)
        .json({ error: "Wind turbine ID not found in session." });
    }

    const db = client.db("TFG");
    const collection = db.collection("Molinos");

    const fechaTiempo =
      tiempo && tiempo !== "null" && !isNaN(Date.parse(tiempo))
        ? new Date(tiempo)
        : null;

    let matchStage = {
      $match: {
        idMolino: idMolino,
        weather: { $exists: true },
        timestamp: { $exists: true },
      },
    };

    if (fechaTiempo) {
      matchStage.$match.timestamp.$gt = fechaTiempo;
    }

    let projection = { _id: 0, timestamp: 1 };
    projection[`weather.${tipo}`] = 1;

    const molino = await collection
      .aggregate([matchStage, { $project: projection }])
      .toArray();

    let defecto = {
      timestamp: new Date(),
      weather: {
        [`${tipo}`]: 0,
      },
    };

    res.json({
      infoMolino: molino.length !== 0 ? molino : [defecto],
      time: molino.length !== 0 ? molino[molino.length - 1].timestamp : new Date()
    });
  } catch (error) {
    console.error("Error retrieving weather data.", error);
    res.status(500).json({ error: "Server error." });
  }
});

router.get("/alertasActivas", async (req, res) => {
  try {
    const idMolino = req.session.idMolino;
    const db = client.db("TFG");
    const collectionMolinos = db.collection("Molinos");

    if(isNaN(idMolino)){
        return res.status(400).json({ error: "Wind turbine ID not allowed." });
    }

    const alertasActivas = await collectionMolinos
      .aggregate([
        { $match: { idMolino: idMolino } },
        { $unwind: "$alertas" },
        {
          $project: {
            _id: 1,
            idMolino: 1,
            "alertas.tipo": 1,
            "alertas.descripcion": 1,
            "alertas.timestamp": 1,
          },
        },
      ])
      .toArray();

    res.json(alertasActivas);
  } catch (error) {
    console.error("Error retrieving active alerts.", error);
    res.status(500).json({ error: "Error retrieving active alerts." });
  }
});

router.delete("/eliminarAlerta", async (req, res) => {
  try {
    const { idAlerta, tipo } = req.body;
    const db = client.db("TFG");
    const collection = db.collection("Molinos");


    // Verificar que el ID es válido
    if (!ObjectId.isValid(idAlerta)) {
      return res.status(400).json({ error: "Invalid alert ID." });
    }

    const objectId = new ObjectId(idAlerta);

    // Buscar el documento que contiene la alerta
    const molino = await collection.findOne({ _id: objectId });

    if (!molino) {
      return res.status(404).json({ error: "Alert not found." });
    }

    // Filtrar las alertas para eliminar la que coincide con el ID y tipo
    molino.alertas = molino.alertas.filter((alerta) => alerta.tipo != tipo);

    if (molino.alertas.length != 0) await collection.insertOne(molino);

    await collection.deleteOne({ _id: molino._id });

    res.json({ success: true, message: "Alert successfully deleted." });
  } catch (error) {
    console.error("Error deleting alert:", error);
    res.status(500).json({ error: "Error deleting alert:" });
  }
});

router.delete("/eliminarAlertas", async (req, res) => {
  try {
    const idMolino = req.session.idMolino;
    const db = client.db("TFG");
    const collection = db.collection("Molinos");

    if(isNaN(idMolino)){
        return res.status(400).json({ error: "Wind turbine ID not allowed." });
    }

    // Verificar que el ID es válido
    if (!idMolino) {
      return res
        .status(400)
        .json({ error: "Wind turbine ID not found in session." });
    }

    // Eliminar todos los documentos (alertas) asociados al idMolino
    const resultado = await collection.deleteMany({ idMolino: idMolino });

    if (resultado.deletedCount === 0) {
      return res.status(404).json({ error: "No alerts found to delete." });
    }

    res.json({ success: true, message: "All alerts successfully deleted." });
  } catch (error) {
    console.error("Error deleting alerts:", error);
    res.status(500).json({ error: "Error deleting alerts." });
  }
});

router.put("/editarAlarmas", async function (req, res) {
  const {
    rpmAlarma,
    anguloPlataformaAlarma,
    TTDAlarma,
    velocidadVientoAlarma,
  } = req.body;

  if (
    rpmAlarma === "" &&
    anguloPlataformaAlarma === "" &&
    TTDAlarma === "" &&
    velocidadVientoAlarma === ""
  ) {
    res.status(400).json({ error: "There is no data to change" });
    return;
  }

  const nombreGranja = req.session.nombreGranja;
  const idMolino = req.session.idMolino;

  if(isNaN(idMolino)){
    return res.status(400).json({ error: "Wind turbine ID not allowed." });
    }

  const db = client.db("TFG");
  const collectionGranjas = db.collection("Granjas");
  const updateFields = {};

  if (rpmAlarma !== "") {
    updateFields["molinos.$[elem].alarmas.rpm"] = parseFloat(rpmAlarma);
  }

  if (anguloPlataformaAlarma !== "") {
    updateFields["molinos.$[elem].alarmas.anguloPlataforma"] = parseFloat(
      anguloPlataformaAlarma
    );
  }

  if (TTDAlarma !== "") {
    updateFields["molinos.$[elem].alarmas.TTD"] = parseFloat(TTDAlarma);
  }

  if (velocidadVientoAlarma !== "") {
    updateFields["molinos.$[elem].alarmas.velocidadViento"] = parseFloat(
      velocidadVientoAlarma
    );
  }

  const resultado = await collectionGranjas.updateOne(
    {
      nombre: nombreGranja, // Filtro por nombre de la granja
      "molinos.idMolino": idMolino, // Filtro por idMolino dentro del array molinos
    },
    {
      $set: updateFields, // Solo se añaden los campos que tienen un valor válido
    },
    {
      arrayFilters: [
        { "elem.idMolino": idMolino }, // Filtro el array de molinos para actualizar solo el que tiene el idMolino correspondiente
      ],
    }
  );

  if (resultado.modifiedCount == 0) {
    res.status(400).json({ error: "Server error." });
    return;
  }

  res.status(200).json({ mensaje: "Alarms updated." });
});

module.exports = router;
