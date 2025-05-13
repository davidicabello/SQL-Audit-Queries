let columns = []; // Almacenar las columnas de la tabla
let currentPage = 1; // Página inicial
let totalPages = 1;

// Variables para la paginación de los registros de auditoría
let auditCurrentPage = 1;
let auditTotalPages = 0;
let auditTotalRecords = 0;

// Variables globales para la paginación de auditoría
let currentAuditPage = 1;
let totalAuditPages = 1;
let auditPageSize = 10;

// Agregar constante para los servidores predefinidos
const PREDEFINED_SERVERS = [
  { name: "SPICA", database: "Auditoria" },
  { name: "Regulus", database: "Source" },
  { name: "CX5200271957\\Mordor", database: "Auditoria" },
];

// Configuración global de la API
const baseApiUrl = "http://10.16.236.64:3000"; // URL completa del servidor

// Generar los inputs de filtro dinámicamente según las columnas
function renderFilters() {
  const filtersContainer = document.getElementById("filtersContainer");
  filtersContainer.innerHTML = "";

  if (columns.length === 0) {
    filtersContainer.innerHTML =
      "<div class='alert alert-warning'>No hay columnas disponibles</div>";
    return;
  }

  // Agregar información sobre operadores disponibles
  const helpCard = document.createElement("div");
  helpCard.classList.add("card", "mb-3");
  helpCard.innerHTML = `
      <div class="card-header">
          <h6 class="mb-0"><i class="bi bi-info-circle"></i> Operadores disponibles</h6>
      </div>
      <div class="card-body">
          <small class="text-muted">
              <ul class="mb-0 ps-3">
                  <li>Igual: = valor</li>
                  <li>Mayor/Menor: > valor, < valor, >= valor, <= valor</li>
                  <li>Rango: > 2020 AND < 2024</li>
                  <li>Lista: IN(valor1,valor2,valor3)</li>
                  <li>Múltiples condiciones: > 2020 OR < 2010</li>
                  <li>Texto: LIKE '%texto%'</li>
              </ul>
          </small>
      </div>
  `;
  filtersContainer.appendChild(helpCard);

  // Agregar los filtros
  columns.forEach((column) => {
    const filterDiv = document.createElement("div");
    filterDiv.classList.add("filter-input", "mb-2");

    const label = document.createElement("label");
    label.classList.add("filter-label", "d-block", "mb-1");
    label.innerText = `${column}:`;

    const inputField = document.createElement("input");
    inputField.type = "text";
    inputField.id = `filter_${column}`;
    inputField.classList.add(
      "filter-input-field",
      "form-control",
      "form-control-sm"
    );
    inputField.placeholder = `Ej: > 2024, IN(1,2,3), LIKE '%texto%'`;

    filterDiv.appendChild(label);
    filterDiv.appendChild(inputField);
    filtersContainer.appendChild(filterDiv);
  });
}

// Función para cargar la siguiente página de resultados
function loadNextPage() {
  if (currentPage < totalPages) {
    currentPage++;
    fetchPredefinedQueryData(currentPage, false);
  }
}

// Función para cargar la página anterior
function loadPreviousPage() {
  if (currentPage > 1) {
    currentPage--;
    fetchPredefinedQueryData(currentPage, false);
  }
}

// Nueva función para actualizar los controles de paginación
function updatePaginationControls() {
  // Mostrar información de página
  const paginationInfo = document.getElementById("pagination-info");
  if (paginationInfo) {
    paginationInfo.textContent = `Página ${currentPage} de ${totalPages}`;
  }
  // Deshabilitar/habilitar botones
  const prevBtn = document.querySelector(
    'button[onclick="loadPreviousPage()"]'
  );
  const nextBtn = document.querySelector('button[onclick="loadNextPage()"]');
  if (prevBtn) prevBtn.disabled = currentPage <= 1;
  if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
}

// Función para renderizar la tabla con los datos
function renderTable(responseData) {
  // Si no hay datos, mostrar mensaje
  if (!responseData.data || responseData.data.length === 0) {
    document.getElementById("table-container").innerHTML =
      '<div class="alert alert-info">No se encontraron resultados para esta consulta.</div>';
    document.getElementById("record-count").textContent = "0 registros";
    return;
  }

  // Actualizar badge con la cantidad de registros
  const totalRecords = responseData.total_records || responseData.data.length;
  document.getElementById(
    "record-count"
  ).textContent = `${totalRecords} registro(s)`;

  const data = responseData.data;
  const columns = responseData.columns;
  const isEditable = responseData.isEditable;

  // Obtener las columnas editables específicas
  const editableColumns = responseData.editable_columns || [];

  // Crear tabla
  let tableHTML =
    '<table id="data-table" class="table table-striped table-hover">';

  // Encabezados - sin columna de acciones
  tableHTML += "<thead><tr>";
  for (const col of columns) {
    tableHTML += `<th>${col}</th>`;
  }
  tableHTML += "</tr></thead>";

  // Cuerpo de la tabla
  tableHTML += "<tbody>";
  for (const row of data) {
    tableHTML += "<tr>";
    for (const col of columns) {
      // Determinar si esta celda debe ser editable
      const isCellEditable = isEditable && editableColumns.includes(col);

      // Clase para celda editable
      const editableClass = isCellEditable ? "editable-cell" : "";

      // Agregar celda con o sin clase de editable
      if (isCellEditable) {
        tableHTML += `<td class="${editableClass}" 
                                 data-column="${col}" 
                                 data-original-value="${row[col] || ""}"
                                 data-row='${JSON.stringify(row)}'
                                 onclick="makeFieldEditable(this)">${
                                   row[col] || ""
                                 }</td>`;
      } else {
        tableHTML += `<td>${row[col] || ""}</td>`;
      }
    }

    tableHTML += "</tr>";
  }
  tableHTML += "</tbody></table>";

  // Asignar HTML al contenedor
  document.getElementById("table-container").innerHTML = tableHTML;
}

// Función para cancelar todas las ediciones activas
function cancelAllActiveCellEdits() {
  // Enfoque más compatible: buscar todos los inputs dentro de celdas editables
  const activeInputs = document.querySelectorAll(".editable-cell input");
  activeInputs.forEach((input) => {
    const cell = input.closest(".editable-cell");
    if (cell) {
      cancelFieldEdit(cell);
    }
  });
}

// Función para hacer editable una fila
function makeRowEditable(tr, columns, originalData) {
  const cells = tr.querySelectorAll("td:not(:last-child)");
  const originalValues = {};

  cells.forEach((cell, index) => {
    const column = columns[index];
    originalValues[column] = cell.innerText;

    const input = document.createElement("input");
    input.type = "text";
    input.value = cell.innerText;
    input.classList.add("form-control", "form-control-sm");

    cell.innerText = "";
    cell.appendChild(input);
  });

  // Cambiar botones por guardar/cancelar
  const actionTd = tr.querySelector("td:last-child");
  const saveButton = document.createElement("button");
  saveButton.classList.add("btn", "btn-success", "btn-sm", "me-1");
  saveButton.innerHTML = '<i class="bi bi-check"></i>';
  saveButton.onclick = () => saveRow(tr, columns, originalValues);

  const cancelButton = document.createElement("button");
  cancelButton.classList.add("btn", "btn-secondary", "btn-sm");
  cancelButton.innerHTML = '<i class="bi bi-x"></i>';
  cancelButton.onclick = () => cancelEdit(tr, originalValues);

  actionTd.innerHTML = "";
  actionTd.appendChild(saveButton);
  actionTd.appendChild(cancelButton);
}

