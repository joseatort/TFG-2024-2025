define(function () {
    "use strict";

    var LayerManager = function (worldWindow) {

        var capa_Landsat = worldWindow.layers.find(n => n.displayName == "Blue Marble & Landsat")
        var capa_Bing = worldWindow.layers.find(n => n.displayName == "Bing Aerial with Labels")
        var capa_atmosfera = worldWindow.layers.find(n => n.displayName == "Atmosphere")
        var capa_info = worldWindow.layers.find(n => n.displayName == "InfoMolinos")
        var areasLayer = worldWindow.layers.find(n => n.displayName == "Areas granjas")

        capa_Landsat.enabled = false;
        capa_Bing.enabled = false;
        capa_info.enabled = false;
        areasLayer.enabled = false;
        
        window.addEventListener("wheel", ajuste_capas);
        window.addEventListener("updatelocation", ajuste_capas);

        $().ready(() => {
            $("body").on("click", ".btn-add-molino", function () {
                areasLayer.enabled = true;
            });

            $("body").on("click", "#cancelarEdicion", () => {
                areasLayer.enabled = false;
            });

            ajuste_capas();
        });

        function ajuste_capas()
        {

            var altitud = worldWindow.navigator.range;   

            var nivel_mar = worldWindow.globe.elevationAtLocation(worldWindow.navigator.lookAtLocation.latitude,  worldWindow.navigator.lookAtLocation.longitude);

            if (altitud < nivel_mar)
            {
                worldWindow.navigator.range = nivel_mar;
                return;
            }


            if(altitud >= 20000)
                capa_info.enabled = false;
            else
                capa_info.enabled = true;


            if(altitud >= 5000000)
                capa_atmosfera.enabled = true;
            else
                capa_atmosfera.enabled = false;

            
            if(altitud >= 1000000)
            {                
                capa_Landsat.enabled = false;
                capa_Bing.enabled = false;

            }
            else if (altitud < 1000000 && altitud >= 100000) 
            {
                capa_Landsat.enabled = true;
                capa_Bing.enabled = false;

            }
            else
            {
                capa_Landsat.enabled = true;
                capa_Bing.enabled = true;
            }

            worldWindow.drawFrame();
        }
    };

    return LayerManager;
});
