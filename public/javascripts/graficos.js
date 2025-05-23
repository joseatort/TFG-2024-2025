"use strict";

//Periodo de frecuencia de datos
const velocidadRefresco = 2000;

const umbralTiempo = 5000

//Intervalo de tiempo de 1 minuto por defecto
var rangoXDefecto = 60000;

$(document).ready(function() {
    
    $(document).keydown(function(e) {
        if (e.key === "ArrowLeft")
            $("#inicio").click();
        else if (e.key === "ArrowRight")
            $("#final").click();
        else if (e.key === "ArrowDown")
            $("#centro").click(); 
    });

    if ($("#tipoGemelo").val() !== "") {
        centro();
    }

    $("#rangoX").on('change', function() {
        rangoXDefecto = parseInt(this.value);
    });

    $("#atrasButton").on('click', function(event) {
        event.preventDefault();

        $.ajax({
            type: 'PATCH',
            url: '/usuarios/back', // La ruta donde se enviará el formulario
            success: function(result) {
                showToastr('success', 'Redirecting...', '');
                setTimeout(function() {
                    window.location.href = '/';
                }, 100);
            },
            error: function(xhr) {
                console.log("AJAX request error", xhr); // Comprobamos el error
                showToastr('error', 'An error has occurred', xhr.responseJSON.error);
            }
        });
    });

    // Botones de la barra de control para mostrar paneles
    $(".btnPanel, .btnMinimizar").on("click", function () {
        const panelId = $(this).data("target");
        const panel = $("#" + panelId);

        if (panel.is(":visible")) {
            panel.hide();
            setTimeout(() => panel.hide(), 300); 
            eliminarGraficos(panelId);
        } else {
            panel.show(() => {
                inicializarGraficos(panelId);
            });
        }
    });

    $("body").on("submit", "#editarAlarmas", function(event)
    {
        event.preventDefault();

        const formData = $("#editarAlarmas").serialize();

        $.ajax({
            type: "PUT",
            data: formData,
            url: '/gemeloDigital/editarAlarmas',
            success: function() {

                showToastr('success', 'Wind turbine', `Alarm's configuration has been changed!`);
                $.ajax({
                    type: "GET",
                    url: "/",
                    success: function(data) {
                        const parse = new DOMParser();
                        const doc = parse.parseFromString(data, "text/html");
                        const contenidoCarousel = doc.querySelector("#editarAlarmas");
                        $("#editarAlarmas").replaceWith(contenidoCarousel);
                    },
                    error: function() {
                        showToastr('error', 'Wind Farm', 'An error had ocurred');
                    }
                    
                });
            },
            error: function(xhr) {
                console.error("Error updating weather:", xhr.responseText);
            }
        });
        
    })

});

//Intervalos
var intervaloGraficosPlataforma = null;
var intervaloGraficosSalidas = null;
var intervaloGraficosAlarmas = null;
var intervaloGraficosControles = null;
var intervaloGraficosClima = null;
var intervaloGraficoExpandido = null;
var intervaloGraficosInformacionGeneral = null;

//Gestion de graficos
function inicializarGraficos(panelId) {
    switch (panelId) {
        case "panelClima":
            inicializarGraficosClima();
            break;
        case "panelPlataforma":
            inicializarGraficosPlataforma();
            break;
        case "panelControl":
            inicializarGraficoControles();
            break;
        case "panelSalidas":
            inicializarGraficosSalidas();
            break;
        case "panelAlarmas":
            intervaloGraficosAlarmas = setInterval(cargarAlertasActivas, velocidadRefresco * 2);
            break;
        case "panelInformacionGeneral":
            inicializarGraficoInformacionGeneral();
            break;
    
        default:
            console.log("Panel no reconocido:", panelId);
            break;
    }
}

function eliminarGraficos(panelId) {
    switch (panelId) {
        case "panelClima":
            Plotly.purge(document.getElementById("detalleDatosClima"));
            clearInterval(intervaloGraficosClima);
            clearInterval(intervaloGraficoExpandido);
            break;
        // Puedes agregar más casos aquí si es necesario
        case "panelPlataforma":
            Plotly.purge(document.getElementById("movimientoPlataforma"));
            Plotly.purge(document.getElementById("anguloPlataforma"));
            clearInterval(intervaloGraficosPlataforma);
            break;
        // Puedes agregar más casos aquí si es necesario
        case "panelAlarmas":
            Plotly.purge(document.getElementById("alertasContainer"));
            clearInterval(intervaloGraficosAlarmas);
            break;
        case "panelControl":
            Plotly.purge(document.getElementById("anguloAspas"));
            Plotly.purge(document.getElementById("torqueGenerador"));
            Plotly.purge(document.getElementById("orientacionGondola"));
            clearInterval(intervaloGraficosControles);
            break;
        // Puedes agregar más casos aquí si es necesario
        case "panelSalidas":
            Plotly.purge(document.getElementById("velocidadAngularRotor"));
            Plotly.purge(document.getElementById("potenciaGenerador"));            
            Plotly.purge(document.getElementById("velocidadAngularGenerador"));
            Plotly.purge(document.getElementById("TTD"));
            clearInterval(intervaloGraficosSalidas)
            break;
        case "panelInformacionGeneral":
            Plotly.purge(document.getElementById("potenciaGenerada"));
            Plotly.purge(document.getElementById("graficoSectorial"));
            clearInterval(intervaloGraficosInformacionGeneral);
            break;
    
        default:
            console.log("Panel no reconocido:", panelId);
            break;
    }
}