// Modificar la función saveRow
async function saveRow(tr, columns, originalValues) {
  const isConfirmed = confirm(
    "¿Estás seguro de que quieres guardar los cambios?"
  );
  if (!isConfirmed) return;

  const queryName = document.getElementById("predefinedQuerySelect").value;
  if (!queryName) {
    showToast("Error", "No se pudo identificar la consulta", "error");
    return;
  }

  const inputs = tr.querySelectorAll("input");
  const updatedValues = {};
  const cleanedOriginalValues = {};

  // Limpiar y validar los valores actualizados
  inputs.forEach((input, index) => {
    const column = columns[index];
    const value = input.value.trim();
    updatedValues[column] = value;
  });

  // Limpiar valores originales
  Object.keys(originalValues).forEach((key) => {
    const value = originalValues[key].trim();
    cleanedOriginalValues[key] = value;
  });

  try {
    const response = await fetch(`${baseApiUrl}/api/update_table`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query_name: queryName,
        updatedRow: updatedValues,
        originalValues: cleanedOriginalValues,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Error al actualizar");

    if (data.rows_affected === 0) {
      throw new Error("No se actualizó ningún registro");
    }

    showToast(
      "Éxito",
      `${data.message} (${data.rows_affected} registro(s) actualizado(s))`,
      "success"
    );
    await fetchPredefinedQueryData(currentPage, false);
  } catch (error) {
    console.error("Error:", error);
    showToast("Error", error.message, "error");
  }
}

// Función para cancelar la edición
function cancelEdit(tr, originalValues) {
  const cells = tr.querySelectorAll("td:not(:last-child)");
  cells.forEach((cell, index) => {
    const column = columns[index];
    cell.innerHTML = originalValues[column] || "";
  });

  // Restaurar botones originales
  const actionTd = tr.querySelector("td:last-child");
  actionTd.innerHTML = "";

  const editButton = document.createElement("button");
  editButton.classList.add("btn", "btn-primary", "btn-sm", "me-1");
  editButton.innerHTML = '<i class="bi bi-pencil"></i>';
  editButton.onclick = () => makeRowEditable(tr, columns, originalValues);

  const deleteButton = document.createElement("button");
  deleteButton.classList.add("btn", "btn-danger", "btn-sm");
  deleteButton.innerHTML = '<i class="bi bi-trash"></i>';
  deleteButton.onclick = () => deleteRow(tr, originalValues);

  actionTd.appendChild(editButton);
  actionTd.appendChild(deleteButton);
}

// Función para eliminar una fila
async function deleteRow(tr, originalValues) {
  const isConfirmed = confirm(
    "¿Estás seguro de que quieres eliminar esta entrada?"
  );
  if (!isConfirmed) {
    return;
  }

  const currentQuery = document
    .getElementById("predefinedQuerySelect")
    .value.trim();
  if (!currentQuery) {
    showToast("Error", "No hay una consulta seleccionada.", "error");
    return;
  }

  try {
    const response = await fetch(`${baseApiUrl}/api/delete_entry`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query_name: currentQuery,
        rowValues: originalValues,
      }),
    });

    // Primero verificar si la respuesta es JSON
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("La respuesta del servidor no es JSON válido");
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Error al eliminar la entrada");
    }

    showToast("Éxito", data.message, "success");
    await fetchPredefinedQueryData(); // Recargar la tabla
  } catch (error) {
    console.error("Error al eliminar:", error);
    showToast("Error", error.message, "error");
  }
}

// Función para descargar Excel
async function downloadExcel() {
  const tableName = document.getElementById("tableName").value.trim();
  if (!tableName) {
    showToast("Error", "Por favor, selecciona una tabla.", "error");
    return;
  }

  try {
    // Obtener los filtros actuales
    const filters = {};
    const filterInputs = document.querySelectorAll("#filtersContainer input");
    filterInputs.forEach((input) => {
      const column = input.getAttribute("data-column");
      if (column && input.value.trim()) {
        filters[column] = input.value.trim();
      }
    });

    const response = await fetch(`${baseApiUrl}/api/download_excel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: tableName,
        filters: filters,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    const filename = `${tableName}_${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:-]/g, "")}.xlsx`;

    // Verificar si estamos en pywebview
    if (window.pywebview !== undefined) {
      // Convertir el blob a base64 para enviarlo al backend
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = function () {
        const base64data = reader.result.split(",")[1];
        fetch(`${baseApiUrl}/api/save_excel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: base64data,
            filename: filename,
          }),
        })
          .then((response) => {
            if (!response.ok) throw new Error("Error al guardar el archivo");
            showToast("Éxito", "Excel guardado correctamente", "success");
          })
          .catch((error) => {
            showToast("Error", "Error al guardar el archivo", "error");
          });
      };
    } else {
      // Descarga directa en el navegador
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      showToast("Éxito", "Excel descargado correctamente", "success");
    }
  } catch (error) {
    console.error("Error al descargar Excel:", error);
    showToast("Error", "Error al descargar el Excel", "error");
  }
}

// Función auxiliar para obtener los filtros
function getFilters() {
  const filters = {};
  if (columns.length > 0) {
    columns.forEach((column) => {
      const filterValue = document
        .getElementById(`filter_${column}`)
        ?.value.trim();
      if (filterValue) {
        filters[column] = filterValue;
      }
    });
  }
  return filters;
}

// Función para cargar las consultas predefinidas en el dropdown
async function loadPredefinedQueries() {
  try {
    const response = await fetch(`${baseApiUrl}/api/get_predefined_queries`);
    if (!response.ok) {
      throw new Error("No se pudieron cargar las consultas predefinidas");
    }
    const data = await response.json();
    const select = document.getElementById("predefinedQuerySelect");

    // Guardar la selección actual
    const currentSelection = select.value;

    // Limpiar opciones existentes
    select.innerHTML = '<option value="">Selecciona una consulta...</option>';

    // Agregar nuevas opciones
    data.forEach((queryName) => {
      const option = document.createElement("option");
      option.value = queryName;
      option.textContent = queryName;
      select.appendChild(option);
    });

    // Restaurar la selección anterior si todavía existe
    if (currentSelection && data.includes(currentSelection)) {
      select.value = currentSelection;
    }
    // Actualizar el estado del botón de borrar consulta
    const deleteQueryBtn = document.getElementById("deleteQueryBtn");
    if (deleteQueryBtn) {
      deleteQueryBtn.disabled = !select.value;
    }
  } catch (error) {
    console.error("Error al cargar consultas predefinidas:", error);
    showToast(
      "Error",
      "No se pudieron cargar las consultas predefinidas",
      "error"
    );
  }
}

// Modificar la función updateDatabaseConnection
async function updateDatabaseConnection() {
  const serverSelect = document.getElementById("db-server");
  const server = serverSelect.value.trim();
  const database = document.getElementById("db-name").value.trim();
  const user = document.getElementById("db-user").value.trim();
  const password = document.getElementById("db-password").value.trim();

  if (!server || !database) {
    showToast(
      "Error",
      "El servidor y la base de datos son obligatorios.",
      "error"
    );
    return;
  }

  try {
    const connectionData = { server, database, user, password };
    const response = await fetch(`${baseApiUrl}/api/update_connection`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(connectionData),
    });

    const data = await response.json();
    if (data.message) {
      // Ocultar solo el modal de conexión
      const connectionModal = bootstrap.Modal.getInstance(
        document.getElementById("connectionModal")
      );
      connectionModal?.hide();

      showToast("Éxito", data.message, "success");

      // Limpiar la tabla y los filtros
      const tableContainer = document.getElementById("table-container");
      const filtersContainer = document.getElementById("filtersContainer");
      const recordCount = document.getElementById("record-count");
      tableContainer.innerHTML = "";
      filtersContainer.innerHTML = "";
      recordCount.innerText = "";

      // Actualizar visibilidad de consultas predefinidas
      const predefinedQuerySection = document.querySelector(
        ".predefined-query-section"
      );
      if (server === "CX5200271957\\Mordor") {
        predefinedQuerySection.style.display = "none";
      } else {
        predefinedQuerySection.style.display = "block";
        await loadPredefinedQueries();
      }
    } else {
      throw new Error("Error al actualizar la conexión.");
    }
  } catch (error) {
    console.error("Error al actualizar la conexión:", error);
    showToast("Error", error.message, "error");
  }
}

// Agregar función para manejar el cambio de servidor
function onServerChange() {
  const serverSelect = document.getElementById("db-server");
  const dbNameInput = document.getElementById("db-name");
  const selectedServer = PREDEFINED_SERVERS.find(
    (s) => s.name === serverSelect.value
  );
  const predefinedQuerySection = document.querySelector(
    ".predefined-query-section"
  );

  if (selectedServer) {
    dbNameInput.value = selectedServer.database;

    // Mostrar/ocultar sección de consultas predefinidas
    if (selectedServer.name === "CX5200271957\\Mordor") {
      predefinedQuerySection.style.display = "none";
    } else {
      predefinedQuerySection.style.display = "block";
    }
  }
}

