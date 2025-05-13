# Sistema de Consultas SQL

Un sistema web para ejecutar, visualizar y exportar consultas SQL predefinidas con capacidades de filtrado, paginación y edición de datos.

## Índice
1. [Descripción General](#descripción-general)
2. [Características](#características)
3. [Arquitectura](#arquitectura)
4. [Instalación](#instalación)
5. [Uso](#uso)
6. [Funciones Principales](#funciones-principales)
7. [Posibles Modificaciones](#posibles-modificaciones)
8. [API Endpoints](#api-endpoints)
9. [Estructura de Archivos](#estructura-de-archivos)
10. [Solución de Problemas](#solución-de-problemas)

## Descripción General

El Sistema de Consultas SQL es una aplicación web desarrollada con Flask (backend) y JavaScript/Bootstrap (frontend) que permite a los usuarios ejecutar consultas SQL predefinidas contra servidores SQL Server, visualizar los resultados en formato tabular, aplicar filtros avanzados, exportar a Excel y realizar operaciones CRUD básicas en los datos cuando corresponda.

La aplicación está diseñada para facilitar el acceso a datos de bases de datos SQL Server sin necesidad de conocimientos avanzados de SQL, permitiendo a usuarios no técnicos ejecutar consultas complejas predefinidas y trabajar con los resultados.

## Características

- **Consultas Predefinidas**: Ejecución de consultas SQL almacenadas en un archivo JSON
- **Filtrado Avanzado**: Aplicación de filtros complejos a las consultas (=, >, <, LIKE, IN, etc.)
- **Paginación**: Navegación por grandes conjuntos de resultados
- **Exportación a Excel**: Descarga de resultados en formato Excel
- **Edición de Datos**: Modificación de celdas individuales (en consultas marcadas como editables)
- **Registro de Auditoría**: Seguimiento de cambios realizados en los datos
- **Soporte para CTEs**: Manejo especial para consultas con Common Table Expressions
- **Multiselección**: Filtros con selección múltiple de valores únicos
- **Ordenamiento**: Ordenar resultados por columnas específicas
- **Interfaz Responsiva**: Diseño adaptable a diferentes dispositivos

## Arquitectura

### Backend (Python/Flask)
- **Flask**: Framework web para el backend
- **pyodbc**: Conexión a bases de datos SQL Server
- **openpyxl**: Generación de archivos Excel

### Frontend (JavaScript/Bootstrap)
- **Bootstrap 5**: Framework CSS para la interfaz de usuario
- **JavaScript puro**: Lógica del cliente sin frameworks adicionales
- **Fetch API**: Comunicación con el backend

### Base de Datos
- **SQL Server**: Almacenamiento de datos y ejecución de consultas
- **Tablas de Auditoría**: Registro de cambios en los datos

## Instalación

### Requisitos
- Python 3.8+
- SQL Server
- Bibliotecas Python (ver `requirements.txt`)

### Pasos de Instalación

1. Clonar el repositorio:
```bash
git clone <url-del-repositorio>
cd sistema-consultas-sql
```

2. Crear y activar un entorno virtual:
```bash
python -m venv venv
# En Windows
venv\Scripts\activate
# En Linux/Mac
source venv/bin/activate
```

3. Instalar dependencias:
```bash
pip install -r requirements.txt
```

4. Configurar la conexión a la base de datos en la interfaz de la aplicación.

5. Ejecutar la aplicación:
```bash
python app.py
```

## Uso

### Ejecutar una Consulta Predefinida
1. Seleccionar una consulta del menú desplegable
2. Aplicar filtros si es necesario
3. Hacer clic en "Ejecutar Consulta"
4. Ver los resultados en la tabla

### Exportar a Excel
1. Seleccionar una consulta y aplicar filtros si es necesario
2. Hacer clic en "Exportar a Excel"
3. Guardar el archivo generado

### Editar Datos
1. Ejecutar una consulta que tenga columnas editables
2. Hacer clic en una celda editable
3. Modificar el valor y confirmar el cambio

### Ver Registros de Auditoría
1. Hacer clic en "Registro de Auditoría" en la barra de navegación
2. Aplicar filtros si es necesario
3. Explorar los cambios realizados

## Funciones Principales

### Backend (app.py)

#### Gestión de Conexiones
- `get_db_connection()`: Establece conexión con la base de datos SQL Server
- `with_db_connection`: Decorador para manejar conexiones automáticamente

#### Consultas Predefinidas
- `load_predefined_queries()`: Carga consultas desde el archivo JSON
- `save_predefined_queries()`: Guarda consultas en el archivo JSON
- `execute_predefined_query()`: Ejecuta una consulta predefinida con filtros y paginación

#### Manejo de CTEs
- `split_cte_and_select()`: Separa el bloque CTE del SELECT final
- `clean_select_final()`: Limpia y procesa el SELECT final de un CTE

#### Filtrado
- `build_where_clause()`: Construye cláusulas WHERE a partir de filtros
- `unique_filter_values()`: Obtiene valores únicos para filtros de multiselección

#### Exportación
- `download_predefined_query_excel()`: Genera archivos Excel con resultados de consultas

#### Auditoría
- `ensure_audit_table_exists()`: Verifica/crea la tabla de auditoría
- `log_audit_record()`: Registra cambios en la auditoría

### Frontend (script.js)

#### Consultas y Visualización
- `fetchPredefinedQueryData()`: Ejecuta consulta y muestra resultados
- `renderTable()`: Renderiza resultados en formato tabla
- `renderPredefinedQueryFilters()`: Genera interfaz de filtros

#### Edición de Datos
- `makeFieldEditable()`: Habilita edición de una celda
- `saveField()`: Guarda cambios en una celda
- `cancelFieldEdit()`: Cancela edición de una celda

#### Exportación
- `downloadPredefinedQueryExcel()`: Solicita y descarga resultados en Excel

#### Interfaz de Usuario
- `showToast()`: Muestra notificaciones toast
- `updatePaginationControls()`: Actualiza controles de paginación

## Posibles Modificaciones

### Agregar Nuevos Tipos de Filtros
Para agregar un nuevo tipo de filtro (por ejemplo, filtros de fecha con calendario):

1. Modificar `renderPredefinedQueryFilters()` en `script.js` para incluir el nuevo tipo de control
2. Actualizar `build_where_clause()` en `app.py` para procesar el nuevo formato de filtro
3. Añadir la lógica de UI correspondiente en el frontend

### Implementar Nuevos Formatos de Exportación
Para añadir exportación a CSV, PDF u otros formatos:

1. Agregar nuevas dependencias (como `csv`, `reportlab`, etc.)
2. Crear nuevos endpoints en `app.py` (similar a `download_predefined_query_excel()`)
3. Implementar funciones en el frontend para solicitar los nuevos formatos

### Añadir Autenticación de Usuarios
Para implementar un sistema de login:

1. Integrar Flask-Login o una solución similar
2. Crear modelos de usuario y tablas en la base de datos
3. Implementar endpoints para login/logout
4. Añadir middleware de autenticación
5. Actualizar la auditoría para usar información de usuario autenticado

### Personalizar Temas Visuales
Para cambiar el aspecto visual:

1. Modificar `style.css` para ajustar colores, fuentes, etc.
2. Actualizar las clases de Bootstrap en `index.html`
3. Implementar un selector de temas (claro/oscuro)

## API Endpoints

### Consultas Predefinidas
- `GET /api/queries`: Obtiene todas las consultas predefinidas
- `POST /api/queries`: Añade una nueva consulta
- `PUT /api/queries/<name>`: Actualiza una consulta existente
- `DELETE /api/queries/<name>`: Elimina una consulta

### Ejecución de Consultas
- `POST /api/execute_predefined_query`: Ejecuta una consulta con filtros y paginación
- `POST /api/download_predefined_query_excel`: Descarga resultados en Excel
- `POST /api/unique_filter_values`: Obtiene valores únicos para filtros

### Gestión de Datos
- `POST /api/update_table`: Actualiza un registro
- `POST /api/add_entry`: Añade un nuevo registro
- `POST /api/delete_entry`: Elimina un registro
- `POST /api/get_table_structure`: Obtiene la estructura de una tabla

### Auditoría
- `POST /api/audit/records`: Obtiene registros de auditoría
- `POST /api/audit/excel`: Descarga registros de auditoría en Excel

## Estructura de Archivos

```
sistema-consultas-sql/
├── app.py                 # Aplicación principal Flask
├── queries.json           # Consultas predefinidas
├── requirements.txt       # Dependencias Python
├── static/                # Archivos estáticos
│   ├── js/
│   │   └── script.js      # JavaScript principal
│   └── style.css          # Estilos CSS
└── templates/
    └── index.html         # Plantilla HTML principal
```

## Solución de Problemas

### Problemas de Conexión
- Verificar credenciales de SQL Server
- Comprobar que el servidor esté accesible desde la máquina que ejecuta la aplicación
- Revisar logs para errores específicos de conexión

### Errores en Consultas CTE
- Asegurarse de que las consultas CTE tengan la estructura correcta
- Verificar que los nombres de CTE final sean detectables
- Revisar la función `split_cte_and_select()` si hay problemas persistentes

### Problemas de Rendimiento
- Optimizar consultas SQL con índices adecuados
- Ajustar el tamaño de página para reducir carga
- Considerar la implementación de caché para consultas frecuentes
- Monitorear tiempos de respuesta de la base de datos

### Errores en Exportación a Excel
- Verificar límites de tamaño de datos
- Comprobar permisos de escritura para archivos temporales
- Revisar formato de datos para asegurar compatibilidad con Excel 