//Graficos gemeloDigital
function inicializarGraficosClima() {
    const graficoVelocidad = document.getElementById("velocidadViento");
    const graficoAlturaOlas = document.getElementById("alturaOlas");
    const graficoDireccion = document.getElementById("orientacionViento");

    var dataVelocidad = [
        {
            domain: { x: [0, 1], y: [0, 1] },
            value: 0,
            type: "indicator",
            mode: "gauge+number",
            number: { suffix: " m/s" },
            gauge: {
                axis: {
                    range: [0, 35],
                    tickmode: "linear",
                    tick0: 0,
                    dtick: 10,
                    tickfont: { color: "white" }
                },
                bgcolor: "transparent"
            },
        }
    ];

    var dataAlturaOlas = [{
        domain: { x: [0, 1], y: [0, 1] },
        value: 0, 
        type: "indicator",
        mode: "gauge+number",
        number: { suffix: " m" },
        gauge: {
            axis: { range: [-5, 5], tickmode: "linear", tick0: 0, dtick: 1 },
            bar: { color: "red" }
        }
    }];

    const dataDireccion = [
        {
            type: "scatterpolar",
            r: [0, 1],
            theta: [0, 0],
            mode: "lines",
            line: {
                color: "blue",
                width: 3
            }
        }
    ];

    var layoutVelocidad = {
        width: graficoVelocidad.clientWidth,
        height: graficoVelocidad.clientHeight,
        margin: { t: 0, l: 40, b: 5, r: 40 },
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: "white" },
        annotations: [{
            text: 'Wind speed (m/s)',
            xref: 'paper',
            yref: 'paper',
            x: 0.5,
            y: 0.2,
            showarrow: false,
            xanchor: 'center',
            yanchor: 'top',
            textangle: 0
        }]
    };

    var layoutAlturaOlas = {
        width: graficoAlturaOlas.clientWidth,
        height: graficoAlturaOlas.clientHeight,
        margin: { t: 0, l: 40, b: 5, r: 40 },
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: "white" },
        annotations: [{
            text: 'Wave height (m)',
            xref: 'paper',
            yref: 'paper',
            x: 0.5,
            y: 0.2,
            showarrow: false,
            xanchor: 'center',
            yanchor: 'top',
            textangle: 0
        }]
    };

    const layoutDireccion = {
        margin: { t: 40, l: 20, b: 40, r: 20},
        polar: {
            radialaxis: { 
                visible: false,
                showticklabels: false
            },
            angularaxis: {
                tickmode: "array",
                tickvals: [0, 90, 180, 270, 360],
                ticktext: ["N", "E", "S", "O", "N"],
                direction: "clockwise",
                rotation: 90,
            }
        },
        showlegend: false,
        width: graficoDireccion.clientWidth,
        height: graficoDireccion.clientHeight,
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: "white" },
        annotations: [{
            text: 'Wind direction (deg)',
            xref: 'paper',
            yref: 'paper',
            x: 0.5,
            y: -0.075,
            showarrow: false,
            xanchor: 'center',
            yanchor: 'top',
            textangle: 0
        }]
    };

    Plotly.newPlot(graficoVelocidad, dataVelocidad, layoutVelocidad, { displayModeBar: false });
    Plotly.newPlot(graficoAlturaOlas, dataAlturaOlas, layoutAlturaOlas, { displayModeBar: false });
    Plotly.newPlot(graficoDireccion, dataDireccion, layoutDireccion, { displayModeBar: false });

    intervaloGraficosClima = setInterval(actualizarGraficosClima, velocidadRefresco);

    function actualizarGraficosClima() {
        $.ajax({
            url: "/gemeloDigital/climaMolino",
            type: "GET",
            success: function (data) {
                if (data.infoMolino && data.infoMolino.weather) {
                    Plotly.update(graficoVelocidad, { 'value': [data.infoMolino.weather.velocidadViento.toFixed(2)] }, {}, [0]);
                    Plotly.update(graficoAlturaOlas, { 'value': [data.infoMolino.weather.alturaOlas.toFixed(2)]}, {}, [0]);
                    Plotly.update(graficoDireccion, { 'r': [[0, 1]], 'theta': [[0, data.infoMolino.weather.orientacionViento]] }, {}, [0]);
                } else {
                    console.error("Datos del clima no disponibles:", data);
                }
            },
            error: function (xhr) {
                console.error("Error al obtener datos del clima:", xhr);
            }
        });
    }
    // Agregar evento de clic para marcar el gráfico seleccionado
    $(".botonClima").on('click', function() {
        // Quitar la clase 'seleccionado' de todos los botones
        $(".botonClima").removeClass("seleccionado");
        
        // Agregar la clase 'seleccionado' al botón que fue clicado
        $(this).addClass("seleccionado");
    });

    // Eventos específicos para cada gráfico
    $("#velocidadViento").on('click', function() {
        expandirGraficoClima('velocidadViento', 'm/s', 'Wind Speed');
    });

    $("#alturaOlas").on('click', function() {
        expandirGraficoClima('alturaOlas', 'm', 'Waves Height');
    });

    $("#orientacionViento").on('click', function() {
        expandirGraficoClima('orientacionViento', '°', 'Wind direction');
    });

}

function expandirGraficoClima(tipo, unidad, titulo) {
    const graficoExpandido = document.getElementById("detalleDatosClima");
    if (!graficoExpandido) {
        console.error('Element with id "detalleDatosClima" not found.');
        return;
    }

    // NO limpiar todo el div, solo actualizarlo
    graficoExpandido.innerHTML = '';

    const data = [
        {
            x: [],
            y: [],
            type: 'scatter',
            mode: 'lines',
            name: titulo,
            line: { color: 'blue' }
        }
    ];

    const layout = {
        title: titulo,
        xaxis: {
            title: 'Tiempo',
            type: 'date',
            tickformat: '%M:%S'
        },
        yaxis: {
            title: `${titulo} (${unidad})`,
            autorange: true
        },
        width: graficoExpandido.clientWidth,
        height: graficoExpandido.clientHeight,
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: "white" },
        margin: {
            t: 0,
            l: window.innerWidth * 0.03,
            b: window.innerHeight * 0.025,
            r: window.innerWidth * 0.02,
        },
    };

    Plotly.newPlot(graficoExpandido, data, layout);

    let autoScrollExpandirClima = true;

    // Detectar cuando se activa el modo "Pan" (o se hace cualquier relayout) para desactivar el auto-scroll.
    graficoExpandido.on('plotly_relayout', function(eventData) {
        if (eventData.dragmode === 'pan' || eventData.dragmode === 'zoom')
            autoScrollExpandirClima = false;
    });

    graficoExpandido.on('plotly_doubleclick', function() {
        autoScrollExpandirClima = true;
    });

    let time = null;
    clearInterval(intervaloGraficoExpandido);
    intervaloGraficoExpandido = setInterval(actualizarGraficoExpandido, velocidadRefresco);
    async function actualizarGraficoExpandido() {
        await fetch(`/gemeloDigital/clima/${tipo}/${time}`)
            .then(response => response.json())
            .then(data => {
                time = data.time;

                let tiempos = [];
                let valores = [];
                let tiempoAnterior = null;
                
        
                data.infoMolino.forEach(item => {
                    let tiempoActual = new Date(item.timestamp);
        
                    // Si hay un salto mayor al umbral, insertamos puntos intermedios con valor 0
                    if (tiempoAnterior && (tiempoActual - tiempoAnterior > umbralTiempo)) {
                        let lastTime = new Date(tiempoAnterior);
                        while (tiempoActual - lastTime > umbralTiempo) {
                            lastTime = new Date(lastTime.getTime() + umbralTiempo);
                            if (lastTime < tiempoActual) { // Nos aseguramos de no sobrepasar el tiempo actual
                                tiempos.push(lastTime);
                                valores.push(0);
                            }
                        }
                    }
        
                    // Agregar el dato actual
                    tiempos.push(tiempoActual);
                    // Si existe la propiedad weather y el valor para "tipo" no es nulo, se usa; de lo contrario, se asigna 0
                    let valor = (item.weather && item.weather[tipo] != null) ? item.weather[tipo] : 0;
                    valores.push(valor);
        
                    tiempoAnterior = tiempoActual;
                });
        
                // Agregar puntos intermedios desde el último dato hasta el instante actual, si corresponde
                let ahora = new Date();
                if (tiempoAnterior && (ahora - tiempoAnterior > umbralTiempo)) {
                    let lastTime = new Date(tiempoAnterior);
                    while (ahora - lastTime > umbralTiempo) {
                        lastTime = new Date(lastTime.getTime() + umbralTiempo);
                        if (lastTime <= ahora) {
                            tiempos.push(lastTime);
                            valores.push(0);
                        }
                    }
                }

                Plotly.extendTraces(graficoExpandido, {
                    x: [tiempos],
                    y: [valores]
                }, [0]);

                // Si el auto-scroll está activo, actualizamos el rango de los ejes x (ventana de 60 segundos)
                if (autoScrollExpandirClima && tiempos.length > 0) {
                    let lastTime = tiempos[tiempos.length - 1];
                    let startTime = new Date(lastTime.getTime() - rangoXDefecto);
                    Plotly.relayout(graficoExpandido, { 'xaxis.range': [startTime, lastTime] });
                }
            })
            .catch(error => console.error('Error al obtener datos:', error));
    }
}