// Modificar la función de inicialización
function initializeApp() {
  console.log("Inicializando aplicación...");

  // Agregar el event listener para refrescar las consultas
  const refreshInterval = setInterval(async () => {
    try {
      await loadPredefinedQueries();
    } catch (error) {
      console.error("Error al refrescar consultas:", error);
    }
  }, 5000); // Refrescar cada 5 segundos

  // Mostrar/ocultar sección de consultas predefinidas según el servidor
  const currentServer = document.getElementById("db-server").value;
  const predefinedQuerySection = document.querySelector(
    ".predefined-query-section"
  );
  if (currentServer === "CX5200271957\\Mordor") {
    predefinedQuerySection.style.display = "none";
  } else {
    predefinedQuerySection.style.display = "block";
    loadPredefinedQueries();
  }

  // Evento para detectar cuando se abre el modal de auditoría
  const auditModal = document.getElementById("auditModal");
  if (auditModal) {
    auditModal.addEventListener("shown.bs.modal", function () {
      fetchAuditRecords(1);
    });
  }

  // Mostrar el modal de identificación de usuario al iniciar
  const userIdentificationModal = new bootstrap.Modal(
    document.getElementById("userIdentificationModal")
  );

  // Si hay información de usuario almacenada en localStorage, usarla
  const savedUsername = localStorage.getItem("clientUsername");

  if (savedUsername) {
    // Enviar la información almacenada
    sendClientUserInfo(savedUsername);
  } else {
    // Mostrar el modal de identificación
    userIdentificationModal.show();
  }

  // Configurar el evento para guardar la información de usuario
  document
    .getElementById("saveUserInfoBtn")
    .addEventListener("click", function () {
      const username = document.getElementById("client-username").value.trim();

      if (!username) {
        showToast(
          "Error",
          "Por favor, ingresa tu nombre de usuario",
          "error",
          false,
          3000
        );
        return;
      }

      // Guardar en localStorage para futuras visitas
      localStorage.setItem("clientUsername", username);

      // Enviar al servidor
      sendClientUserInfo(username);

      // Cerrar el modal
      userIdentificationModal.hide();

      // Mostrar mensaje de éxito
      showToast(
        "Identificación completada",
        "Tu información ha sido guardada correctamente",
        "success",
        false,
        3000
      );
    });

  // Otras inicializaciones...
}

// Event Listener para cuando el DOM está listo
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM cargado, iniciando aplicación...");
  initializeApp();

  // Agregar evento para cerrar edición al hacer click fuera de la celda
  document.addEventListener("click", function (event) {
    // Solo procesar si hay alguna celda en edición
    const activeInputs = document.querySelectorAll(".editable-cell input");
    if (activeInputs.length === 0) return;

    // Verificar si el click fue fuera de cualquier celda en edición
    let clickedInsideEditableCell = false;
    activeInputs.forEach((input) => {
      const cell = input.closest(".editable-cell");
      if (cell && (cell.contains(event.target) || cell === event.target)) {
        clickedInsideEditableCell = true;
      }
    });

    // Si el click fue fuera, cancelar todas las ediciones
    if (!clickedInsideEditableCell) {
      cancelAllActiveCellEdits();
    }
  });

  // Event listener para el botón de auditoría
  document.getElementById("auditBtn").addEventListener("click", function () {
    // Inicializar y mostrar modal de auditoría
    clearAuditFilters();
    fetchAuditRecords(1);
    var auditModal = new bootstrap.Modal(document.getElementById("auditModal"));
    auditModal.show();
  });

  // Evento para guardar nueva consulta
  const saveQueryBtn = document.getElementById("saveQueryBtn");
  if (saveQueryBtn) {
    saveQueryBtn.addEventListener("click", async function () {
      const name = document.getElementById("newQueryName").value.trim();
      const description = document
        .getElementById("newQueryDescription")
        .value.trim();
      const query = document.getElementById("newQuerySQL").value.trim();
      const editableColumnsRaw = document
        .getElementById("newQueryEditableColumns")
        .value.trim();
      const editable_columns = editableColumnsRaw
        ? editableColumnsRaw
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean)
        : [];
      const filterableColumnsRaw = document
        .getElementById("newQueryFilterableColumns")
        .value.trim();
      const filterable_columns = filterableColumnsRaw
        ? filterableColumnsRaw
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean)
        : [];
      const multiselectColumnsRaw = document
        .getElementById("newQueryMultiselectFilterColumns")
        .value.trim();
      const multiselect_filter_columns = multiselectColumnsRaw
        ? multiselectColumnsRaw
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean)
        : [];

      if (!name || !query) {
        showToast(
          "Error",
          "El nombre y el SQL son obligatorios",
          "error",
          false,
          3000
        );
        return;
      }

      try {
        saveQueryBtn.disabled = true;
        saveQueryBtn.innerHTML =
          '<span class="spinner-border spinner-border-sm"></span> Guardando...';
        const server = document.getElementById("newQueryServer").value.trim();
        if (!server) {
          showToast(
            "Error",
            "Debes seleccionar un servidor",
            "error",
            false,
            3000
          );
          return;
        }
        const response = await fetch("/api/queries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            description,
            query,
            editable_columns,
            filterable_columns,
            multiselect_filter_columns,
            server,
          }),
        });
        const data = await response.json();
        saveQueryBtn.disabled = false;
        saveQueryBtn.innerHTML = '<i class="bi bi-save"></i> Guardar consulta';
        if (!response.ok)
          throw new Error(data.error || "Error al agregar consulta");
        showToast(
          "Éxito",
          "Consulta agregada correctamente",
          "success",
          false,
          2000
        );
        // Cerrar modal
        const modal = bootstrap.Modal.getInstance(
          document.getElementById("addQueryModal")
        );
        modal.hide();
        // Limpiar formulario
        document.getElementById("addQueryForm").reset();
        // Recargar lista de consultas
        await loadPredefinedQueries();
      } catch (error) {
        showToast("Error", error.message, "error", false, 4000);
      }
    });
  }

  // Habilitar/deshabilitar el botón de borrar consulta según selección
  const predefinedQuerySelect = document.getElementById(
    "predefinedQuerySelect"
  );
  const deleteQueryBtn = document.getElementById("deleteQueryBtn");
  if (predefinedQuerySelect && deleteQueryBtn) {
    predefinedQuerySelect.addEventListener("change", function () {
      deleteQueryBtn.disabled = !this.value;
    });

    deleteQueryBtn.addEventListener("click", async function () {
      const queryName = predefinedQuerySelect.value;
      if (!queryName) return;
      if (
        !confirm(
          `¿Estás seguro de que quieres borrar la consulta "${queryName}"? Esta acción no se puede deshacer.`
        )
      ) {
        return;
      }
      try {
        const response = await fetch(
          `/api/queries/${encodeURIComponent(queryName)}`,
          {
            method: "DELETE",
          }
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Error al borrar consulta");
        showToast("Éxito", "Consulta borrada correctamente", "success");
        await loadPredefinedQueries();
        predefinedQuerySelect.value = "";
        deleteQueryBtn.disabled = true;
        // Limpiar tabla y filtros
        document.getElementById("table-container").innerHTML = "";
        document.getElementById("predefinedQueryFilters").innerHTML = "";
        document.getElementById("record-count").innerText = "";
      } catch (error) {
        showToast("Error", error.message, "error");
      }
    });
  }
});

