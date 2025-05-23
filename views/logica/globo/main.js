var wwd;

requirejs(['./logica/globo/WorldWindShim', './logica/globo/LayerManager'],
    function (WorldWind, LayerManager) {
        "use strict";

        // Tell WorldWind to log only warnings and errors.
        WorldWind.Logger.setLoggingLevel(WorldWind.Logger.LEVEL_WARNING);

        // Create the WorldWindow.
        wwd = new WorldWind.WorldWindow("mapa");

        //Animacion atmosfera con tiempo real
        var starFieldLayer = new WorldWind.StarFieldLayer();
        var atmosphereLayer = new WorldWind.AtmosphereLayer();
        var shapesLayer = new WorldWind.RenderableLayer("Formas superficiales");
        var areasLayer = new WorldWind.RenderableLayer("Areas granjas");
        var textLayer = new WorldWind.RenderableLayer("InfoMolinos");

        var layers = [
            //Imagery layers.
            new WorldWind.BMNGLayer(),
            new WorldWind.CoordinatesDisplayLayer(wwd),
            starFieldLayer,
            atmosphereLayer,
            shapesLayer,
            new WorldWind.BMNGLandsatLayer(),
            new WorldWind.BingAerialWithLabelsLayer(null),
            textLayer,
            areasLayer
        ];

        layers.forEach(capa => { wwd.addLayer(capa); })

        var now = new Date();
        starFieldLayer.time = now;
        atmosphereLayer.time = now;

        var startTimeMillis = Date.now();
        runSimulation(starFieldLayer, atmosphereLayer, startTimeMillis);

        let nombreGranja = $("#nombreGranja").val();
        let ultimaUbicacion = JSON.parse($("#ultimaUbicacion").val());
        if(nombreGranja != null && nombreGranja != '')
            cargarMolinos(nombreGranja);

        if(ultimaUbicacion)
        {
            wwd.navigator.range = ultimaUbicacion.range;
            wwd.navigator.lookAtLocation.latitude = ultimaUbicacion.lat;
            wwd.navigator.lookAtLocation.longitude = ultimaUbicacion.long;
            dispatchEvent(new Event("updatelocation"));
        }
        else
        {
            wwd.navigator.range = 30000000;

            //Coordenadas España
            wwd.navigator.lookAtLocation.latitude = 32;
            wwd.navigator.lookAtLocation.longitude = -7;
    
        }

        // Create a layer manager for controlling layer visibility.
        new LayerManager(wwd);

        //Reloj
        setInterval(() => actualizarGranjas(), 1000);
    });

async function movimientos(lat, long, nombreGranja) {
    
    if(isNaN(wwd.navigator.range))
        wwd.navigator.range = 10000;

    wwd.navigator.tilt = parseInt(wwd.navigator.tilt);

    function reduceTiltSmoothly(callback) {

        if(nombreGranja === null)
        {
            callback();
            return;
        }

        const targetTilt = 0;         // Valor final de tilt
        const startTilt = wwd.navigator.tilt;
        const duration = (startTilt - targetTilt) * 16.67;   
        const startTime = performance.now();
    
        function animate(currentTime) {
            const elapsed = currentTime - startTime;
            // Calculamos el progreso (entre 0 y 1)
            const progress = Math.min(elapsed / duration, 1);
            // Aplicamos una interpolación lineal para actualizar tilt
            wwd.navigator.tilt = startTilt - progress * (startTilt - targetTilt);
            wwd.redraw();
    
            // Si aún no se completó la animación, solicitamos el siguiente frame
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Finalizada la animación, se ejecuta el callback
                if (callback) callback();
            }
        }
    
        requestAnimationFrame(animate);
    }
    
    reduceTiltSmoothly(() => {
        
        if(nombreGranja === null)
            wwd.goTo(new WorldWind.Position(lat, long, wwd.navigator.range));
        else
            wwd.goTo(new WorldWind.Position(lat, long, 10000));

        //Cancelar la animacion
        addEventListener("wheel", function(event)
        {
            if (event.deltaY > 0)
                wwd.goToAnimator.cancelled = true;
            
        })
        
        addEventListener("mousemove", function(event) {
            if (event.buttons === 1) {
                    wwd.goToAnimator.cancelled = true;
            }
        });

        if(nombreGranja !== null)
            {
                $('#panelInformacionGeneral').hide();
                eliminarGraficos('panelInformacionGeneral');
            
                if (bootstrap.Modal.getInstance(document.getElementById('myModal')))
                    bootstrap.Modal.getInstance(document.getElementById('myModal')).hide();
                        
                // Llamar a cargarMolinos para abrir el modal con los molinos de la granja seleccionada
                cargarMolinos(nombreGranja);
            }

    });

}


