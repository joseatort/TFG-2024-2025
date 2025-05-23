"use strict";

var express = require("express");
var router = express.Router();

const bcrypt = require("bcrypt");

const client = require("../db/mongoDb.js");

//Login
router.post("/", async function (req, res) {
  const { user, contrasena } = req.body;

  if (!user) {
    res.status(422).json({ error: "The username is required." });
  } else if (!contrasena) {
    res.status(422).json({ error: "The password is required." });
  }

  try {
    const db = client.db("TFG");
    let collection = db.collection("Usuarios");
    let usuarioDB = await collection.findOne({ usuario: user });

    if (!usuarioDB)
      return res
        .status(401)
        .json({ error: "Incorrect username and/or password." });

    collection = db.collection("Granjas");

    let granjaDB = await collection
      .find({ compania: usuarioDB.compania })
      .toArray();

    const match = await bcrypt.compare(contrasena, usuarioDB.contrasena);

    if (match) {
      req.session.usuario = usuarioDB;
      req.session.granjas = granjaDB;
      req.session.auth = true;
      req.session.tipoGemelo = null;

      res.setFlash({
        type: "success",
        title: "Login",
        message: "¡You have successfully logged in!",
      });

      res.status(200).json({}); // Respondemos con éxito
    } else res.status(401).json({ error: "Incorrect username and/or password" });
  } catch (err) {
    console.error("Authentication error: ", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

//Logout
router.delete("/logout", (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      return next(createError(err));
    } else {
      res.clearCookie("connect.sid");
      res.status(200).json({ success: true, redirectTo: "/" });
    }
  });
});

//Volver a la vista del globo terraqueo en la posicion de la ultima granja
router.patch("/back", (req, res, next) => {
  if (req.session && req.session.usuario) {
    req.session.tipoGemelo = null;
    res.status(200).json({ success: true, redirectTo: `/` });
  } else {
    res.status(401).json({ error: "No authenticated user." });
  }
});

module.exports = router;