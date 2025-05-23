"use strict";

$(document).ready(() => {
  let flashMessage = $("#toastr").val();
  if (flashMessage != "null" && flashMessage) {
    // Asegúrate de que no sea null o vacío
    flashMessage = JSON.parse(flashMessage); // Convierte el JSON en un objeto
    showToastr(flashMessage.type, flashMessage.title, flashMessage.message);
  }
});

function showToastr(type, title, message) {
  console.log("toastr:", toastr); // Comprobamos si toastr está definido
  if (!toastr) {
    console.error("Toastr is not available");
    return;
  }

  let body;
  toastr.options = {
    closeButton: false,
    progressBar: true,
    positionClass: "toast-bottom-right",
    hideDuration: 1000,
    timeOut: 1500, // 1.5 segundos
    showMethod: "fadeIn",
    hideMethod: "fadeOut",
  };

  switch (type) {
    case "info":
      body = "<span> <i class='fa fa-spinner fa-pulse'></i></span>";
      break;
    default:
      body = "";
  }

  const content = message + body;
  toastr[type](content, title);
}
