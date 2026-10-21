# Yucab — Experiencias en la costa de Yucatán

Plataforma web full-stack construida con Flask, SQLite, Tailwind CSS y JavaScript vainilla. Incluye catálogo público, búsqueda, captura de reservas y un dashboard administrativo con CRUD completo.

## Requisitos

- Python 3.10 o superior
- Acceso a internet para cargar Tailwind CSS, Google Fonts, Font Awesome y fotografías remotas

## Instalación y ejecución

En PowerShell, desde la raíz del proyecto:

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe app.py
```

Abre `http://127.0.0.1:5000` en tu navegador.

La base de datos `database.db` se crea y carga automáticamente con contenido inicial la primera vez que se ejecuta la aplicación.

## Acceso administrativo

- URL: `http://127.0.0.1:5000/admin`
- Usuario predeterminado: `admin`
- Contraseña predeterminada: `yucab2026`

Para usar credenciales distintas, define variables de entorno antes de iniciar:

```powershell
$env:YUCAB_ADMIN_USER = "mi_usuario"
$env:YUCAB_ADMIN_PASSWORD = "una_contraseña_segura"
$env:YUCAB_SECRET_KEY = "una-clave-larga-y-aleatoria"
.\.venv\Scripts\python.exe app.py
```

## Estructura

```text
YUCAB/
├── app.py
├── database.db
├── requirements.txt
├── templates/
│   ├── index.html
│   ├── login.html
│   └── admin.html
└── static/
    ├── css/styles.css
    └── js/
        ├── main.js
        └── admin.js
```

## API

- `GET /api/tours`, `GET /api/hotels`, `GET /api/promotions`
- `POST /api/reservations` (pública)
- `POST`, `PUT`, `DELETE /api/tours/:id` (administración)
- `POST`, `PUT`, `DELETE /api/hotels/:id` (administración)
- `POST`, `PUT`, `DELETE /api/promotions/:id` (administración)
- `GET`, `PATCH`, `DELETE /api/reservations/:id` (administración)

