"use strict";

$(document).ready(function () {
  exigirRegistro();

  $("#logIn").on("submit", function (event) {
    event.preventDefault();

    var formData = $(this).serialize();

    // Deshabilitar el botón de envío para evitar múltiples solicitudes
    $(".submitBtn").prop("disabled", true);

    $.ajax({
      type: "POST",
      url: "/usuarios",
      data: formData,
      success: function () {
        window.location.href = "/";
      },
      error: function ({ responseJSON }) {
        showToastr("error", "Log In", responseJSON.error);
      },
      complete: function () {
        $(".submitBtn").prop("disabled", false);
      },
    });
  });

  $("body").on("click", "#logoutBtn", function () {
    $.ajax({
      type: "DELETE",
      url: "/usuarios/logout",
      success: function () {
        window.location.href = "/";
      },
      error: function ({ responseJSON }) {
        showToastr("error", "Log Out", responseJSON.error);
      },
    });
  });
});

//Funcion para exigir el registro al usuario, si pasados 10 segundos no se registra obliga el registro
async function exigirRegistro() {
  if ($(".botonesPrincipales")[0].innerText == "LOG IN") {
    await new Promise((resolve) => setTimeout(resolve, 10000));

    if (document.getElementById("staticBackdrop").style.display != "block")
      document.getElementById("inicioButton").click();
  }
}
