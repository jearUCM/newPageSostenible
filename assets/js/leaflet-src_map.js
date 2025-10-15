document.addEventListener("DOMContentLoaded", async function () {
  var map = L.map("map", {
    zoomControl: false,
    maxZoom: 20,
    minZoom: 14,
  }).setView([4.536, -75.7369], 15);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxNativeZoom: 19,
    maxZoom: 20,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  L.tileLayer("assets/mapserver/{z}/{x}/{y}.png", {
    minZoom: 10,
    minNativeZoom: 14,
    maxZoom: 20,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  // Control de zoom personalizado
  document.querySelector(".zoom-in").addEventListener("click", function () {
    map.zoomIn();
  });
  document.querySelector(".zoom-out").addEventListener("click", function () {
    map.zoomOut();
  });

  // Función para crear HTML de popup tipo tabla
  function createPopupTable(properties) {
    if (!properties || Object.keys(properties).length === 0) {
      return '<div class="popup-table-wrapper"><div class="popup-table"><p style="padding: 0.8rem; color: #666;">Sin datos disponibles</p></div></div>';
    }

    let tableHTML =
      '<div class="popup-table-wrapper"><div class="popup-table"><table class="popup-data-table">';
    let isAlternate = false;

    Object.entries(properties).forEach(([key, value]) => {
      const rowClass = isAlternate ? "popup-row-gray" : "popup-row-white";
      const displayValue =
        value !== null && value !== undefined ? value : "N/A";

      tableHTML += `
      <tr class="${rowClass}">
        <td class="popup-cell-key">${key}</td>
        <td class="popup-cell-value">${displayValue}</td>
      </tr>
    `;
      isAlternate = !isAlternate;
    });

    tableHTML += "</table></div></div>";
    return tableHTML;
  }

  let layers_ids = [
    "Btn_Unidad_Geologica",
    "Btn_Unidad_Geologica_Superficial",
    "Btn_Unidad_Geomorfologica_IGAC",
    "Btn_Unidad_Geomorfologica_SGC",
    "Btn_Capacidad_Uso_Tierra",
    "Btn_Suelo",
  ];
  let Layers = [];

  // Estilos por defecto para las capas
  const defaultStyles = {
    weight: 2,
    opacity: 0.7,
    color: "red",
    fillOpacity: 0.1,
    fillColor: "red",
  };

  // Estilos al hacer hover
  const hoverStyles = {
    weight: 3,
    opacity: 0.9,
    color: "yellow",
    fillOpacity: 0.1,
  };

  layers_ids.forEach(function (layerId, index) {
    let Layer = L.geoJSON(layers[index], {
      style: defaultStyles,
      onEachFeature: function (feature, layer) {
        // Crear popup con tabla
        const popupContent = createPopupTable(feature.properties);

        // Abrir popup en las coordenadas del click
        layer.on("click", function (e) {
          const popup = L.popup({
            maxWidth: 450,
            className: "custom-popup",
          })
            .setLatLng(e.latlng)
            .setContent(popupContent)
            .openOn(map);
        });

        // Efecto visual al pasar el mouse (hover)
        layer.on("mouseover", function () {
          if (this.setStyle) {
            this.setStyle(hoverStyles);
            layer.bringToFront();
          }
        });

        // Volver al estilo por defecto al salir del mouse
        layer.on("mouseout", function () {
          if (this.setStyle) {
            this.setStyle(defaultStyles);
          }
        });
      },
    });

    Layer.btn_layer = layerId;
    Layer.layer_PAGA = true;
    Layers.push(Layer);
  });

  // Control de zoom personalizado
  const panel = document.querySelector(".custom-zoom-container");
  panel.addEventListener("mouseenter", () => {
    map.dragging.disable();
    map.scrollWheelZoom.disable();
    map.doubleClickZoom.disable();
  });
  panel.addEventListener("mouseleave", () => {
    map.dragging.enable();
    map.scrollWheelZoom.enable();
    map.doubleClickZoom.enable();
  });

  // Manejo de toggle de capas (solo una activa por grupo)
  document.querySelectorAll(".layer-toggle").forEach(function (sw) {
    sw.addEventListener("change", function (e) {
      const layerId = sw.dataset.layerId;

      if (sw.checked) {
        console.log("✓ Activada capa:", layerId);
        // Añadir la capa seleccionada al mapa
        Layers.forEach(function (layer) {
          if (layer.btn_layer === layerId) {
            layer.addTo(map);
            // Opcional: Ajustar la vista del mapa para que muestre la capa recién añadida
            //map.fitBounds(layer.getBounds());
          }
        });
      } else {
        console.log("✗ Desactivada capa:", layerId);
        // Remover la capa del mapa
        map.eachLayer(function (layer) {
          if (layer.layer_PAGA && layer.btn_layer === layerId) {
            if (map._popup) {
              map.closePopup();
            }
            map.removeLayer(layer);
          }
        });
      }
    });
  });

  // Función para normalizar el texto de búsqueda
  function normalizeSearchTerm(term) {
    return term
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  // Función para resaltar texto
  function highlightText(text, term) {
    const regex = new RegExp(term, "gi");
    return text.replace(
      regex,
      (match) => `<strong class="text-primary">${match}</strong>`
    );
  }

  // Función de búsqueda
  function doSearch(term) {
    const normalizedTerm = normalizeSearchTerm(term);
    const rows = Array.from(document.querySelectorAll(".layer-row"));
    const accordionItems = Array.from(
      document.querySelectorAll(".accordion-item")
    );
    const t = term.trim();

    // Si no hay término, mostrar todo y expandir acordeones
    if (t.length === 0) {
      rows.forEach((r) => r.classList.remove("hidden"));
      accordionItems.forEach((item) => {
        const collapse = item.querySelector(".accordion-collapse");
        const collapseInstance =
          bootstrap.Collapse.getOrCreateInstance(collapse);
        collapseInstance.show();
      });
      return;
    }

    let hasMatches = false;
    rows.forEach(function (r) {
      const nameElement = r.querySelector(".layer-name");
      if (!nameElement) return;
      const originalText = nameElement.textContent;
      const name = originalText.toLowerCase();
      const matchIndex = name.indexOf(t.toLowerCase());

      if (matchIndex !== -1) {
        hasMatches = true;
        r.classList.remove("hidden");
        nameElement.innerHTML = highlightText(originalText, normalizedTerm);
        // Mostrar acordeón padre
        const parentAccordion = r.closest(".accordion-item");
        const collapse = parentAccordion.querySelector(".accordion-collapse");
        const collapseInstance =
          bootstrap.Collapse.getOrCreateInstance(collapse);
        collapseInstance.show();
      } else {
        r.classList.add("hidden");
        nameElement.innerHTML = originalText;
      }
    });

    // Ocultar acordeones sin coincidencias
    accordionItems.forEach((item) => {
      const visibleRows = item.querySelectorAll(".layer-row:not(.hidden)");
      if (visibleRows.length === 0) {
        item.style.display = "none";
      } else {
        item.style.display = "";
      }
    });

    // Si no hay coincidencias, ocultar todos los acordeones
    if (!hasMatches) {
      accordionItems.forEach((item) => {
        item.style.display = "none";
      });
    }
  }

  // Event listeners para búsqueda
  const searchDesktop = document.getElementById("layerSearchDesktop");
  const btnSearchDesktop = document.getElementById("btnSearchDesktop");
  const searchMobile = document.getElementById("layerSearchMobile");
  const btnSearchMobile = document.getElementById("btnSearchMobile");

  searchDesktop.addEventListener("input", function (e) {
    doSearch(e.target.value);
  });
  btnSearchDesktop.addEventListener("click", function () {
    doSearch(searchDesktop.value);
  });
  searchMobile.addEventListener("input", function (e) {
    doSearch(e.target.value);
  });
  btnSearchMobile.addEventListener("click", function () {
    doSearch(searchMobile.value);
  });

  // Clonar acordeones para móvil
  const offcanvas = document.getElementById("offcanvasSidebar");
  offcanvas.addEventListener("show.bs.offcanvas", function () {
    const mobileContainer = document.getElementById("mobileAccordionContainer");
    mobileContainer.innerHTML = ""; // Limpiar el contenedor móvil antes de clonar

    const desktopAccordions = document.querySelectorAll(".sidebar .accordion");
    desktopAccordions.forEach((accordion, accordionIndex) => {
      const accordionItem = accordion
        .querySelector(".accordion-item")
        .cloneNode(true);

      // Asignar IDs únicos para el acordeón móvil
      const originalAccordionId = accordion.id;
      const collapseId = `${originalAccordionId}-mobile-collapse-${accordionIndex}`;

      // Actualizar IDs y atributos para el contenido colapsable en móvil
      const collapseElement = accordionItem.querySelector(
        ".accordion-collapse"
      );
      collapseElement.id = collapseId;

      const buttonElement = accordionItem.querySelector(".accordion-button");
      buttonElement.setAttribute("data-bs-target", `#${collapseId}`);
      buttonElement.setAttribute("aria-controls", collapseId);

      // Asegurar que el data-bs-parent sea único para cada acordeón
      collapseElement.setAttribute(
        "data-bs-parent",
        `#${originalAccordionId}-mobile-parent`
      );

      // Sincronizar checkboxes en móvil con los de desktop
      accordionItem.querySelectorAll(".layer-toggle").forEach(function (sw) {
        sw.addEventListener("change", function (e) {
          const layerId = sw.dataset.layerId;
          const desktopSwitch = document.querySelector(
            `.sidebar .layer-toggle[data-layer-id="${layerId}"]`
          );
          if (desktopSwitch) {
            desktopSwitch.checked = sw.checked;
            desktopSwitch.dispatchEvent(new Event("change"));
          }
        });
      });

      mobileContainer.appendChild(accordionItem);
    });

    setTimeout(() => searchMobile.focus(), 300);
  });
});