async function actualizarGranjas() {
    await new Promise(async (resolve, reject) => {
        await fetch('/granjas/granjasCompania')
            .then(response => response.json())
            .then(data => {

                if(data.error != null)
                {
                    console.warn(data.error); 
                    return;
                }
                    
                var areasLayer = wwd.layers.find(n => n.displayName == "Areas granjas")
                var shapesLayer = wwd.layers.find(n => n.displayName == "Formas superficiales")
                var textLayer = wwd.layers.find(n => n.displayName == "InfoMolinos")

                // Iterar sobre las granjas
                data.forEach(granja => {

                    const granjaCoordinates = granja.molinos.map(molino => ({
                        latitude: parseFloat(molino.pos.lat),
                        longitude: parseFloat(molino.pos.long)
                    }));

                    // Crear placemarks para los molinos
                    granja.molinos.forEach((molino, index) => {

                        const coord = molino.pos;

                        let current_text = textLayer.renderables.find(n => (n.position.latitude) == coord.lat && (n.position.longitude) == coord.long);

                        var textAttributes = new WorldWind.TextAttributes(null);
                        textAttributes.font.size = 18
                        textAttributes.font.family = 'Segoe UI'
                        textAttributes.color = WorldWind.Color.WHITE;

                        if (!current_text) {
                            var text = new WorldWind.GeographicText(new WorldWind.Position(coord.lat, coord.long, 2), "Inicializando...");
                            text.alwaysOnTop = true;
                            text.altitudeMode = WorldWind.RELATIVE_TO_GROUND;
                            text.attributes = textAttributes;
                            textLayer.addRenderable(text);
                        }

                        let current_placemark = shapesLayer.renderables
                        .filter(n => n instanceof WorldWind.Placemark)
                        .find(
                            n =>
                                n.position.latitude == coord.lat &&
                                n.position.longitude == coord.long
                        );

                        if (!current_placemark) {
                            var placemark = new WorldWind.Placemark(new WorldWind.Position(coord.lat, coord.long, 0), true, null);
                            placemark.displayName = granja.nombre;
                            var placemarkAttributes = new WorldWind.PlacemarkAttributes(null);
                            placemarkAttributes.imageScale = 1;

                            placemarkAttributes.labelAttributes.offset = new WorldWind.Offset(
                                WorldWind.OFFSET_FRACTION, 0.5,
                                WorldWind.OFFSET_FRACTION, 1.5
                            );
                            placemarkAttributes.imageSource = WorldWind.configuration.baseUrl + "images/white-dot.png";
                            placemark.label = `Wind Turbine ${index + 1}`; 
                            placemark.altitudeMode = WorldWind.CLAMP_TO_GROUND;
                            placemark.attributes.imageColor = WorldWind.Color.WHITE;
                            placemark.attributes = placemarkAttributes;
                            shapesLayer.addRenderable(placemark);

                            wwd.addEventListener("mousedown", function (event) {
                                // Convierte la ubicación del clic en coordenadas de WorldWind.
                                var pickList = wwd.pick(wwd.canvasCoordinates(event.clientX, event.clientY))

                                // Revisa si el marcador fue seleccionado.
                                if (pickList.objects.length > 0 && (pickList.objects[0].userObject === placemark || pickList.objects[0].userObject === text)) {
                                    let elevation = wwd.globe.elevationAtLocation(parseFloat(coord.lat), parseFloat(coord.long));
                                    // Si el marcador fue seleccionado, abre YouTube en una nueva pestaña.

                                    fetch('/cambioVista', {
                                        method: 'PATCH',
                                        headers: {
                                            'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify({ tipoGemelo: elevation > 0 ? 'Terrestre' : 'Marino', idMolino: molino.idMolino, nombreGranja: granja.nombre, 
                                            ultimaUbicacion:{range: wwd.navigator.range, lat: wwd.navigator.lookAtLocation.latitude, long: wwd.navigator.lookAtLocation.longitude}
                                        }) // Datos a enviar
                                    }).then(() => {
                                        location.reload(); // Recargar la página para aplicar el cambio de vista
                                    });
                                    
                                }
                            });

                        }

                        //Color Aerogenerador y panel
                        current_placemark = current_placemark ? current_placemark : placemark;
                        current_text = current_text ? current_text : text;
                        current_text.text = `\n     Rated Power ${molino.potenciaNominal} MW     \n      Current Power: ${(molino.simulacion.potenciaGenerador !== undefined ? molino.simulacion.potenciaGenerador.toFixed(2) : 0)} KW     \n`;

                        if(molino.numeroAlertas > 0)
                            current_text.text += `     ⚠️ Nº Alertas: ${molino.numeroAlertas}        \n`   

                        if (Number(molino.simulacion.potenciaGenerador) != 0 && molino.simulacion.potenciaGenerador !== undefined){ 
                            if(molino.simulacion.potenciaGenerador >= molino.potenciaNominal * 1000){
                                current_placemark.attributes.imageColor = WorldWind.Color.BLUE;
                                current_text.attributes.backgroundColor = WorldWind.Color.colorFromBytes(173, 216, 230, 128);
                            }
                            else if(molino.simulacion.potenciaGenerador < (molino.potenciaNominal * 1000 / 2)){ // Cuando la potencia actual este por debajo de la mitad se representa con un color naranja
                                current_placemark.attributes.imageColor = WorldWind.Color.colorFromBytes(255, 165, 0, 255);
                                current_text.attributes.backgroundColor = WorldWind.Color.colorFromBytes(255, 165, 100, 128);
                            }
                            else{ // Cuando la potencia actual este por encima de la mitad se representa con un color naranja y no sea la potencia nominal se representa de color verde
                                current_placemark.attributes.imageColor = WorldWind.Color.GREEN;
                                current_text.attributes.backgroundColor = WorldWind.Color.colorFromBytes(0, 152, 0, 128);
                            }
                        }
                        else{
                            current_placemark.attributes.imageColor = WorldWind.Color.RED;
                            current_text.attributes.backgroundColor = WorldWind.Color.colorFromBytes(152, 0, 0, 128);
                        }

                    });

                    // Crear un área para la granja usando el algoritmo de Andrew
                    const pathAttributes = new WorldWind.ShapeAttributes(null);
                    pathAttributes.outlineColor = WorldWind.Color.YELLOW;
                    pathAttributes.interiorColor = new WorldWind.Color(255, 255, 255, 0.2); // Azul semitransparente

                    let current_granja = shapesLayer.renderables.find(n => n.displayName == granja.nombre && n instanceof WorldWind.SurfacePolygon)

                    let sobrantes = shapesLayer.renderables.filter(n => 
                        n.displayName === granja.nombre && 
                        n instanceof WorldWind.Placemark &&
                        (   !granja.molinos.some(molino => 
                            molino.pos.lat === n.position.latitude && 
                            molino.pos.long === n.position.longitude
                        ) || granja.molinos.length == 0)
                    );
                    
                    if(sobrantes)
                    {
                        sobrantes.forEach(punto => 
                            {
                                shapesLayer.renderables.forEach(n => 
                                {
                                    if(n instanceof WorldWind.Placemark && parseInt(n.label.split(" ")[2]) > parseInt(punto.label.split(" ")[2]))
                                        n.label = `Wind Turbine ${parseInt(n.label.split(" ")[2]) - 1}`; 
                                })

                                shapesLayer.removeRenderable(shapesLayer.renderables.find(n => 
                                    n instanceof WorldWind.Placemark &&
                                    n.position.latitude == punto.position.latitude && 
                                    n.position.longitude == punto.position.longitude))
    
                                textLayer.removeRenderable(textLayer.renderables.find(n =>
                                    (n.position.latitude) == punto.position.latitude &&
                                    (n.position.longitude) == punto.position.longitude))                            
                            })
                    }


                    //Comprobamos si existen molinos asignados a esa granja
                    if (granjaCoordinates.length >= 1) {
                        const extremosGranjas = AlgoritmodeAndrew(granjaCoordinates);

                        let aux
                        if(current_granja)
                            aux = current_granja.boundaries.slice(0, -1);


                        if(!current_granja || 
                            !aux.every(n => 
                                extremosGranjas.some(e => 
                                    e.latitude === n.latitude && 
                                    e.longitude === n.longitude)) ||
                            extremosGranjas.length > aux.length)
                        {
                            // Calcular el centroide del polígono
                            const centroide = calcularCentroide(extremosGranjas);

                            extremosGranjas.push(extremosGranjas[0]);// Cerrar el polígono
                            const granjaPolygon = new WorldWind.SurfacePolygon(
                                extremosGranjas.map(coord => new WorldWind.Location(coord.latitude, coord.longitude)),
                                pathAttributes
                            );

                                
                            var attributes = new WorldWind.ShapeAttributes(null);
                            attributes.outlineColor = WorldWind.Color.GREEN;
                            attributes.interiorColor = new WorldWind.Color(0, 255, 0, 0.25);

                            var circle = new WorldWind.SurfaceCircle(new WorldWind.Location(centroide.latitude, centroide.longitude), 20000, attributes);
                            // circle.highlightAttributes = highlightAttributes;
                            
                            areasLayer.removeRenderable(areasLayer.renderables.find(n => n.displayName == granja.nombre));
                            areasLayer.addRenderable(circle);
                            circle.displayName = granja.nombre;

                            shapesLayer.removeRenderable(current_granja);
                            shapesLayer.addRenderable(granjaPolygon);
                            granjaPolygon.displayName = granja.nombre;
    
                        
                            // Actualizar la posición de la granja en MongoDB
                            fetch(`/granjas/actualizarCentro/${granja.nombre}`, {
                                method: "PATCH",
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify({ centroide })
                            })
                                .then(response => {
                                    if (!response.ok) {
                                        throw new Error("Error al actualizar el centro de la granja");
                                    }
                                    return response.json();
                                })
                                .then(data => {    
                                    $.ajax({
                                        type: "GET",
                                        url: "/",
                                        success: function(data)
                                        {
                                            const parse = new DOMParser();
                                            const doc = parse.parseFromString(data, "text/html");
                                        
                                            // Obtener los nuevos valores de velocidad del viento y temperatura
                                            $(doc).find(".carousel-item").each(function(index) {
                                                const nuevoContenido = $(this).find(".informacion").prop("outerHTML");
                                                $("#carouselUbicaciones .carousel-item").eq(index).find(".informacion").replaceWith(nuevoContenido);                                            });
                                        },
                                        error: function()
                                        {
                                            showToastr('error', 'Wind farm', 'An error has occurred');
                                        }
                                    })
    
 
                                })
                                .catch(error => {
                                    showToastr('error', 'Wind farm', `An error has occurred: + ${error}`);
                                });
                        }
                            
                    }
                    else
                    {
                        var attributes = new WorldWind.ShapeAttributes(null);
                        attributes.outlineColor = WorldWind.Color.GREEN;
                        attributes.interiorColor = new WorldWind.Color(0, 255, 0, 0.25);

                        var circle = new WorldWind.SurfaceCircle(new WorldWind.Location(granja.pos.lat, granja.pos.long), 20000, attributes);
                        areasLayer.removeRenderable(areasLayer.renderables.find(n => n.displayName == granja.nombre));
                        areasLayer.addRenderable(circle);
                        circle.displayName = granja.nombre;

                        shapesLayer.removeRenderable(current_granja);
                    }
                        

                });

                resolve();
            })
            .catch(error => {
                console.log("Error al cargar las granjas y molinos:", error);
                reject(error);
            });

    })

    function crossProduct(o, a, b) {
        return (a.latitude - o.latitude) * (b.longitude - o.longitude) -
            (a.longitude - o.longitude) * (b.latitude - o.latitude);
    }

    function AlgoritmodeAndrew(points) {
        if (points.length === 1) {
            return [points[0]]; // Si solo hay un molino, el "hull" es el mismo punto
        }
        // Ordenar los puntos por coordenada de latitud, luego por longitud
        points.sort((a, b) =>
            a.latitude === b.latitude ? a.longitude - b.longitude : a.latitude - b.latitude
        );

        const lower = [];
        for (const point of points) {
            while (lower.length >= 2 && crossProduct(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
                lower.pop();
            }
            lower.push(point);
        }

        const upper = [];
        for (const point of points.slice().reverse()) {
            while (upper.length >= 2 && crossProduct(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
                upper.pop();
            }
            upper.push(point);
        }

        // Quitar el último punto de cada mitad porque se repite en el inicio de la otra
        upper.pop();
        lower.pop();

        // Combinar ambas partes para obtener el envolvente convexa
        return lower.concat(upper);
    }
    
    function calcularCentroide(points) {
        if (points.length === 0) {
            return null; // Si no hay molinos, no hay centroide válido
        }
    
        if (points.length === 1) {
            return points[0]; // Si solo hay un molino, el centroide es ese mismo punto
        }
    
        if (points.length === 2) {
            return {
                latitude: (points[0].latitude + points[1].latitude) / 2,
                longitude: (points[0].longitude + points[1].longitude) / 2
            }; // Si hay dos molinos, el centroide es el punto medio de la línea
        }
    
        let xSum = 0,
            ySum = 0,
            area = 0;
    
        for (let i = 0; i < points.length; i++) {
            const current = points[i];
            const next = points[(i + 1) % points.length]; // Para cerrar el polígono correctamente
    
            const cross = current.latitude * next.longitude - next.latitude * current.longitude;
            area += cross;
            xSum += (current.latitude + next.latitude) * cross;
            ySum += (current.longitude + next.longitude) * cross;
        }
    
        area = Math.abs(area) / 2;
    
        // Si el área es 0, significa que los puntos están alineados y no forman un polígono
        if (area === 0) {
            // Ordenar los puntos por latitud (o por longitud si tienen la misma latitud)
            points.sort((a, b) => a.latitude === b.latitude ? a.longitude - b.longitude : a.latitude - b.latitude);
    
            return {
                latitude: (points[0].latitude + points[points.length - 1].latitude) / 2,
                longitude: (points[0].longitude + points[points.length - 1].longitude) / 2
            }; // Devuelve el punto medio de la línea formada por los puntos extremos
        }
    
        return {
            latitude: xSum / (6 * area),
            longitude: ySum / (6 * area)
        };
    }
    
}

function runSimulation(starFieldLayer, atmosphereLayer, startTimeMillis) {
    var simulatedMillisPerDay = 31536000000;
    // Compute the number of simulated days (or fractions of a day) since the simulation began.
    var elapsedTimeMillis = Date.now() - startTimeMillis;
    var simulatedDays = elapsedTimeMillis / simulatedMillisPerDay;

    // Compute a real date in the future given the simulated number of days.
    var millisPerDay = 24 * 3600 * 1000; // 24 hours/day * 3600 seconds/hour * 1000 milliseconds/second
    var simulatedMillis = simulatedDays * millisPerDay;
    var simulatedDate = new Date(startTimeMillis + simulatedMillis);

    // Update the date in both the Starfield and the Atmosphere layers.
    starFieldLayer.time = simulatedDate;
    atmosphereLayer.time = simulatedDate;
    wwd.redraw(); // Update the WorldWindow scene.

    requestAnimationFrame(() => runSimulation(starFieldLayer, atmosphereLayer, startTimeMillis));
}