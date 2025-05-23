"use strict";

/*
*   Para ejecutar usar node simulador.js tipo X, 
*
*   - Siendo tipo "OS" y "FO"
*   - Siendo X el id del molino al que se le quieren inyectar los datos
*/

const client = require('./db/mongoDb.js')
const fs = require('fs');
const path = require('path');

var data = null;

const tipo = process.argv[2];
const idMolino = process.argv[3];
var datos;

datos = fs.readFileSync(path.join(__dirname, `./simulacion/${tipo}Datos.json`), 'utf8');

data = JSON.parse(datos);
console.log('Datos cargados. Comenzamos inyección'); 


const collectionMolino = client.db("TFG").collection("Molinos");

inyeccion();

function inyeccion(indice = 0)
{
    const doc = {
        "timestamp": new Date(),

        "anguloAspas": { "1": data[indice].BldPitch1, "2": data[indice].BldPitch2 || data[indice].BldPitch1, "3": data[indice].BldPitch3 || data[indice].BldPitch1 },
        "velocidadAngularRotor": data[indice].RotSpeed,
        "velocidadAngularGenerador": data[indice].GenSpeed,
        "orientacionGondola": data[indice].NacYaw || 0,

        "TTD": {
            "ForeAft": data[indice].TTDspFA,
            "SideToSide": data[indice].TTDspSS
        },
        
        "movimientoPlataforma": { "x": data[indice].PtfmSway || 0, "y": data[indice].PtfmHeave || 0, "z": data[indice].PtfmSurge || 0},
        "anguloPlataforma": { "x": data[indice].PtfmPitch || 0, "y": data[indice].PtfmYaw || 0, "z": data[indice].PtfmRoll || 0 },

        "potenciaGenerador": data[indice].GenPwr,
        "torqueGenerador": data[indice].GenTq,
        
        "weather": {"velocidadViento": Math.sqrt(data[indice].Wind1VelX**2 + data[indice].Wind1VelY**2 + data[indice].Wind1VelZ**2),
                    "orientacionViento": Math.atan2(data[indice].Wind1VelY, data[indice].Wind1VelX) * (180 / Math.PI),
                    "alturaOlas": data[indice].Wave1Elev || 0},

        "idMolino": parseInt(idMolino),
    };

    collectionMolino.insertOne(doc).then(() => 
    {
        if(data.length > indice)
            setTimeout(() => inyeccion(indice + 1), 1000);
        else
            return;
    });
    
}