function inicializarGraficosPlataforma() {
    const graficoMovimiento = document.getElementById("movimientoPlataforma");
    const graficoAngulo = document.getElementById("anguloPlataforma");

    var traceMovimientoX = {
        x: [],
        y: [],
        mode: 'lines',
        line: { color: '#80CAF6' },
        name: 'Mov X'
    };

    var traceMovimientoY = {
        x: [],
        y: [],
        mode: 'lines',
        line: { color: '#FF5733' },
        name: 'Mov Y'
    };

    var traceMovimientoZ = {
        x: [],
        y: [],
        mode: 'lines',
        line: { color: '#33FF57' },
        name: 'Mov Z'
    };

    var traceAnguloX = {
        x: [],
        y: [],
        mode: 'lines',
        line: { color: '#80CAF6' },
        name: 'Áng X'
    };

    var traceAnguloY = {
        x: [],
        y: [],
        mode: 'lines',
        line: { color: '#FF5733' },
        name: 'Áng Y'
    };

    var traceAnguloZ = {
        x: [],
        y: [],
        mode: 'lines',
        line: { color: '#33FF57' },
        name: 'Áng Z'
    };

    var dataMovimiento = [traceMovimientoX, traceMovimientoY, traceMovimientoZ];
    var dataAngulo = [traceAnguloX, traceAnguloY, traceAnguloZ];

    var layoutMovimiento = {
        width: graficoMovimiento.clientWidth,
        height: graficoMovimiento.clientHeight,
        margin: {
            t: 0,
            l: window.innerWidth * 0.04,
            b: window.innerHeight * 0.02,
            r: 0,
        },
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: "white" },
        xaxis: {
            type: 'date',
            tickformat: '%M:%S',
            title: 'Tiempo'
        },
        yaxis: {
            title: 'Movimiento',
            range: [-1, 1], // Ajustar el rango del eje y para centrar el 0
            autorange: true
        },
        annotations: [{
            text: 'Platform movement (m)',
            xref: 'paper',
            yref: 'paper',
            x: -0.075,
            y: 0.5,
            showarrow: false,
            xanchor: 'right',
            yanchor: 'middle',
            textangle: -90
        }]
    };

    var layoutAngulo = {
        width: graficoAngulo.clientWidth,
        height: graficoAngulo.clientHeight,
        margin: {
            t: 0,
            l: window.innerWidth * 0.04,
            b: window.innerHeight * 0.02,
            r: 0,
        },
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: "white" },
        xaxis: {
            type: 'date',
            
            tickformat: '%M:%S',
            title: 'Tiempo'
        },
        yaxis: {
            title: 'Angulo',
            range: [-1, 1], // Ajustar el rango del eje y para centrar el 0
            autorange: true
        },
        annotations: [{
            text: 'Platfrom angle (deg)',
            xref: 'paper',
            yref: 'paper',
            x: -0.075,
            y: 0.5,
            showarrow: false,
            xanchor: 'right',
            yanchor: 'middle',
            textangle: -90
        }]
    };

    Plotly.newPlot(graficoMovimiento, dataMovimiento, layoutMovimiento);
    Plotly.newPlot(graficoAngulo, dataAngulo, layoutAngulo);

    // Control del auto-scroll para los gráficos de series temporales en Controles.
    let autoScrollMovimientoPlataforma = true;
    let autoScrollAngulosPlataforma = true;

    // Detectar cuando se activa el modo "Pan" (o se hace cualquier relayout) para desactivar el auto-scroll.
    graficoMovimiento.on('plotly_relayout', function(eventData) {
        if (eventData.dragmode === 'pan' || eventData.dragmode === 'zoom')
            autoScrollMovimientoPlataforma = false;
    });

    graficoMovimiento.on('plotly_doubleclick', function() {
        autoScrollMovimientoPlataforma = true;
    });

    graficoAngulo.on('plotly_relayout', function(eventData) {
        if (eventData.dragmode === 'pan' || eventData.dragmode === 'zoom')
            autoScrollAngulosPlataforma = false;
    });

    graficoAngulo.on('plotly_doubleclick', function() {
        autoScrollAngulosPlataforma = true;
    });

    var time = null;
    intervaloGraficosPlataforma = setInterval(actualizarGraficosPlataforma, velocidadRefresco);
    async function actualizarGraficosPlataforma() {
        await fetch(`/gemeloDigital/plataforma/${time}`)
            .then(response => response.json())
            .then(data => {
                time = data.time;
    
                let tiempos = [];
                let xValuesMovimiento = [];
                let yValuesMovimiento = [];
                let zValuesMovimiento = [];
                let xValuesAngulo = [];
                let yValuesAngulo = [];
                let zValuesAngulo = [];
    
                let tiempoAnterior = null;
    
                // Iteramos por cada dato recibido
                data.infoMolino.forEach(item => {
                    let tiempoActual = new Date(item.timestamp);
    
                    // Si existe un salto mayor al umbral entre datos consecutivos,
                    // agregamos puntos intermedios a 0 cada 2 segundos.
                    if (tiempoAnterior && (tiempoActual - tiempoAnterior > umbralTiempo)) {
                        let lastTime = new Date(tiempoAnterior);
                        while (tiempoActual - lastTime > umbralTiempo) {
                            lastTime = new Date(lastTime.getTime() + umbralTiempo);
                            tiempos.push(lastTime);
                            xValuesMovimiento.push(0);
                            yValuesMovimiento.push(0);
                            zValuesMovimiento.push(0);
                            xValuesAngulo.push(0);
                            yValuesAngulo.push(0);
                            zValuesAngulo.push(0);
                        }
                    }
    
                    // Agregar el dato actual
                    tiempos.push(tiempoActual);
                    xValuesMovimiento.push(item.movimientoPlataforma.x);
                    yValuesMovimiento.push(item.movimientoPlataforma.y);
                    zValuesMovimiento.push(item.movimientoPlataforma.z);
                    xValuesAngulo.push(item.anguloPlataforma.x);
                    yValuesAngulo.push(item.anguloPlataforma.y);
                    zValuesAngulo.push(item.anguloPlataforma.z);
    
                    tiempoAnterior = tiempoActual;
                });
    
                // Agregar puntos intermedios desde el último dato hasta el momento actual
                let ahora = new Date();
                if (tiempoAnterior && (ahora - tiempoAnterior > umbralTiempo)) {
                    let lastTime = new Date(tiempoAnterior);
                    while (ahora - lastTime > umbralTiempo) {
                        lastTime = new Date(lastTime.getTime() + umbralTiempo);
                        // Solo agregamos si el nuevo tiempo no supera el momento actual
                        if (lastTime <= ahora) {
                            tiempos.push(lastTime);
                            xValuesMovimiento.push(0);
                            yValuesMovimiento.push(0);
                            zValuesMovimiento.push(0);
                            xValuesAngulo.push(0);
                            yValuesAngulo.push(0);
                            zValuesAngulo.push(0);
                        }
                    }
                }
    
                // Actualizar las gráficas con los datos y los puntos de 0 insertados
                Plotly.extendTraces(graficoMovimiento, { x: [tiempos], y: [xValuesMovimiento] }, [0]);
                Plotly.extendTraces(graficoMovimiento, { x: [tiempos], y: [yValuesMovimiento] }, [1]);
                Plotly.extendTraces(graficoMovimiento, { x: [tiempos], y: [zValuesMovimiento] }, [2]);
                Plotly.extendTraces(graficoAngulo, { x: [tiempos], y: [xValuesAngulo] }, [0]);
                Plotly.extendTraces(graficoAngulo, { x: [tiempos], y: [yValuesAngulo] }, [1]);
                Plotly.extendTraces(graficoAngulo, { x: [tiempos], y: [zValuesAngulo] }, [2]);


            // Si el auto-scroll está activo, actualizamos el rango de los ejes x (ventana de 60 segundos)
            if (autoScrollMovimientoPlataforma && tiempos.length > 0) {
                let lastTime = tiempos[tiempos.length - 1];
                let startTime = new Date(lastTime.getTime() - rangoXDefecto);
                Plotly.relayout(graficoMovimiento, { 'xaxis.range': [startTime, lastTime] });
            }
            
            if (autoScrollAngulosPlataforma && tiempos.length > 0) {
                let lastTime = tiempos[tiempos.length - 1];
                let startTime = new Date(lastTime.getTime() - rangoXDefecto);
                Plotly.relayout(graficoAngulo, { 'xaxis.range': [startTime, lastTime] });
            }

            })
            .catch(error => console.error('Error al obtener datos:', error));
    }
    
}