// Función para mostrar un toast de notificación
function showToast(
  title,
  message,
  type = "info",
  persistent = false,
  delay = 3000
) {
  const toastContainer = document.getElementById("toastContainer");

  // Si no existe el contenedor, lo creamos
  if (!toastContainer) {
    const container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container position-fixed bottom-0 end-0 p-3";
    container.style.zIndex = "9999";
    document.body.appendChild(container);
  }

  // Crear un ID único para este toast
  const toastId = "toast_" + Date.now();

  // Determinar el color según el tipo
  let bgColor, iconClass;
  switch (type) {
    case "success":
      bgColor = "bg-success";
      iconClass = "bi-check-circle";
      break;
    case "error":
      bgColor = "bg-danger";
      iconClass = "bi-exclamation-triangle";
      break;
    case "warning":
      bgColor = "bg-warning";
      iconClass = "bi-exclamation-circle";
      break;
    case "info":
    default:
      bgColor = "bg-info";
      iconClass = "bi-info-circle";
      break;
  }

  // Crear el toast
  const toastHtml = `
        <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true" data-bs-autohide="${!persistent}">
            <div class="toast-header ${bgColor} text-white">
                <i class="bi ${iconClass} me-2"></i>
                <strong class="me-auto">${title}</strong>
                <small>Ahora</small>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;

  // Agregar al contenedor
  document.getElementById("toastContainer").innerHTML += toastHtml;

  // Inicializar y mostrar
  const toastElement = document.getElementById(toastId);
  const toast = new bootstrap.Toast(toastElement, {
    autohide: !persistent,
    delay: delay, // Usar el parámetro de retraso
  });
  toast.show();

  // Retornar el ID del toast para poder manipularlo después
  return toastId;
}

// 4. Simplificar exitApp para usar el sistema de notificaciones
async function exitApp() {
  if (confirm("¿Estás seguro de que deseas cerrar la aplicación?")) {
    try {
      await fetch(`${baseApiUrl}/exit`);
      showToast("Info", "Cerrando aplicación...", "info");
    } catch (error) {
      console.error("Error al cerrar la aplicación:", error);
      showToast("Error", "Error al cerrar la aplicación", "error");
    }
  }
}

// Modificar la función fetchPredefinedQueryData para actualizar paginación
async function fetchPredefinedQueryData(page = 1, showSuccess = true) {
  const queryName = document.getElementById("predefinedQuerySelect").value;
  if (!queryName) {
    showToast("Error", "Por favor, selecciona una consulta.", "error");
    return;
  }

  try {
    // Show loading overlay
    document.getElementById("loading-overlay").classList.remove("d-none");
    
    // Recoger los filtros del nuevo contenedor
    const filters = {};
    const filterInputs = document.querySelectorAll(
      "#filter-inputs-container input"
    );
    filterInputs.forEach((input) => {
      const column = input.getAttribute("data-column");
      if (column && input.value.trim()) {
        filters[column] = input.value.trim();
      }
    });

    // Recoger los parámetros de ordenamiento
    const orderByColumn = document.getElementById("orderByColumn")?.value;
    const orderDirection = document.querySelector('input[name="orderDirection"]:checked')?.value || 'ASC';
    
    const requestData = {
      query_name: queryName,
      page: page,
      page_size: 1000,
      filters: filters,
    };
    
    // Agregar parámetros de ordenamiento si se ha seleccionado una columna
    if (orderByColumn) {
      requestData.order_by = {
        column: orderByColumn,
        direction: orderDirection
      };
    }

    const response = await fetch(`${baseApiUrl}/api/execute_predefined_query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData),
    });

    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = {};
    }
    if (!response.ok) {
      // Mostrar el mensaje de error real si existe
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }
    if (data.error) {
      throw new Error(data.error);
    }

    // Renderizar los filtros si es la primera vez
    if (
      page === 1 &&
      data.columns &&
      document.querySelector("#predefinedQueryFilters").childElementCount === 0
    ) {
      renderPredefinedQueryFilters(
        data.columns,
        data.filterable_columns,
        data.multiselect_filter_columns
      );
    }

    renderTable(data);
    currentPage = data.current_page;
    totalPages = data.total_pages || 1;
    updatePaginationControls();

    // Solo mostrar el toast de éxito si showSuccess es true
    if (showSuccess) {
      showToast("Éxito", "Consulta ejecutada correctamente", "success");
    }
  } catch (error) {
    console.error("Error al ejecutar consulta:", error);
    showToast("Error", error.message, "error");
    // Si hay error, deshabilitar paginación
    currentPage = 1;
    totalPages = 1;
    updatePaginationControls();
  } finally {
    // Hide loading overlay
    document.getElementById("loading-overlay").classList.add("d-none");
  }
}

