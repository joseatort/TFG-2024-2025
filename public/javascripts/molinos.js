"use strict";

$(document).ready(() => {
  var modoEdicion = false;

  $("body").on("click", "#cancelarEdicion", () => {
    modoEdicion = false;
    $("#modoEdicion").removeClass("show");
  });

  $("body").on("click", ".btn-add-molino", () => {
    modoEdicion = true;
    $("#modoEdicion").addClass("show");
  });

  $("body").on("click", "#mapa", (event) => {
    event.preventDefault();

    if (!modoEdicion) return;

    if (!$("#potenciaNominal").val()) {
      showToastr(
        "error",
        "Wind Turbine",
        "You must introduce the rated power of the wind turbine"
      );
      return;
    }

    const pickList = wwd.pick(
      wwd.canvasCoordinates(event.clientX, event.clientY)
    );

    const terreno = pickList.objects.find((obj) => obj.isTerrain);

    let formData = $("#formCreateAerogenerador").serializeArray();
    if (terreno) {
      const position = terreno.position;
      formData.push({ name: "lat", value: position.latitude });
      formData.push({ name: "long", value: position.longitude });
    } else return;

    $.ajax({
      url: "/molinos/addMolino",
      type: "POST",
      data: formData,
      success: function (data) {
        showToastr(
          "success",
          "Wind Turbine",
          "Wind Turbine added succesfully!"
        );

        const numMolinosExistentes = $(
          ".panel-body .card:not([data-bs-toggle='modal'])"
        ).length;
        const idVirtual = numMolinosExistentes + 1; // Genera el ID virtual secuencialmente

        // Crear la nueva card del molino dinámicamente con ID virtual
        const nuevaCard = `
                    <div class="card" id="molino-${idVirtual}">
                        <div class="mt-2">
                            <span class="nombre">Wind Turbine: ${idVirtual}</span><br>
                            <span class="coordenadas">Latitude: ${parseFloat(data.pos.lat).toFixed(4)} Longitude: ${parseFloat(data.pos.long).toFixed(4)}</span><br>
                        </div>
                        <form class="formEliminarMolino my-2">
                            <input type="hidden" name="idMolino" value="${data.idMolino}">
                            <input type="hidden" name="nombreGranja" value="<%= ${data.idMolino} %>">
                            <button type="submit" class="btn-delete btn btn-danger">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
                                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"></path>
                                    <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"></path>
                                  </svg>
                            </button>
                        </form>
                    </div>`;
        actualizarMolinosPanel();

        // Añadir la nueva card **antes de la tarjeta de "Añadir"**
        $(".card[data-bs-toggle='modal']").before(nuevaCard);
      },
      error: function (xhr) {
        const errorMessage =
          xhr.responseJSON?.error || "Ha ocurrido un error inesperado.";
        showToastr("error", "Wind Turbine", errorMessage);
      },
    });
  });

  $("body").on("submit", ".formEliminarMolino", function (event) {
    event.preventDefault();

    const formData = $(this).serialize(); // Tomar el formulario específico
    const cardMolino = $(this).closest(".card"); // Obtener la tarjeta del molino a eliminar

    // Usar SweetAlert para un panel de confirmación bonito
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then((result) => {
      if (result.isConfirmed) {
        $.ajax({
          url: `/molinos/eliminarMolino`,
          type: "DELETE",
          data: formData,
          success: function (response) {
            Swal.fire("Deleted!", "Wind Turbine has been deleted.", "success");

            cardMolino.fadeOut(300, function () {
              $(this).remove();

              actualizarMolinosPanel();
            });
          },
          error: function (xhr) {
            let errorMessage =
              xhr.responseJSON?.error || "Something went wrong.";
            Swal.fire("Error!", errorMessage, "error");
          },
        });
      }
    });
  });
});

function actualizarMolinosPanel() {
  const nombreGranja = $("#molinosPanel").data("granja"); // Obtener el nombre de la granja asociada al panel

  $.ajax({
    type: "GET",
    url: `/molinos/${nombreGranja}`, // Solicitar solo los datos de los molinos
    success: function (response) {
      // Extraer únicamente el contenido de la lista de molinos
      const parse = new DOMParser();
      const doc = parse.parseFromString(response, "text/html");
      const nuevaLista = doc.querySelector(".panel-body"); // Solo el cuerpo del panel

      // Reemplazar la lista de molinos sin alterar el resto del panel
      $("#molinosPanel .panel-body").replaceWith(nuevaLista);
    },
    error: function () {
      showToastr(
        "error",
        "Wind Turbine",
        "An error has occurred while updating the panel."
      );
    },
  });
}

//Función para cargar el panel de molinos con datos de una granja
function cargarMolinos(nombreGranja) {
  $.get(`/molinos/${nombreGranja}`, function (response) {
    $("#molinos").remove(); // Eliminar cualquier panel existente
    $("body").append(response); // Insertar el nuevo panel
    $("#molinosPanel").addClass("open"); // Mostrar el panel
  });

  $("#botonInformacionGeneral").prop("disabled", false);
  $("#botonListaTurbinas").prop("disabled", false);
}

//Función para alternar el estado del panel(Visible o Invisible)
function togglePanelMolinos() {
  const panel = $("#molinosPanel");
  const openButton = $("#openPanelBtn");

  if (panel.hasClass("closed")) {
    panel.removeClass("closed");
    openButton.hide();
  } else {
    panel.addClass("closed");
    openButton.show();
  }
}