function inicializarGraficoControles() {
    const graficoAnguloAspas = document.getElementById("anguloAspas");
    const graficoTorqueGenerador = document.getElementById("torqueGenerador");
    const graficoOrientacionGondola = document.getElementById("orientacionGondola");

    var traceAspa1 = {
        x: [],
        y: [],
        mode: 'lines',
        line: { shape: 'linear',
                color: 'red' },
        name: 'Bld 1'
    };

    var traceAspa2 = {
        x: [],
        y: [],
        mode: 'lines',
        line: { shape: 'linear',
                color: 'green' },
        name: 'Bld 2'
    };

    var traceAspa3 = {
        x: [],
        y: [],
        mode: 'lines',
        line: { shape: 'linear',
                color: 'blue' },
        name: 'Bld 3'
    };

    var traceTorque = {
        x: [],
        y: [],
        mode: 'lines',
        line: { shape: 'linear',
                color: 'orange' },
        name: 'Torque Generador'
    };

    const dataOrientacion = [
        {
            type: "scatterpolar",
            r: [0, 1],
            theta: [0, 0],
            mode: "lines",
            line: {
                color: "blue",
                width: 3
            }
        }
    ];

    var dataAspas = [traceAspa1, traceAspa2, traceAspa3];
    var dataTorque = [traceTorque];

    var layoutAspas = {
        width: graficoAnguloAspas.clientWidth,
        height: graficoAnguloAspas.clientHeight,
        margin: {
            t: 0,
            l: window.innerWidth * 0.025,
            b: window.innerHeight * 0.02,
            r: 0
        },
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: "white" },
        xaxis: {
            type: 'date',
            tickformat: '%M:%S',
            title: 'Tiempo'
        },
        yaxis: {
            title: 'Ángulo',
            range: [-1, 1], // Ajustar el rango del eje y para centrar el 0
            autorange: true
        },
        annotations: [{
            text: 'Blades angle (deg)',
            xref: 'paper',
            yref: 'paper',
            x: -0.075,
            y: 0.5,
            showarrow: false,
            xanchor: 'right',
            yanchor: 'middle',
            textangle: -90
        }],
        showlegend: false
    };

    var layoutTorque = {
        width: graficoTorqueGenerador.clientWidth,
        height: graficoTorqueGenerador.clientHeight,
        margin: {
            t: 0,
            l: window.innerWidth * 0.035,
            b: window.innerHeight * 0.02,
            r: 0
        },
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: "white" },
        xaxis: {
            type: 'date',
            tickformat: '%M:%S',
            title: 'Tiempo'
        },
        yaxis: {
            title: 'Torque',
            range: [-1, 1], // Ajustar el rango del eje y para centrar el 0
            autorange: true
        },
        annotations: [{
            text: 'Generator torque (KNm)',
            xref: 'paper',
            yref: 'paper',
            x: -0.075,
            y: 0.5,
            showarrow: false,
            xanchor: 'right',
            yanchor: 'middle',
            textangle: -90
        }]
    };

    const layoutOrientacion = {
        margin: {
            t: window.innerWidth * 0.02,
            l: 0,
            b: window.innerHeight * 0.05,
            r: 0
        },
        polar: {
            radialaxis: { 
                visible: false,
                showticklabels: false // Ocultar etiquetas de los ticks
            },
            angularaxis: {
                tickmode: "array",
                tickvals: [0, 90, 180, 270, 360],
                ticktext: ["N", "E", "S", "O", "N"],
                direction: "clockwise",
                rotation: 90,
            }
        },
        showlegend: false,
        width: graficoOrientacionGondola.clientWidth,
        height: graficoOrientacionGondola.clientHeight,
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: "white" },
        annotations: [{
            text: 'Nacelle rotation',
            xref: 'paper',
            yref: 'paper',
            x: 0.5,
            y: -0.1,
            showarrow: false,
            xanchor: 'center',
            yanchor: 'top',
            textangle: 0
        }]
    };

    // Inicializar los gráficos
    Plotly.newPlot(graficoAnguloAspas, dataAspas, layoutAspas);
    Plotly.newPlot(graficoTorqueGenerador, dataTorque, layoutTorque);
    Plotly.newPlot(graficoOrientacionGondola, dataOrientacion, layoutOrientacion);

    // Control del auto-scroll para los gráficos de series temporales en Controles.
    let autoScrollControlesBlade = true;
    let autoScrollControlesGenerator = true;

    // Detectar cuando se activa el modo "Pan" (o se hace cualquier relayout) para desactivar el auto-scroll.
    graficoAnguloAspas.on('plotly_relayout', function(eventData) {
        if (eventData.dragmode === 'pan' || eventData.dragmode === 'zoom')
            autoScrollControlesBlade = false;
    });

    graficoAnguloAspas.on('plotly_doubleclick', function() {
        autoScrollControlesBlade = true;
    });

    graficoTorqueGenerador.on('plotly_relayout', function(eventData) {
        if (eventData.dragmode === 'pan' || eventData.dragmode === 'zoom')
            autoScrollControlesGenerator = false;
    });

    graficoTorqueGenerador.on('plotly_doubleclick', function() {
        autoScrollControlesGenerator = true;
    });

    var time = null;
    intervaloGraficosControles = setInterval(actualizarGraficosControles, velocidadRefresco);

    async function actualizarGraficosControles() {
        try {
            const response = await fetch(`/gemeloDigital/controles/${time}`);
            const data = await response.json();
            time = data.time;

            // Se crean arrays para la iteración con detección de huecos y puntos a 0
            let tiempos = [];
            let yValuesAspa1 = [];
            let yValuesAspa2 = [];
            let yValuesAspa3 = [];
            let yValuesTorque = [];
            let tiempoAnterior = null

            data.infoMolino.forEach(item => {
                let tiempoActual = new Date(item.timestamp);
                // Detectamos huecos mayores al umbral y rellenamos con 0.
                if (tiempoAnterior && (tiempoActual - tiempoAnterior > umbralTiempo)) {
                    let lastTime = new Date(tiempoAnterior);
                    while (tiempoActual - lastTime > umbralTiempo) {
                        lastTime = new Date(lastTime.getTime() + umbralTiempo);
                        tiempos.push(lastTime);
                        yValuesAspa1.push(0);
                        yValuesAspa2.push(0);
                        yValuesAspa3.push(0);
                        yValuesTorque.push(0);
                    }
                }

                tiempos.push(tiempoActual);
                yValuesAspa1.push(item.anguloAspas["1"]);
                yValuesAspa2.push(item.anguloAspas["2"]);
                yValuesAspa3.push(item.anguloAspas["3"]);
                yValuesTorque.push(item.torqueGenerador);

                tiempoAnterior = tiempoActual;
            });

            // Completar desde el último dato hasta el instante actual
            let ahora = new Date();
            if (tiempoAnterior && (ahora - tiempoAnterior > umbralTiempo)) {
                let lastTime = new Date(tiempoAnterior);
                while (ahora - lastTime > umbralTiempo) {
                    lastTime = new Date(lastTime.getTime() + umbralTiempo);
                    if (lastTime <= ahora) {
                        tiempos.push(lastTime);
                        yValuesAspa1.push(0);
                        yValuesAspa2.push(0);
                        yValuesAspa3.push(0);
                        yValuesTorque.push(0);
                    }
                }
            }

            // Actualizar las trazas de aspas y torque
            Plotly.extendTraces(graficoAnguloAspas, { x: [tiempos], y: [yValuesAspa1] }, [0]);
            Plotly.extendTraces(graficoAnguloAspas, { x: [tiempos], y: [yValuesAspa2] }, [1]);
            Plotly.extendTraces(graficoAnguloAspas, { x: [tiempos], y: [yValuesAspa3] }, [2]);
            Plotly.extendTraces(graficoTorqueGenerador, { x: [tiempos], y: [yValuesTorque] }, [0]);

            // Actualizar el gráfico polar con la última orientación
            let rValues = data.infoMolino.map(item => item.orientacionGondola);
            let ultimaOrientacion = rValues[rValues.length - 1] < 0
                ? 360 + rValues[rValues.length - 1]
                : rValues[rValues.length - 1];

            Plotly.update(graficoOrientacionGondola, 
                {
                    r: [[0, 1]],
                    theta: [[0, ultimaOrientacion]]
                }, 
                {},
                [0]
            );

            // Si el auto-scroll está activo, actualizamos el rango de los ejes x (ventana de 60 segundos)
            if (autoScrollControlesBlade && tiempos.length > 0) {
                let lastTime = tiempos[tiempos.length - 1];
                let startTime = new Date(lastTime.getTime() - rangoXDefecto);
                Plotly.relayout(graficoAnguloAspas, { 'xaxis.range': [startTime, lastTime] });
            }
            
            if (autoScrollControlesGenerator && tiempos.length > 0) {
                let lastTime = tiempos[tiempos.length - 1];
                let startTime = new Date(lastTime.getTime() - rangoXDefecto);
                Plotly.relayout(graficoTorqueGenerador, { 'xaxis.range': [startTime, lastTime] });
            }
        } catch (error) {
            console.error('Error al obtener datos:', error);
        }
    }
}