function renderPredefinedQueryFilters(
  columns,
  filterableColumns = null,
  multiselectFilterColumns = null
) {
  const filtersContainer = document.getElementById("predefinedQueryFilters");
  filtersContainer.innerHTML = "";

  // Agregar una tarjeta con ejemplos de operadores más detallada
 /*
  const helpCard = document.createElement("div");
  helpCard.classList.add("card", "mb-3");
  helpCard.innerHTML = `
        <div class="card-header d-flex justify-content-between align-items-center">
            <h6 class="mb-0"><i class="bi bi-info-circle"></i> Guía de Filtros SQL</h6>
            <button type="button" class="btn btn-sm btn-link" data-bs-toggle="collapse" data-bs-target="#filterExamples">
                <i class="bi bi-chevron-right"></i>
            </button>
        </div>
        <div class="card-body collapse" id="filterExamples">
            <div class="mb-3">
                <h6 class="text-primary">Operadores disponibles:</h6>
                <div class="row">
                    <div class="col-md-6">
                        <ul class="list-unstyled">
                            <li><code>=</code> - Igual a: <code>= 100</code></li>
                            <li><code>></code> - Mayor que: <code>> 2021</code></li>
                            <li><code><</code> - Menor que: <code>< 5000</code></li>
                            <li><code>>=</code> - Mayor o igual: <code>>= 18</code></li>
                            <li><code><=</code> - Menor o igual: <code><= 65</code></li>
                        </ul>
                    </div>
                    <div class="col-md-6">
                        <ul class="list-unstyled">
                            <li><code>LIKE</code> - Contiene: <code>LIKE '%texto%'</code></li>
                            <li><code>IN</code> - Lista de valores: <code>IN(1,2,3)</code></li>
                            <li><code>AND</code> - Y lógico: <code>> 5 AND < 10</code></li>
                            <li><code>OR</code> - O lógico: <code>= 1 OR = 5</code></li>
                            <li><code>NULL</code> - Vacío: <code>IS NULL</code> (próximamente)</li>
                        </ul>
                    </div>
                </div>
            </div>
            <div class="mb-0">
                <h6 class="text-primary">Ejemplos:</h6>
                <div class="row">
                    <div class="col-md-6">
                        <ul class="list-unstyled">
                            <li>Rango de fechas: <code>> '2020-01-01' AND < '2023-12-31'</code></li>
                            <li>Múltiples opciones: <code>= 'ACTIVO' OR = 'PENDIENTE'</code></li>
                            <li>Valores específicos: <code>IN(100,200,300)</code></li>
                        </ul>
                    </div>
                    <div class="col-md-6">
                        <ul class="list-unstyled">
                            <li>Búsqueda parcial: <code>LIKE '%García%'</code></li>
                            <li>Empieza con: <code>LIKE 'A%'</code></li>
                            <li>Termina con: <code>LIKE '%Z'</code></li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    `;
  filtersContainer.appendChild(helpCard);
  */

  // Usar solo los campos filtrables si están definidos y no vacíos
  let filterColumns = columns;
  if (Array.isArray(filterableColumns) && filterableColumns.length > 0) {
    filterColumns = filterableColumns;
  }

  // Contenedor para los filtros
  const filtersDiv = document.createElement("div");
  filtersDiv.classList.add("card", "mb-3");
  filtersDiv.innerHTML = `
        <div class="card-header d-flex justify-content-between align-items-center">
            <h6 class="mb-0"><i class="bi bi-funnel"></i> Filtros</h6>
            <button type="button" class="btn btn-sm btn-link" data-bs-toggle="collapse" data-bs-target="#predefinedFiltersCollapse" aria-expanded="false" aria-controls="predefinedFiltersCollapse">
                <i class="bi bi-chevron-right"></i>
            </button>
        </div>
        <div class="card-body collapse" id="predefinedFiltersCollapse">
            <div class="row g-3" id="filter-inputs-container">
                ${filterColumns
                  .map(
                    (column) => `
                    <div class="col-md-12 filter-field-group" data-column="${column}">
                        <label class="form-label d-flex align-items-center justify-content-between">
                          <span>${column}</span>
                          ${
                            Array.isArray(multiselectFilterColumns) &&
                            multiselectFilterColumns.includes(column)
                              ? `<button type="button" class="btn btn-sm ms-2 filter-multiselect-btn" data-column="${column}" title="Seleccionar valores">
                                <i class="bi bi-caret-down-square"></i>
                              </button>`
                              : ""
                          }
                        </label>
                        <input type="text" 
                               class="form-control form-control-sm filter-input" 
                               placeholder="Ej: 40428751,40638155 - Juan, Jorge"
                               data-column="${column}">
                        <div class="multiselect-dropdown-container" style="display:none; position:relative; z-index:10;"></div>
                    </div>
                `
                  )
                  .join("")}
            </div>
        </div>
    `;
  filtersContainer.appendChild(filtersDiv);
  
  // Nuevo componente para Order By
  const orderByDiv = document.createElement("div");
  orderByDiv.classList.add("card", "mb-3");
  orderByDiv.innerHTML = `
        <div class="card-header d-flex justify-content-between align-items-center">
            <h6 class="mb-0"><i class="bi bi-sort-alpha-down"></i> Ordenamiento</h6>
            <button type="button" class="btn btn-sm btn-link" data-bs-toggle="collapse" data-bs-target="#orderByCollapse" aria-expanded="false">
                <i class="bi bi-chevron-right"></i>
            </button>
        </div>
        <div class="card-body collapse" id="orderByCollapse">
            <div class="row g-3">
                <div class="col-md-12">
                    <label class="form-label">Ordenar por columna</label>
                    <select class="form-select form-select-sm" id="orderByColumn">
                        <option value="">Sin ordenamiento</option>
                        ${columns.map(column => `<option value="${column}">${column}</option>`).join('')}
                    </select>
                </div>
                <div class="col-md-12">
                    <div class="form-check form-check-inline">
                        <input class="form-check-input" type="radio" name="orderDirection" id="orderAsc" value="ASC" checked>
                        <label class="form-check-label" for="orderAsc">
                            <i class="bi bi-sort-alpha-down"></i> Ascendente
                        </label>
                    </div>
                    <div class="form-check form-check-inline">
                        <input class="form-check-input" type="radio" name="orderDirection" id="orderDesc" value="DESC">
                        <label class="form-check-label" for="orderDesc">
                            <i class="bi bi-sort-alpha-up"></i> Descendente
                        </label>
                    </div>
                </div>
            </div>
        </div>
    `;
  filtersContainer.appendChild(orderByDiv);

  // Agregar evento para cambiar el ícono cuando se expande/colapsa
  const filterExamples = document.getElementById("filterExamples");
  if (filterExamples) {
    filterExamples.addEventListener("show.bs.collapse", function () {
      const toggleButton = document.querySelector(
        '[data-bs-target="#filterExamples"] i'
      );
      if (toggleButton) {
        toggleButton.classList.remove("bi-chevron-right");
        toggleButton.classList.add("bi-chevron-down");
      }
    });

    filterExamples.addEventListener("hide.bs.collapse", function () {
      const toggleButton = document.querySelector(
        '[data-bs-target="#filterExamples"] i'
      );
      if (toggleButton) {
        toggleButton.classList.remove("bi-chevron-down");
        toggleButton.classList.add("bi-chevron-right");
      }
    });
  }

  // Evento para cambiar el ícono de la flecha de los filtros
  const predefinedFiltersCollapse = document.getElementById(
    "predefinedFiltersCollapse"
  );
  if (predefinedFiltersCollapse) {
    predefinedFiltersCollapse.addEventListener("show.bs.collapse", function () {
      const toggleButton = document.querySelector(
        '[data-bs-target="#predefinedFiltersCollapse"] i'
      );
      if (toggleButton) {
        toggleButton.classList.remove("bi-chevron-right");
        toggleButton.classList.add("bi-chevron-down");
      }
    });
    predefinedFiltersCollapse.addEventListener("hide.bs.collapse", function () {
      const toggleButton = document.querySelector(
        '[data-bs-target="#predefinedFiltersCollapse"] i'
      );
      if (toggleButton) {
        toggleButton.classList.remove("bi-chevron-down");
        toggleButton.classList.add("bi-chevron-right");
      }
    });
  }
  
  // Evento para cambiar el ícono de la flecha del ordenamiento
  const orderByCollapse = document.getElementById("orderByCollapse");
  if (orderByCollapse) {
    orderByCollapse.addEventListener("show.bs.collapse", function () {
      const toggleButton = document.querySelector(
        '[data-bs-target="#orderByCollapse"] i'
      );
      if (toggleButton) {
        toggleButton.classList.remove("bi-chevron-right");
        toggleButton.classList.add("bi-chevron-down");
      }
    });
    orderByCollapse.addEventListener("hide.bs.collapse", function () {
      const toggleButton = document.querySelector(
        '[data-bs-target="#orderByCollapse"] i'
      );
      if (toggleButton) {
        toggleButton.classList.remove("bi-chevron-down");
        toggleButton.classList.add("bi-chevron-right");
      }
    });
  }

  // Lógica para el multi-select dinámico
  setTimeout(() => {
    const queryName = document.getElementById("predefinedQuerySelect")?.value;
    document.querySelectorAll(".filter-multiselect-btn").forEach((btn) => {
      btn.addEventListener("click", async function (e) {
        e.preventDefault();
        const column = btn.getAttribute("data-column");
        const group = btn.closest(".filter-field-group");
        const dropdown = group.querySelector(".multiselect-dropdown-container");
        // Toggle visibilidad
        if (dropdown.style.display === "block") {
          dropdown.style.display = "none";
          return;
        }
        // Cerrar otros dropdowns
        document
          .querySelectorAll(".multiselect-dropdown-container")
          .forEach((d) => (d.style.display = "none"));
        dropdown.innerHTML =
          '<div class="text-center py-2"><span class="spinner-border spinner-border-sm"></span> Cargando...</div>';
        dropdown.style.display = "block";
        try {
          const response = await fetch("/api/unique_filter_values", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query_name: queryName, column }),
          });
          const data = await response.json();
          if (!response.ok)
            throw new Error(data.error || "Error al obtener valores únicos");
          // Renderizar el select multiple con input de búsqueda
          dropdown.innerHTML = `
            <input type="text" class="form-control form-control-sm mb-2 multiselect-search" placeholder="Buscar...">
            <select multiple class="form-select form-select-sm multiselect-select" size="8" style="min-width:320px;max-width:100%;overflow-x:auto;">
              ${data.values
                .map((v) => `<option value="${v}">${v}</option>`)
                .join("")}
            </select>
            <div class="d-flex justify-content-end mt-1">
              <button type="button" class="btn btn-sm btn-primary apply-multiselect">Aplicar</button>
              <button type="button" class="btn btn-sm btn-link ms-2 close-multiselect">Cerrar</button>
            </div>
          `;
          // Agregar tooltip a cada opción
          const select = dropdown.querySelector(".multiselect-select");
          if (select) {
            Array.from(select.options).forEach((opt) => {
              opt.title = opt.value;
            });
            // Eliminar el evento mousedown personalizado para permitir selección nativa
          }
          // Agregar autocompletado al input de búsqueda
          const searchInput = dropdown.querySelector(".multiselect-search");
          if (searchInput && select) {
            searchInput.addEventListener("input", function () {
              const filter = searchInput.value.toLowerCase();
              Array.from(select.options).forEach((opt) => {
                opt.style.display = opt.value.toLowerCase().includes(filter)
                  ? ""
                  : "none";
              });
            });
          }
          // Aplicar selección
          dropdown.querySelector(".apply-multiselect").onclick = function () {
            const select = dropdown.querySelector(".multiselect-select");
            const selected = Array.from(select.selectedOptions).map(
              (opt) => opt.value
            );
            const input = group.querySelector(".filter-input");
            if (selected.length > 0) {
              input.value = selected.join(",");
              input.title = input.value; // Tooltip con el valor completo
            } else {
              input.value = "";
              input.title = "";
            }
            dropdown.style.display = "none";
          };
          // Cerrar
          dropdown.querySelector(".close-multiselect").onclick = function () {
            dropdown.style.display = "none";
          };
        } catch (err) {
          dropdown.innerHTML = `<div class='text-danger p-2'>${err.message}</div>`;
        }
      });
    });
    // Cerrar el dropdown si se hace click fuera
    document.addEventListener("click", function (e) {
      document
        .querySelectorAll(".multiselect-dropdown-container")
        .forEach((dropdown) => {
          const btn = dropdown.parentElement.querySelector(
            ".filter-multiselect-btn"
          );
          if (
            !dropdown.contains(e.target) &&
            !(btn && btn.contains(e.target))
          ) {
            dropdown.style.display = "none";
          }
        });
    });
    // Agregar tooltip al input de filtro multi-select
    document.querySelectorAll(".filter-input").forEach((input) => {
      input.addEventListener("input", function () {
        input.title = input.value;
      });
      // Inicializar el tooltip con el valor actual
      input.title = input.value;
    });
  }, 0);
}

async function downloadPredefinedQueryExcel() {
  const queryName = document.getElementById("predefinedQuerySelect").value;
  if (!queryName) {
    showToast("Error", "Por favor, selecciona una consulta.", "error");
    return;
  }

  try {
    // Show loading overlay
    document.getElementById("loading-overlay").classList.remove("d-none");
    
    // Recoger los filtros del nuevo contenedor
    const filters = {};
    const filterInputs = document.querySelectorAll(
      "#filter-inputs-container input"
    );
    filterInputs.forEach((input) => {
      const column = input.getAttribute("data-column");
      if (column && input.value.trim()) {
        filters[column] = input.value.trim();
      }
    });

    // Recoger los parámetros de ordenamiento
    const orderByColumn = document.getElementById("orderByColumn")?.value;
    const orderDirection = document.querySelector('input[name="orderDirection"]:checked')?.value || 'ASC';
    
    const requestData = {
      query_name: queryName,
      filters: filters,
    };
    
    // Agregar parámetros de ordenamiento si se ha seleccionado una columna
    if (orderByColumn) {
      requestData.order_by = {
        column: orderByColumn,
        direction: orderDirection
      };
    }

    showToast("Información", "Generando Excel, por favor espere...", "info");

    const response = await fetch(
      `${baseApiUrl}/api/download_predefined_query_excel`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      }
    );

    if (!response.ok) {
      let errorMsg = "Error al descargar Excel";
      try {
        const errorData = await response.json();
        errorMsg = errorData.error || errorMsg;
      } catch (e) {
        // Si no se puede parsear la respuesta, usar mensaje genérico
      }
      throw new Error(errorMsg);
    }

    // Crear un blob desde la respuesta
    const blob = await response.blob();
    // Crear un objeto URL para el blob
    const url = window.URL.createObjectURL(blob);
    // Crear un elemento <a> para descargar
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    // Extraer nombre de archivo de la cabecera Content-Disposition si existe
    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = "consulta.xlsx";
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1];
      }
    }
    a.download = filename;
    // Añadir al DOM y hacer clic
    document.body.appendChild(a);
    a.click();
    // Limpiar
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    showToast("Éxito", "Excel generado correctamente", "success");
  } catch (error) {
    console.error("Error al descargar Excel:", error);
    showToast("Error", error.message, "error");
  } finally {
    // Hide loading overlay
    document.getElementById("loading-overlay").classList.add("d-none");
  }
}

