"use strict";

$(document).ready(() => {
    var modoEdicionGranja = false;

    $("body").on("click", "#cancelarEdicionGranja", () => {
        modoEdicionGranja = false;
        $('#modoEdicionGranja').removeClass('show');
    });

    $("body").on("click", ".btn-add-granja", () => {
        $('#listaUbicaciones').modal('hide');
        modoEdicionGranja = true;
        $('#modoEdicionGranja').addClass('show').fadeIn(200);
        document.getElementById("createGranjaForm").reset();
    });

    setInterval(() => {
        $.ajax({
            type: "PATCH",
            url: "/granjas/actualizarWeather",
            success: function() {
                $.ajax({
                    type: "GET",
                    url: "/",
                    success: function(data) {
                        const parse = new DOMParser();
                        const doc = parse.parseFromString(data, "text/html");
                    
                        // Obtener los nuevos valores de velocidad del viento y temperatura
                        $(doc).find(".carousel-item").each(function(index) {
                            const nuevoContenido = $(this).find(".clima").html();
                            
                            // Actualizar solo esos valores en el carrusel actual
                            $("#carouselUbicaciones .carousel-item").eq(index).find(".clima").html(nuevoContenido);
                        });
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
    }, 30000);

    $("body").on("submit", "#createGranjaForm", (event) => {
        event.preventDefault();
    });

    $("body").on("click", "#mapa", (event) => {
        event.preventDefault();
        
        if (!modoEdicionGranja) return;

        if (!$("#granjaName").val()) {
            showToastr('error', 'Wind Farm', 'You must enter the name of the farm');
            return;
        }

        const pickList = wwd.pick(wwd.canvasCoordinates(event.clientX, event.clientY));
        const terreno = pickList.objects.find(obj => obj.isTerrain);

        let formData = $("#createGranjaForm").serializeArray();
        if (terreno) {
            const position = terreno.position;
            formData.push({ name: "lat", value: position.latitude });
            formData.push({ name: "long", value: position.longitude });
        } else return;

        $.ajax({
            type: "POST",
            url: "/granjas/createGranja",
            data: formData,
            success: function(data) {
                showToastr('success', 'Wind Farm', 'Wind Farm added succesfully!');
                
                $("#modoEdicionGranja").removeClass("show").fadeOut(200); // Ocultar después de añadir
                modoEdicionGranja = false;

                document.getElementById("createGranjaForm").reset();

                $.ajax({
                    type: "GET",
                    url: "/",
                    success: function(data) {
                        const parse = new DOMParser();
                        const doc = parse.parseFromString(data, "text/html");
                        const contenidoCarousel = doc.querySelector("#carouselUbicaciones");
                        $("#carouselUbicaciones").replaceWith(contenidoCarousel);

                        const contenidolistaUbicaciones = doc.querySelector("#listaUbicaciones");
                        $("#listaUbicaciones").replaceWith(contenidolistaUbicaciones);
                    },
                    error: function() {
                        showToastr('error', 'Wind Farm', 'An error had ocurred');
                    }
                });
            },
            error: function({responseJSON}) {
                showToastr('error', 'Wind Farm', responseJSON.error);
            }
        });
    });

    $("body").on("submit", ".formEliminarGranja", function(event) {
        event.preventDefault();
        
        const formData = $(this).serialize(); // Tomar el formulario específico
    
        Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                $.ajax({
                    url: `/granjas/eliminarGranja`,
                    type: "DELETE",
                    data: formData,
                    success: function() {
                        Swal.fire(
                            'Deleted!',
                            'Wind Farm has been deleted.',
                            'success'
                        ).then(() =>{
                            window.location.reload()
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
    });

    //Funcion de minimizar
    $("body").on("click", "#botonUbicaciones", () => {
        let minimizarElements = document.getElementsByClassName("minimizar");
        if (minimizarElements[0].style.display != "none") {
          // Iterar sobre los elementos y ocultarlos
          for (let i = 0; i < minimizarElements.length; i++)
            minimizarElements[i].style.display = "none";
    
          $("#carouselUbicaciones").addClass("minimizado");
        } else {
          for (let i = 0; i < minimizarElements.length; i++)
            minimizarElements[i].style.display = "flex";
    
          $("#carouselUbicaciones").removeClass("minimizado");
        }
      });
});