function inicializarGraficosSalidas() {
    const graficoVelocidadAngularRotor = document.getElementById("velocidadAngularRotor");
    const graficoPotenciaGenerador = document.getElementById("potenciaGenerador");
    const graficoVelocidadAngularGenerador = document.getElementById("velocidadAngularGenerador");
    const graficoTTD = document.getElementById("TTD");

    var dataVelocidadAngularRotor = [
        {
            x: [],
            y: [],
            type: 'scatter',
            mode: 'lines',
            name: 'Velocidad Angular Rotor',
            line: { shape: 'linear',
                    color: 'blue' }
        }
    ];

    var dataPotenciaGenerador = [
        {
            x: [],
            y: [],
            type: 'scatter',
            mode: 'lines',
            name: 'Potencia Generador',
            line: { shape: 'linear',
                    color: 'purple' }
        }
    ];

    var dataVelocidadAngularGenerador = [
        {
            x: [],
            y: [],
            type: 'scatter',
            mode: 'lines',
            name: 'Velocidad Angular Generador',
            line: { shape: 'linear',
                    color: 'blue' }
        }
    ];

    var dataTTD = [
        {
            x: [],
            y: [],
            type: 'scatter',
            mode: 'lines',
            name: 'S-S',
            line: { shape: 'linear',
                    color: 'blue' }
        },
        {
            x: [],
            y: [],
            type: 'scatter',
            mode: 'lines',
            name: 'F-A',
            line: { shape: 'linear',
                    color: 'red' }
        }
    ];

    var layoutVelocidadAngularRotor = {
        width: graficoVelocidadAngularRotor.clientWidth,
        height: graficoVelocidadAngularRotor.clientHeight,
        margin: {
            t: 0,
            l: window.innerWidth * 0.03,
            b: window.innerHeight * 0.03,
            r: 0
        },
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: "white" },
        xaxis: {
            type: 'date',
            tickformat: '%M:%S',
            title: 'Tiempo'
        },
        yaxis: {
            title: 'Movimiento',
            range: [-1, 1], // Ajustar el rango del eje y para centrar el 0
            autorange: true
        },
        annotations: [{
            text: 'Rotor ang speed (rpm)',
            xref: 'paper',
            yref: 'paper',
            x: -0.075,
            y: 0.4,
            showarrow: false,
            xanchor: 'right',
            yanchor: 'middle',
            textangle: -90
        }]
    };

    var layoutPotenciaGenerador = {
        width: graficoPotenciaGenerador.clientWidth,
        height: graficoPotenciaGenerador.clientHeight,
        margin: {
            t: 0,
            l: window.innerWidth * 0.04,
            b: window.innerHeight * 0.03,
            r: window.innerWidth * 0.01,
        },
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: "white" },
        xaxis: {
            type: 'date',
            tickformat: '%M:%S',
            title: 'Tiempo'
        },
        yaxis: {
            title: 'Movimiento',
            range: [-1, 1], // Ajustar el rango del eje y para centrar el 0
            autorange: true
        },
        annotations: [{
            text: 'Gen power (W)',
            xref: 'paper',
            yref: 'paper',
            x: -0.07,
            y: 0.5,
            showarrow: false,
            xanchor: 'right',
            yanchor: 'middle',
            textangle: -90
        }]
    };

    var layoutVelocidadAngularGenerador = {
        width: graficoVelocidadAngularGenerador.clientWidth,
        height: graficoVelocidadAngularGenerador.clientHeight,
        margin: {
            t: 0,
            l: window.innerWidth * 0.03,
            b: window.innerHeight * 0.03,
            r: 0
        },
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: "white" },
        xaxis: {
            type: 'date',
            tickformat: '%M:%S',
            title: 'Tiempo'
        },
        yaxis: {
            title: 'Movimiento',
            range: [-1, 1], // Ajustar el rango del eje y para centrar el 0
            autorange: true
        },
        annotations: [{
            text: 'Gen ang speed (rpm)',
            xref: 'paper',
            yref: 'paper',
            x: -0.075,
            y: 0.35,
            showarrow: false,
            xanchor: 'right',
            yanchor: 'middle',
            textangle: -90
        }]
    };

    var layoutTTD = {
        width: graficoTTD.clientWidth,
        height: graficoTTD.clientHeight,
        margin: {
            t: 0,
            l: window.innerWidth * 0.04,
            b: window.innerHeight * 0.03,
            r: 0
        },
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: "white" },
        xaxis: {
            type: 'date',
            tickformat: '%M:%S',
            title: 'Tiempo'
        },
        yaxis: {
            title: 'Movimiento',
            range: [-1, 1], // Ajustar el rango del eje y para centrar el 0
            autorange: true
        },
        annotations: [{
            text: 'TTD (m)',
            xref: 'paper',
            yref: 'paper',
            x: -0.06,
            y: 0.5,
            showarrow: false,
            xanchor: 'right',
            yanchor: 'middle',
            textangle: -90
        }]
    };

    Plotly.newPlot(graficoVelocidadAngularRotor, dataVelocidadAngularRotor, layoutVelocidadAngularRotor);
    Plotly.newPlot(graficoPotenciaGenerador, dataPotenciaGenerador, layoutPotenciaGenerador);
    Plotly.newPlot(graficoVelocidadAngularGenerador, dataVelocidadAngularGenerador, layoutVelocidadAngularGenerador);
    Plotly.newPlot(graficoTTD, dataTTD, layoutTTD);

    
    // Control del auto-scroll para los gráficos de series temporales en Controles.
    let autoScrollVelocidadAngularRotor = true;
    let autoScrollPotenciaGenerador = true;
    let autoScrollVelocidadAngularGenerador = true;
    let autoScrollTTD = true;

    // Detectar cuando se activa el modo "Pan" (o se hace cualquier relayout) para desactivar el auto-scroll.
    graficoVelocidadAngularRotor.on('plotly_relayout', function(eventData) {
        if (eventData.dragmode === 'pan' || eventData.dragmode === 'zoom')
            autoScrollVelocidadAngularRotor = false;
    });
    
    graficoVelocidadAngularRotor.on('plotly_doubleclick', function() {
        autoScrollVelocidadAngularRotor = true;
    });
    
    graficoPotenciaGenerador.on('plotly_relayout', function(eventData) {
        if (eventData.dragmode === 'pan' || eventData.dragmode === 'zoom')
            autoScrollPotenciaGenerador = false;
    });
    
    graficoPotenciaGenerador.on('plotly_doubleclick', function() {
        autoScrollPotenciaGenerador = true;
    });
    
    graficoVelocidadAngularGenerador.on('plotly_relayout', function(eventData) {
        if (eventData.dragmode === 'pan' || eventData.dragmode === 'zoom')
            autoScrollVelocidadAngularGenerador = false;
    });
    
    graficoVelocidadAngularGenerador.on('plotly_doubleclick', function() {
        autoScrollVelocidadAngularGenerador = true;
    });
    
    graficoTTD.on('plotly_relayout', function(eventData) {
        if (eventData.dragmode === 'pan' || eventData.dragmode === 'zoom')
            autoScrollTTD = false;
    });
    
    graficoTTD.on('plotly_doubleclick', function() {
        autoScrollTTD = true;
    });

    var time = null;
    
    intervaloGraficosSalidas = setInterval(actualizarGraficosSalidas, velocidadRefresco);
    async function actualizarGraficosSalidas() {
        await fetch(`/gemeloDigital/salidas/${time}`)
            .then(response => response.json())
            .then(data => {
                time = data.time;

                let tiempos = [];
        let valoresVelocidadAngularRotor = [];
        let valoresPotenciaGenerador = [];
        let valoresVelocidadAngularGenerador = [];
        let valoresTTD_ForeAft = [];
        let valoresTTD_SideToSide = [];

        let tiempoAnterior = null;

        // Iteramos por cada dato recibido
        data.infoMolino.forEach(item => {
            let tiempoActual = new Date(item.timestamp);

            // Si hay un salto mayor al umbral, agregamos puntos intermedios con valores 0
            if (tiempoAnterior && (tiempoActual - tiempoAnterior > umbralTiempo)) {
                let lastTime = new Date(tiempoAnterior);
                while (tiempoActual - lastTime > umbralTiempo) {
                    lastTime = new Date(lastTime.getTime() + umbralTiempo);
                    tiempos.push(lastTime);
                    valoresVelocidadAngularRotor.push(0);
                    valoresPotenciaGenerador.push(0);
                    valoresVelocidadAngularGenerador.push(0);
                    valoresTTD_ForeAft.push(0);
                    valoresTTD_SideToSide.push(0);
                }
            }

            // Agregar el dato actual
            tiempos.push(tiempoActual);
            valoresVelocidadAngularRotor.push(item.velocidadAngularRotor);
            valoresPotenciaGenerador.push(item.potenciaGenerador);
            valoresVelocidadAngularGenerador.push(item.velocidadAngularGenerador);
            valoresTTD_ForeAft.push(item.TTD.ForeAft);
            valoresTTD_SideToSide.push(item.TTD.SideToSide);

            tiempoAnterior = tiempoActual;
        });

        // Agregar puntos intermedios hasta el momento actual si hay un salto
        let ahora = new Date();
        if (tiempoAnterior && (ahora - tiempoAnterior > umbralTiempo)) {
            let lastTime = new Date(tiempoAnterior);
            while (ahora - lastTime > umbralTiempo) {
                lastTime = new Date(lastTime.getTime() + umbralTiempo);
                if (lastTime <= ahora) {
                    tiempos.push(lastTime);
                    valoresVelocidadAngularRotor.push(0);
                    valoresPotenciaGenerador.push(0);
                    valoresVelocidadAngularGenerador.push(0);
                    valoresTTD_ForeAft.push(0);
                    valoresTTD_SideToSide.push(0);
                }
            }
        }

        // Actualizar las gráficas con los datos y los puntos de 0 insertados
        Plotly.extendTraces(graficoVelocidadAngularRotor, { x: [tiempos], y: [valoresVelocidadAngularRotor] }, [0]);
        Plotly.extendTraces(graficoPotenciaGenerador, { x: [tiempos], y: [valoresPotenciaGenerador] }, [0]);
        Plotly.extendTraces(graficoVelocidadAngularGenerador, { x: [tiempos], y: [valoresVelocidadAngularGenerador] }, [0]);
        Plotly.extendTraces(graficoTTD, { x: [tiempos, tiempos], y: [valoresTTD_ForeAft, valoresTTD_SideToSide] }, [0, 1]);
   

        if (autoScrollVelocidadAngularRotor && tiempos.length > 0) {
            let lastTime = tiempos[tiempos.length - 1];
            let startTime = new Date(lastTime.getTime() - rangoXDefecto);
            Plotly.relayout(graficoVelocidadAngularRotor, { 'xaxis.range': [startTime, lastTime] });
        }
        
        if (autoScrollPotenciaGenerador && tiempos.length > 0) {
            let lastTime = tiempos[tiempos.length - 1];
            let startTime = new Date(lastTime.getTime() - rangoXDefecto);
            Plotly.relayout(graficoPotenciaGenerador, { 'xaxis.range': [startTime, lastTime] });
        }
        
        if (autoScrollVelocidadAngularGenerador && tiempos.length > 0) {
            let lastTime = tiempos[tiempos.length - 1];
            let startTime = new Date(lastTime.getTime() - rangoXDefecto);
            Plotly.relayout(graficoVelocidadAngularGenerador, { 'xaxis.range': [startTime, lastTime] });
        }
        
        if (autoScrollTTD && tiempos.length > 0) {
            let lastTime = tiempos[tiempos.length - 1];
            let startTime = new Date(lastTime.getTime() - rangoXDefecto);
            Plotly.relayout(graficoTTD, { 'xaxis.range': [startTime, lastTime] });
        }
        })
        .catch(error => console.error('Error al obtener datos:', error));
    }
}