// Modificar el Event Listener para el cambio de consulta predefinida
document
  .getElementById("predefinedQuerySelect")
  ?.addEventListener("change", async () => {
    const queryName = document.getElementById("predefinedQuerySelect").value;
    if (queryName) {
      try {
        // Solo ejecutar una consulta inicial para obtener las columnas
        const response = await fetch(
          `${baseApiUrl}/api/execute_predefined_query`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              query_name: queryName,
              page: 1,
              page_size: 1,
              only_columns: true // Indicar que solo queremos las columnas
            }),
          }
        );

        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        if (data.error) throw new Error(data.error);

        // Limpiar la tabla y mostrar mensaje
        const tableContainer = document.getElementById("table-container");
        tableContainer.innerHTML =
          '<div class="alert alert-info">Configure los filtros deseados y presione "Ejecutar Consulta" para ver los resultados.</div>';

        // Limpiar el contador de registros
        document.getElementById("record-count").innerText = "";

        // Renderizar los filtros con las columnas obtenidas
        if (data.columns) {
          renderPredefinedQueryFilters(
            data.columns,
            data.filterable_columns,
            data.multiselect_filter_columns
          );
        }
      } catch (error) {
        console.error("Error:", error);
        showToast("Error", error.message, "error");
      }
    }
  });

// Evento de búsqueda
const searchButton = document.getElementById("searchButton");
if (searchButton) {
  searchButton.onclick = () => fetchTableData(true);
} else {
  console.warn("Elemento searchButton no encontrado");
}

// Función para obtener la estructura de la tabla
async function getTableStructure(queryName) {
  try {
    console.log(`Obteniendo estructura para consulta: ${queryName}`);
    const response = await fetch(`${baseApiUrl}/api/get_table_structure`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query_name: queryName }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage =
        errorData.error || `Error del servidor: ${response.status}`;
      console.error("Error del servidor:", errorData);
      showToast("Error", errorMessage, "error");
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log("Estructura de tabla obtenida:", data);
    return data;
  } catch (error) {
    console.error("Error al obtener estructura de tabla:", error);
    let errorMessage =
      error.message || "Error desconocido al obtener la estructura de la tabla";
    if (error.message.includes("404")) {
      errorMessage =
        "El endpoint no se encuentra. Verifique que el servidor esté actualizado a la última versión.";
    } else if (error.message.includes("500")) {
      errorMessage =
        "Error interno del servidor. Verifique los logs para más detalles.";
    }
    showToast("Error", errorMessage, "error");
    return null;
  }
}

// Función para mostrar el modal de nueva entrada
async function showNewEntryModal() {
  const queryName = document.getElementById("predefinedQuerySelect").value;
  if (!queryName) {
    showToast("Error", "Por favor, selecciona una consulta primero", "error");
    return;
  }

  try {
    // Mostrar un indicador de carga
    showToast("Info", "Cargando estructura de tabla...", "info");

    // Obtener estructura de la tabla
    const structureData = await getTableStructure(queryName);
    if (!structureData) {
      return;
    }

    const { table_name, columns } = structureData;

    // Abrir el modal
    const modal = new bootstrap.Modal(document.getElementById("newEntryModal"));
    const container = document.getElementById("newEntryContainer");
    container.innerHTML = ""; // Limpiar contenedor

    // Actualizar el título del modal con el nombre de la tabla
    document.querySelector(
      "#newEntryModal .modal-title"
    ).innerHTML = `<i class="bi bi-plus-circle"></i> Nuevo Registro en ${table_name}`;

    // Agregar información sobre los campos
    const infoDiv = document.createElement("div");
    infoDiv.className = "alert alert-info mb-3";
    infoDiv.innerHTML = `
            <p class="mb-1"><strong>Información:</strong></p>
            <ul class="mb-0">
                <li>Los campos marcados con * son obligatorios</li>
                <li>Los campos marcados con 🔍 son visibles en la consulta actual</li>
                <li>Los campos ID suelen ser autogenerados por la base de datos</li>
            </ul>
        `;
    container.appendChild(infoDiv);

    // Crear campos basados en la estructura de la tabla
    columns.forEach((column) => {
      // No mostrar campos identity (autogenerados)
      if (column.is_identity) {
        return;
      }

      const div = document.createElement("div");
      div.className = "mb-3";

      // Construir la etiqueta con información adicional
      let labelText = column.name;
      if (column.required) {
        labelText += " *";
      }
      if (column.visible_in_query) {
        labelText += " 🔍";
      }

      // Agregar información del tipo de datos
      const typeInfo = `<small class="text-muted">(${column.type})</small>`;

      div.innerHTML = `
                <label class="form-label">${labelText} ${typeInfo}</label>
                <input type="text" 
                       class="form-control${
                         column.required ? " required" : ""
                       }" 
                       data-column="${column.name}"
                       data-type="${column.type}"
                       ${column.required ? "required" : ""}
                       placeholder="${getPlaceholderForType(column.type)}">
                <div class="invalid-feedback">Este campo es obligatorio</div>
            `;
      container.appendChild(div);
    });

    // Si no hay campos editables, mostrar mensaje
    if (container.querySelectorAll("input").length === 0) {
      container.innerHTML = `
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-triangle"></i>
                    No hay campos editables en esta tabla. Es posible que todos los campos sean autogenerados.
                </div>
            `;
    }

    modal.show();
  } catch (error) {
    console.error("Error:", error);
    showToast("Error", error.message, "error");
  }
}

// Función para generar placeholders según el tipo de datos
function getPlaceholderForType(type) {
  type = type.toLowerCase();
  if (type.includes("int")) return "Número entero (123)";
  if (type.includes("decimal") || type.includes("numeric"))
    return "Número decimal (123.45)";
  if (type.includes("char") || type.includes("text")) return "Texto";
  if (type.includes("date")) return "Fecha (YYYY-MM-DD)";
  if (type.includes("datetime")) return "Fecha y hora (YYYY-MM-DD HH:MM:SS)";
  if (type === "bit") return "Booleano (1 o 0)";
  return "Valor";
}