//Gestion de alarmas
function cargarAlertasActivas() {
    $.ajax({
        url: "/gemeloDigital/alertasActivas",
        type: "GET",
        success: function(data) {
            const alertasContainer = $("#alertasContainer");
            alertasContainer.empty(); // Limpiar el contenedor antes de agregar nuevas alertas

            if (data.length === 0) {
                alertasContainer.append(`<p class="text-center">No hay alertas activas.</p>`);
            } else {
                data.forEach((alerta, index) => {
                    const alertaHtml = `
                        <div class="popup alertPopup">
                            <div class="popupIcon alertIcon">
                                <svg class="alert-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true">
                                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                                </svg>
                            </div>
                            <div class="alertMessage py-1">
                                <span class="fs-6">${new Date(alerta.alertas.timestamp).toLocaleString()}
                                ${alerta.alertas.tipo}
                                <br>
                                ${alerta.alertas.descripcion}</span>
                            </div>
                             <div class="popupIcon closeIcon " onclick="eliminarAlerta('${alerta._id}', '${alerta.alertas.tipo}')">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" class="closeSvg">
                                    <path d="m15.8333 5.34166-1.175-1.175-4.6583 4.65834-4.65833-4.65834-1.175 1.175 4.65833 4.65834-4.65833 4.6583 1.175 1.175 4.65833-4.6583 4.6583 4.6583 1.175-1.175-4.6583-4.6583z" class="closePath"></path>
                                </svg>
                            </div>
                        </div>
                    `;
                    alertasContainer.append(alertaHtml);
                });
                
            }
        },
        error: function(xhr) {
            showToastr('error', 'Error getting active alerts', xhr.responseJSON.error);
        }
    });
}