// Función para crear nueva entrada
async function createNewEntry() {
  const queryName = document.getElementById("predefinedQuerySelect").value;
  if (!queryName) {
    showToast("Error", "No se pudo identificar la consulta", "error");
    return;
  }

  // Validar campos requeridos
  const requiredInputs = document.querySelectorAll(
    "#newEntryContainer input.required"
  );
  let isValid = true;

  requiredInputs.forEach((input) => {
    if (!input.value.trim()) {
      input.classList.add("is-invalid");
      isValid = false;
    } else {
      input.classList.remove("is-invalid");
    }
  });

  if (!isValid) {
    showToast(
      "Error",
      "Por favor, complete todos los campos obligatorios",
      "error"
    );
    return;
  }

  // Recopilar datos del formulario
  const inputs = document.querySelectorAll("#newEntryContainer input");
  const newRow = {};

  inputs.forEach((input) => {
    // Solo incluir campos con valores
    if (input.value.trim() || input.required) {
      newRow[input.dataset.column] = input.value.trim();
    }
  });

  try {
    // Mostrar indicador de carga
    const submitButton = document.querySelector(
      "#newEntryModal button.btn-success"
    );
    const originalText = submitButton.innerHTML;
    submitButton.innerHTML =
      '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...';
    submitButton.disabled = true;

    const response = await fetch(`${baseApiUrl}/api/add_entry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query_name: queryName,
        newRow: newRow,
      }),
    });

    const data = await response.json();

    // Restaurar botón
    submitButton.innerHTML = originalText;
    submitButton.disabled = false;

    if (!response.ok) {
      throw new Error(data.error || "Error al crear entrada");
    }

    showToast("Éxito", "Registro creado correctamente", "success");
    const modal = bootstrap.Modal.getInstance(
      document.getElementById("newEntryModal")
    );
    modal.hide();

    // Recargar los datos
    await fetchPredefinedQueryData(currentPage, false);
  } catch (error) {
    console.error("Error:", error);
    showToast("Error", error.message, "error");
  }
}

// Función para hacer editable un campo individual
function makeFieldEditable(cell) {
  // Guardar el valor original directamente como propiedad del elemento
  // y también como atributo de datos (respaldo doble)
  const originalValue = cell.textContent;
  cell._originalValue = originalValue;

  // Asegurarse de que los atributos necesarios estén establecidos
  if (!cell.hasAttribute("data-original-value")) {
    cell.setAttribute("data-original-value", originalValue);
  }

  // Verificar que el nombre de la columna esté disponible
  const column = cell.getAttribute("data-column");
  if (!column) {
    showToast("Error", "No se pudo determinar la columna a editar", "error");
    return;
  }

  // Verificar que los datos de la fila estén disponibles
  if (!cell.hasAttribute("data-row")) {
    showToast(
      "Error",
      "No se pudieron obtener los datos completos de la fila",
      "error"
    );
    return;
  }

  console.log("Haciendo celda editable:", { column, originalValue });

  // Crear input para editar
  const input = document.createElement("input");
  input.type = "text";
  input.value = originalValue;
  input.classList.add("form-control", "form-control-sm");

  // Limpiar la celda y agregar input
  cell.innerHTML = "";
  cell.appendChild(input);
  input.focus();

  // Agregar botones de confirmación/cancelación
  const buttonGroup = document.createElement("div");
  buttonGroup.classList.add("d-flex", "mt-1");

  const saveButton = document.createElement("button");
  saveButton.classList.add("btn", "btn-success", "btn-sm", "me-1");
  saveButton.innerHTML = '<i class="bi bi-check"></i>';
  saveButton.addEventListener("click", function () {
    saveField(cell, input.value);
  });

  const cancelButton = document.createElement("button");
  cancelButton.classList.add("btn", "btn-secondary", "btn-sm");
  cancelButton.innerHTML = '<i class="bi bi-x"></i>';
  cancelButton.addEventListener("click", function () {
    console.log("Botón cancelar cliqueado");
    cancelFieldEdit(cell);
  });

  buttonGroup.appendChild(saveButton);
  buttonGroup.appendChild(cancelButton);
  cell.appendChild(buttonGroup);

  // Permitir guardar al presionar Enter
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      saveField(cell, input.value);
    } else if (e.key === "Escape") {
      cancelFieldEdit(cell);
    }
  });
}

// Función para cancelar la edición de un campo
function cancelFieldEdit(cell) {
  console.log("Cancelando edición de celda");

  // Intentar obtener el valor original de varias fuentes
  let originalValue = "";

  // Primero verificar la propiedad directa
  if (cell._originalValue !== undefined) {
    originalValue = cell._originalValue;
    console.log("Valor original obtenido de propiedad:", originalValue);
  }
  // Luego verificar el atributo de datos
  else if (cell.hasAttribute("data-original-value")) {
    originalValue = cell.getAttribute("data-original-value");
    console.log("Valor original obtenido de atributo:", originalValue);
  }

  // Limpiar la celda
  cell.innerHTML = "";

  // Restaurar el valor original
  cell.textContent = originalValue;
  console.log("Valor restaurado:", cell.textContent);
}

// Función para guardar un campo editado
async function saveField(cell, newValue) {
  const column = cell.getAttribute("data-column");
  if (!column) {
    showToast("Error", "No se pudo determinar la columna a editar", "error");
    cancelFieldEdit(cell);
    return;
  }

  const originalValue =
    cell.getAttribute("data-original-value") || cell._originalValue || "";

  // Obtener los datos de la fila de forma segura
  let rowData;
  try {
    const rowDataAttr = cell.getAttribute("data-row");
    if (!rowDataAttr) {
      showToast("Error", "No se encontraron los datos de la fila", "error");
      cancelFieldEdit(cell);
      return;
    }
    rowData = JSON.parse(rowDataAttr);
  } catch (e) {
    console.error("Error al analizar los datos de la fila:", e);
    showToast("Error", "Error al procesar los datos de la fila", "error");
    cancelFieldEdit(cell);
    return;
  }

  // Si el valor no cambió, solo cancelar la edición
  if (newValue.trim() === originalValue.trim()) {
    cancelFieldEdit(cell);
    return;
  }

  const isConfirmed = confirm(
    `¿Estás seguro de que quieres cambiar "${column}" de "${originalValue}" a "${newValue}"?`
  );
  if (!isConfirmed) {
    cancelFieldEdit(cell);
    return;
  }

  const queryName = document.getElementById("predefinedQuerySelect").value;
  if (!queryName) {
    showToast("Error", "No se pudo identificar la consulta", "error");
    cancelFieldEdit(cell);
    return;
  }

  try {
    // Crear objeto con los valores actualizados (solo este campo)
    const updatedRow = {};
    updatedRow[column] = newValue;

    const response = await fetch(`${baseApiUrl}/api/update_table`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query_name: queryName,
        updatedRow: updatedRow,
        originalValues: rowData,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Error al actualizar");

    if (data.rows_affected === 0) {
      throw new Error("No se actualizó ningún registro");
    }

    // Actualizar la celda con el nuevo valor
    cell.setAttribute("data-original-value", newValue);

    // Actualizar el atributo data-row con el nuevo valor
    rowData[column] = newValue;
    cell.setAttribute("data-row", JSON.stringify(rowData));

    cell.innerHTML = "";
    cell.textContent = newValue;

    showToast(
      "Éxito",
      `${data.message} (${data.rows_affected} registro(s) actualizado(s))`,
      "success"
    );
  } catch (error) {
    console.error("Error:", error);
    showToast("Error", error.message, "error");
    cancelFieldEdit(cell);
  }
}

// Función para formatear fechas
function formatDateTime(dateTimeString) {
  if (!dateTimeString) return "-";

  try {
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) return dateTimeString; // Si no es una fecha válida, mostrar original

    // Formatear: DD/MM/YYYY HH:MM:SS
    return date.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch (error) {
    console.error("Error al formatear fecha:", error);
    return dateTimeString;
  }
}

// Función para obtener registros de auditoría
async function fetchAuditRecords(page = 1, pageSize = 10) {
  try {
    // Guardar la página actual
    currentAuditPage = page;
    auditPageSize = pageSize;

    // Obtener filtros
    const filters = {
      usuario: document.getElementById("audit-filter-user").value,
      accion: document.getElementById("audit-filter-action").value,
      tabla: document.getElementById("audit-filter-table").value,
      fecha: document.getElementById("audit-filter-date").value,
    };

    // Realizar petición al servidor
    const response = await fetch("/api/audit/records", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        page: page,
        page_size: pageSize,
        filters: filters,
      }),
    });

    if (!response.ok) {
      throw new Error("Error al obtener los registros de auditoría");
    }

    const data = await response.json();

    // Actualizar paginación
    totalAuditPages = data.total_pages;
    updateAuditPagination(data.page, data.page_size, data.total);

    // Renderizar tabla
    renderAuditTable(data.records);
  } catch (error) {
    console.error("Error:", error);
    showToast("Error", error.message, "danger");
  }
}

// Función para renderizar la tabla de auditoría
function renderAuditTable(records) {
  const container = document.getElementById("audit-table-container");

  if (!records || records.length === 0) {
    container.innerHTML =
      '<div class="alert alert-info">No se encontraron registros de auditoría.</div>';
    return;
  }

  // Crear tabla HTML
  let tableHTML = `
        <table class="table table-striped table-hover table-sm">
            <thead class="table-light">
                <tr>
                    <th>ID</th>
                    <th>Fecha</th>
                    <th>Usuario</th>
                    <th>Acción</th>
                    <th>Tabla Afectada</th>
                    <th>IP</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;

  // Agregar filas
  records.forEach((record) => {
    const fecha = formatDateTime(record.Fecha);
    const accionBadge = getBadgeClassForAction(record.Accion);

    tableHTML += `
            <tr>
                <td>${record.ID}</td>
                <td>${fecha}</td>
                <td>${record.Usuario}</td>
                <td><span class="badge ${accionBadge}">${
      record.Accion
    }</span></td>
                <td>${record.TablaAfectada}</td>
                <td>${record.IP || "-"}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="showAuditDetails(
                        '${record.ID}', 
                        '${record.TablaAfectada}', 
                        '${record.Accion}', 
                        ${JSON.stringify(record.DatosAnteriores || "").replace(
                          /"/g,
                          "&quot;"
                        )}, 
                        ${JSON.stringify(record.DatosNuevos || "").replace(
                          /"/g,
                          "&quot;"
                        )}
                    )">
                        <i class="bi bi-eye"></i> Ver
                    </button>
                </td>
            </tr>
        `;
  });

  tableHTML += `
            </tbody>
        </table>
    `;

  container.innerHTML = tableHTML;
}

// Función para mostrar detalles de un registro de auditoría
function showAuditDetails(auditId, tableName, action, oldData, newData) {
  let detailsHTML = `
        <h6 class="mb-3">ID: ${auditId} - Tabla: ${tableName}</h6>
    `;

  try {
    if (action === "INSERT") {
      detailsHTML += `<h6 class="text-success mb-3">Datos Insertados:</h6>`;
      detailsHTML += renderJsonData(newData);
    } else if (action === "DELETE") {
      detailsHTML += `<h6 class="text-danger mb-3">Datos Eliminados:</h6>`;
      detailsHTML += renderJsonData(oldData);
    } else if (action === "UPDATE") {
      // Para actualizaciones, mostrar una comparación
      detailsHTML += `<h6 class="text-primary mb-3">Comparación de Datos:</h6>`;

      const oldObj =
        typeof oldData === "string" ? JSON.parse(oldData) : oldData;
      const newObj =
        typeof newData === "string" ? JSON.parse(newData) : newData;

      // Crear tabla comparativa
      detailsHTML += `
                <table class="table table-sm table-bordered">
                    <thead class="table-light">
                        <tr>
                            <th>Campo</th>
                            <th>Valor Anterior</th>
                            <th>Valor Nuevo</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

      // Unir todas las claves de ambos objetos
      const allKeys = new Set([
        ...Object.keys(oldObj || {}),
        ...Object.keys(newObj || {}),
      ]);

      allKeys.forEach((key) => {
        const oldValue =
          oldObj && oldObj[key] !== undefined ? oldObj[key] : "(No existía)";
        const newValue =
          newObj && newObj[key] !== undefined ? newObj[key] : "(Eliminado)";

        // Destacar las filas con cambios
        const isChanged = JSON.stringify(oldValue) !== JSON.stringify(newValue);
        const rowClass = isChanged ? "table-warning" : "";

        detailsHTML += `
                    <tr class="${rowClass}">
                        <td><strong>${key}</strong></td>
                        <td>${oldValue}</td>
                        <td>${newValue}</td>
                    </tr>
                `;
      });

      detailsHTML += `
                    </tbody>
                </table>
            `;
    }
  } catch (error) {
    console.error("Error al mostrar detalles:", error);
    detailsHTML += `<div class="alert alert-danger">Error al procesar los datos: ${error.message}</div>`;
  }

  document.getElementById("audit-details-container").innerHTML = detailsHTML;

  // Mostrar modal de detalles
  const detailsModal = new bootstrap.Modal(
    document.getElementById("auditDetailsModal")
  );
  detailsModal.show();
}

// Función para renderizar datos JSON
function renderJsonData(data) {
  if (!data)
    return '<div class="alert alert-warning">No hay datos disponibles</div>';

  try {
    const jsonObj = typeof data === "string" ? JSON.parse(data) : data;

    let html = `
            <table class="table table-sm table-bordered">
                <thead class="table-light">
                    <tr>
                        <th>Campo</th>
                        <th>Valor</th>
                    </tr>
                </thead>
                <tbody>
        `;

    Object.entries(jsonObj).forEach(([key, value]) => {
      html += `
                <tr>
                    <td><strong>${key}</strong></td>
                    <td>${value}</td>
                </tr>
            `;
    });

    html += `
                </tbody>
            </table>
        `;

    return html;
  } catch (error) {
    console.error("Error al renderizar JSON:", error);
    if (typeof data === "string") {
      return `<pre class="bg-light p-3">${data}</pre>`;
    } else {
      return `<div class="alert alert-warning">Datos no disponibles</div>`;
    }
  }
}

// Función para obtener clase de badge según el tipo de acción
function getBadgeClassForAction(action) {
  switch (action) {
    case "INSERT":
      return "bg-success";
    case "UPDATE":
      return "bg-primary";
    case "DELETE":
      return "bg-danger";
    default:
      return "bg-secondary";
  }
}

// Funciones de paginación para registros de auditoría
function loadNextAuditPage() {
  if (currentAuditPage < totalAuditPages) {
    fetchAuditRecords(currentAuditPage + 1, auditPageSize);
  }
}

function loadPreviousAuditPage() {
  if (currentAuditPage > 1) {
    fetchAuditRecords(currentAuditPage - 1, auditPageSize);
  }
}

// Actualizar información de paginación
function updateAuditPagination(currentPage, pageSize, totalRecords) {
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalRecords);

  document.getElementById(
    "audit-pagination-info"
  ).innerHTML = `Mostrando ${start} a ${end} de ${totalRecords} registros`;
}

// Limpiar filtros de auditoría
function clearAuditFilters() {
  document.getElementById("audit-filter-user").value = "";
  document.getElementById("audit-filter-action").value = "";
  document.getElementById("audit-filter-table").value = "";
  document.getElementById("audit-filter-date").value = "";

  // Recargar datos
  fetchAuditRecords(1);
}

// Función para descargar registros de auditoría en Excel
async function downloadAuditExcel() {
  try {
    // Mostrar mensaje de carga
    showToast("Procesando", "Generando archivo Excel...", "info");

    // Obtener filtros actuales
    const filters = {
      usuario: document.getElementById("audit-filter-user").value,
      accion: document.getElementById("audit-filter-action").value,
      tabla: document.getElementById("audit-filter-table").value,
      fecha: document.getElementById("audit-filter-date").value,
    };

    // Realizar petición al servidor
    const response = await fetch("/api/audit/excel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        filters: filters,
      }),
    });

    if (!response.ok) {
      throw new Error("Error al generar el archivo Excel");
    }

    // Procesar respuesta como blob
    const blob = await response.blob();

    // Generar nombre de archivo
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .substring(0, 19);
    const filename = `Registros_Auditoria_${timestamp}.xlsx`;

    // Descargar archivo
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);

    showToast("Éxito", "Archivo Excel generado correctamente", "success");
  } catch (error) {
    console.error("Error:", error);
    showToast("Error", error.message, "danger");
  }
}

// Función para ejecutar consulta predefinida
async function executePredefinedQuery(queryName, page = 1, pageSize = 100) {
  try {
    showLoading();

    // Guardar la consulta actual para posibles actualizaciones posteriores
    currentQuery = queryName;
    currentPage = page;

    const response = await fetch("/api/execute_predefined_query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query_name: queryName,
        page: page,
        page_size: pageSize,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      // Actualizar variables de paginación global
      totalPages = data.total_pages || 1;

      // Añadir la bandera de editable basada en el nombre de la consulta
      // Las consultas que comienzan con "Consulta" son editables
      data.isEditable = queryName.startsWith("Consulta");

      // Renderizar la tabla con los datos y metadatos de columnas editables
      renderTable(data);

      // Mostrar los controles de paginación si hay más de una página
      if (data.total_pages > 1) {
        document.getElementById("pagination-controls").style.display = "block";
        document.getElementById("current-page").textContent = page;
        document.getElementById("total-pages").textContent = data.total_pages;
        document.getElementById("prev-page").disabled = page <= 1;
        document.getElementById("next-page").disabled =
          page >= data.total_pages;
      } else {
        document.getElementById("pagination-controls").style.display = "none";
      }
    } else {
      showError(`Error: ${data.error}`);
    }
  } catch (error) {
    console.error("Error executing predefined query:", error);
    showError("Error en la comunicación con el servidor");
  } finally {
    hideLoading();
  }
}

// Función para enviar la información del usuario del cliente
async function sendClientUserInfo(username, hostname) {
  try {
    // Si no se proporciona username, intentar usar el valor guardado
    if (!username) {
      username = localStorage.getItem("clientUsername") || "Usuario Web";
    }
    
    // Usar navigator.platform como hostname por defecto
    if (!hostname) {
      hostname = navigator.platform || "Web Client";
    }

    // Enviar la información al servidor
    const response = await fetch("/api/set_client_user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: username,
        hostname: hostname,
      }),
    });

    if (response.ok) {
      console.log("Información de usuario enviada correctamente");
    } else {
      console.error("Error al enviar información de usuario");
      showToast(
        "Error",
        "No se pudo configurar la identificación de usuario",
        "error",
        false,
        3000
      );
    }
  } catch (error) {
    console.error("Error en sendClientUserInfo:", error);
  }
}