function eliminarAlerta(idAlerta, tipo) {

    $.ajax({
        url: `/gemeloDigital/eliminarAlerta`,
        type: "DELETE",
        data: { idAlerta: idAlerta, tipo: tipo },
        success: function() {
            showToastr('success', 'Alert successfully removed', '');
            cargarAlertasActivas(); // Refrescar alertas activas después de eliminar
        },
        error: function(xhr) {
            showToastr('error', 'Error when deleting the alert', xhr.responseJSON.error);
        }
    });
}

function eliminarAlertas() {
    Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete all!'
    }).then((result) => {
        if (result.isConfirmed) {
            $.ajax({
                url: `/gemeloDigital/eliminarAlertas`,
                type: "DELETE",
                success: function(response) {
                    Swal.fire(
                        'Deleted!',
                        'All alerts have been deleted.',
                        'success'
                    ).then(() => {
                        cargarAlertasActivas(); // Refrescar alertas activas después de eliminar
                    });
                },
                error: function(xhr) {
                    let errorMessage = xhr.responseJSON?.error || "Something went wrong.";
                    Swal.fire(
                        'Error!',
                        errorMessage,
                        'error'
                    );
                }
            });
        }
    });
}

//Posiciones de la camara
function inicio()
{
    const root = document.getElementById('root');
    const molino = document.documentElement;
    root.scrollTo({ left: 0, behavior: "smooth" });
    molino.scrollTo({ left: 0, behavior: "smooth" });
}

function centro()
{
    const root = document.getElementById('root');
    const molino = document.documentElement;
    root.scrollTo({ left: root.scrollWidth / 6, behavior: "smooth" });
    molino.scrollTo({ left: molino.scrollWidth / 6, behavior: "smooth" });
}

function final()
{
    const root = document.getElementById('root');
    const molino = document.documentElement;
    root.scrollTo({ left: root.scrollWidth, behavior: "smooth" });
    molino.scrollTo({ left: molino.scrollWidth, behavior: "smooth" });
}

//Grafico Granja
function inicializarGraficoInformacionGeneral() {
    const graficoPotenciaGenerada = document.getElementById("potenciaGenerada");
    const graficoSectorial = document.getElementById("graficoSectorial");

    //Datos iniciales**
    var dataPotenciaGenerada = [{
        x: [], //Tiempo transcurrido (timestamps)
        y: [], //Potencia generada total en KW
        type: 'scatter',
        mode: 'lines',
        name: 'Potencia Generada (KW)',
        line: { color: 'blue' }
    }];

    var dataGraficoSectorial = [{
        type: "pie",
        values: [0, 0, 0, 1],
        labels: ["Max Performance", "Above Half", "Below Half", "Stopped"],
        textinfo: "label+percent",
        textposition: "inside",
        automargin: true,
        marker: {
            colors: ["blue", "green", "orange", "red"]
        }
    }];

    var layoutGraficoPotenciaGenerada = {
        width: graficoPotenciaGenerada.clientWidth, 
        height: graficoPotenciaGenerada.clientHeight,
        margin: {
            t: window.innerHeight * 0.05,
            l: window.innerWidth * 0.02,
            b: window.innerHeight * 0.03,
            r: 0,
        },
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: "white" },
        xaxis: {
            title: 'Tiempo',
            type: 'date', //Representar el tiempo correctamente en el eje X
            tickformat: '%M:%S',
            autorange: true
        },
        yaxis: {
            title: 'Potencia Generada (KW)', //Ahora representa la potencia total generada
            range: [0, 100], // ⚠️ Se ajustará dinámicamente después
            autorange: false
        },
        title: {
            text: 'Power generated (KW)',
            font: {
                size: 16,
                color: 'white'
            },
            x: 0.5,
            xanchor: 'center'
        }
    };

    var layoutGraficoSectorial = {
        width: graficoSectorial.clientWidth * 0.85, // Reduce the width by 10%
        height: graficoSectorial.clientHeight * 0.85, // Reduce the height by 10%
        margin: {
            t: window.innerHeight * 0.05,
            l: window.innerWidth * 0.02,
            b: 0,
            r: 0,
        },
        paper_bgcolor: "transparent",
        plot_bgcolor: "transparent",
        font: { color: "white" },
        legend: {
            x: 1,
            y: -0.1
        },
        title: {
            text: 'Wind Turbine States',
            font: {
                size: 16,
                color: 'white'
            },
            x: 0.5,
            y: 1.05,
            xanchor: 'center'
        }
    };

    Plotly.newPlot(graficoPotenciaGenerada, dataPotenciaGenerada, layoutGraficoPotenciaGenerada);
    Plotly.newPlot(graficoSectorial, dataGraficoSectorial, layoutGraficoSectorial);

    var time = null;
    intervaloGraficosInformacionGeneral = setInterval(actualizarGraficosInformacionGeneral, velocidadRefresco);

    async function actualizarGraficosInformacionGeneral() {
        try {
            await fetch(`/granjas/informacionGeneral/${time}`)
                .then(response => response.json())
                .then(data => {
                    time = data.time;

                    //Obtener la potencia nominal total de la granja**
                    let potenciaNominalTotal = data.infoGranja.molinos.reduce((acc, molino) => acc + (molino.potenciaNominal * 1000), 0);
                    potenciaNominalTotal *= 1.1;

                    //Calcular la potencia generada total en el instante**
                    let potenciaGeneradaTotal = data.ultimasPotenciasClima.reduce((acc, n) => acc + n.potenciaGenerador, 0);
                    
                    //Asegurar que la potencia generada no sea negativa**
                    potenciaGeneradaTotal = Math.max(0, potenciaGeneradaTotal.toFixed(2));
                    
                    //Obtener el timestamp de los datos**
                    const timestamp = new Date(data.infoMolino[0]?.timestamp).getTime();
                    const tiempo = Math.floor(timestamp / velocidadRefresco) * velocidadRefresco;

                    //Actualizar la escala del eje Y dinámicamente**
                    layoutGraficoPotenciaGenerada.yaxis.range = [0, potenciaNominalTotal];

                    //Actualizar el gráfico de potencia generada**
                    Plotly.extendTraces(graficoPotenciaGenerada, {
                        x: [[new Date(tiempo)]], // ⏳ Tiempo transcurrido en el eje X
                        y: [[potenciaGeneradaTotal]] // ⚡ Potencia generada total en el eje Y
                    }, [0]);

                    //Actualizar Gráfica de Estados de Molinos**
                    let estados = { "Max Performance": 0, "Above Half": 0, "Below Half": 0, "Stopped": 0 };

                    let ultimoEstadoMolinos = new Map();

                    data.infoMolino.forEach(molino => {
                        ultimoEstadoMolinos.set(molino.idMolino, molino);
                    });

                    ultimoEstadoMolinos.forEach(molino => {
                        let molinoEncontrado = data.infoGranja.molinos.find(m => m.idMolino === molino.idMolino);
                    
                        if (!molinoEncontrado) {
                            estados["Stopped"]++;
                            return;
                        }
                    
                        let potenciaNominal = molinoEncontrado.potenciaNominal * 1000;
                    
                        if (molino.potenciaGenerador === 0) {
                            estados["Stopped"]++;
                        } else if (molino.potenciaGenerador >= potenciaNominal) {
                            estados["Max Performance"]++;
                        } else if (molino.potenciaGenerador >= potenciaNominal / 2) {
                            estados["Above Half"]++;
                        } else {
                            estados["Below Half"]++;
                        }
                    });
                    
                    // Ajustar el número de molinos en estado "Stopped" sin afectar el resto del flujo
                    estados["Stopped"] += Math.max(0, data.infoGranja.molinos.length - ultimoEstadoMolinos.size);
                    

                    dataGraficoSectorial = [{
                        type: "pie",
                        values: Object.values(estados),
                        labels: ["Max Performance", "Above Half", "Below Half", "Stopped"],
                        textinfo: "label+percent",
                        textposition: "inside",
                        automargin: true,
                        marker: {
                            colors: ["blue", "green", "orange", "red"]
                        }
                    }];

                    Plotly.react(graficoSectorial, dataGraficoSectorial, layoutGraficoSectorial);
                }
            );
        } catch (error) {
            console.error("Error al obtener los datos:", error);
        }
    }
}

// Funciones Comunes
function disableButton(button) {
    button.disabled = true;
    setTimeout(() => {
        button.disabled = false;
    }, 500);
}