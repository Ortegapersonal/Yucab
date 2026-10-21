import os
import sqlite3
from datetime import datetime
from functools import wraps
from pathlib import Path

from flask import Flask, g, jsonify, redirect, render_template, request, session, url_for


BASE_DIR = Path(__file__).resolve().parent
DATABASE = BASE_DIR / "database.db"

app = Flask(__name__)
app.config.update(
    SECRET_KEY=os.environ.get("YUCAB_SECRET_KEY", "dev-change-this-secret-key"),
    DATABASE=str(DATABASE),
    JSON_SORT_KEYS=False,
)


SCHEMA = """
CREATE TABLE IF NOT EXISTS tours (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL NOT NULL CHECK(price >= 0),
    image TEXT NOT NULL,
    duration TEXT NOT NULL,
    featured INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hotels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    destination TEXT NOT NULL,
    description TEXT NOT NULL,
    price_per_night REAL NOT NULL CHECK(price_per_night >= 0),
    amenities TEXT NOT NULL,
    image TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS promotions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    discount INTEGER NOT NULL CHECK(discount BETWEEN 0 AND 100),
    description TEXT NOT NULL,
    valid_until TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    contact TEXT NOT NULL,
    selection TEXT NOT NULL,
    travel_date TEXT NOT NULL,
    guests INTEGER NOT NULL DEFAULT 1 CHECK(guests > 0),
    notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Nueva',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"""


SEED_TOURS = [
    (
        "Aventura Isla Columpios",
        "Isla Columpios, Yucatán",
        "Navega entre manglares, rema en kayak y relájate sobre columpios flotantes en aguas cristalinas.",
        1290,
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=85",
        "6 horas",
        1,
    ),
    (
        "Atardecer en Chuburná",
        "Chuburná Puerto, Yucatán",
        "Una tarde de costa, gastronomía local y un atardecer inolvidable frente al Golfo de México.",
        890,
        "https://images.unsplash.com/photo-1495954484750-af469f2f9be5?auto=format&fit=crop&w=1400&q=85",
        "4 horas",
        1,
    ),
    (
        "Ruta de Manglares",
        "Sisal, Yucatán",
        "Recorrido guiado por los humedales costeros para descubrir aves, cenotes y ecosistemas únicos.",
        760,
        "https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?auto=format&fit=crop&w=1400&q=85",
        "3.5 horas",
        0,
    ),
]

SEED_HOTELS = [
    (
        "Casa Arena Boutique",
        "Progreso",
        "Refugio costero de diseño relajado a unos pasos del malecón.",
        1850,
        "Alberca, Desayuno incluido, WiFi, Terraza",
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1400&q=85",
    ),
    (
        "Manglar Eco Lodge",
        "Sisal",
        "Cabañas sostenibles rodeadas de naturaleza, ideales para desconectar.",
        2200,
        "Kayaks, Restaurante, Tours guiados, Estacionamiento",
        "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1400&q=85",
    ),
    (
        "Hotel Costa Esmeralda",
        "Chuburná Puerto",
        "Habitaciones amplias con vistas al mar y acceso directo a la playa.",
        1650,
        "Frente al mar, Alberca, Pet friendly, Bar",
        "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1400&q=85",
    ),
]

SEED_PROMOTIONS = [
    ("Escápate entre semana", 20, "Reserva de lunes a jueves y disfruta una tarifa especial en tours seleccionados.", "2027-03-31"),
    ("Costa en familia", 15, "Descuento para grupos de cuatro personas o más en experiencias de día completo.", "2027-06-30"),
    ("Hotel + experiencia", 25, "Combina dos noches de hotel con un tour y aprovecha nuestro mejor precio.", "2027-12-15"),
]


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(app.config["DATABASE"])
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


@app.teardown_appcontext
def close_db(_error=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    db = get_db()
    db.executescript(SCHEMA)
    if db.execute("SELECT COUNT(*) FROM tours").fetchone()[0] == 0:
        db.executemany(
            "INSERT INTO tours (name, location, description, price, image, duration, featured) VALUES (?, ?, ?, ?, ?, ?, ?)",
            SEED_TOURS,
        )
    if db.execute("SELECT COUNT(*) FROM hotels").fetchone()[0] == 0:
        db.executemany(
            "INSERT INTO hotels (name, destination, description, price_per_night, amenities, image) VALUES (?, ?, ?, ?, ?, ?)",
            SEED_HOTELS,
        )
    if db.execute("SELECT COUNT(*) FROM promotions").fetchone()[0] == 0:
        db.executemany(
            "INSERT INTO promotions (title, discount, description, valid_until) VALUES (?, ?, ?, ?)",
            SEED_PROMOTIONS,
        )
    db.commit()


def rows_to_dicts(rows):
    return [dict(row) for row in rows]


def api_error(message, status=400):
    return jsonify({"ok": False, "error": message}), status


def require_fields(data, fields):
    missing = [field for field in fields if str(data.get(field, "")).strip() == ""]
    return missing


def admin_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("admin"):
            if request.path.startswith("/api/"):
                return api_error("Sesión no autorizada.", 401)
            return redirect(url_for("login"))
        return view(*args, **kwargs)

    return wrapped


@app.get("/")
def index():
    return render_template("index.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if session.get("admin"):
        return redirect(url_for("admin"))
    error = None
    if request.method == "POST":
        username = request.form.get("username", "")
        password = request.form.get("password", "")
        valid_user = os.environ.get("YUCAB_ADMIN_USER", "admin")
        valid_password = os.environ.get("YUCAB_ADMIN_PASSWORD", "yucab2026")
        if username == valid_user and password == valid_password:
            session.clear()
            session["admin"] = True
            return redirect(url_for("admin"))
        error = "Usuario o contraseña incorrectos."
    return render_template("login.html", error=error)


@app.post("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.get("/admin")
@admin_required
def admin():
    return render_template("admin.html")


@app.get("/api/tours")
def list_tours():
    rows = get_db().execute("SELECT * FROM tours ORDER BY featured DESC, id DESC").fetchall()
    return jsonify(rows_to_dicts(rows))


@app.post("/api/tours")
@admin_required
def create_tour():
    data = request.get_json(silent=True) or {}
    fields = ["name", "location", "description", "price", "image", "duration"]
    missing = require_fields(data, fields)
    if missing:
        return api_error(f"Campos requeridos: {', '.join(missing)}")
    try:
        price = float(data["price"])
        if price < 0:
            raise ValueError
    except (TypeError, ValueError):
        return api_error("El precio debe ser un número positivo.")
    db = get_db()
    cursor = db.execute(
        "INSERT INTO tours (name, location, description, price, image, duration, featured) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (data["name"].strip(), data["location"].strip(), data["description"].strip(), price, data["image"].strip(), data["duration"].strip(), int(bool(data.get("featured")))),
    )
    db.commit()
    return jsonify({"ok": True, "id": cursor.lastrowid}), 201


@app.put("/api/tours/<int:item_id>")
@admin_required
def update_tour(item_id):
    data = request.get_json(silent=True) or {}
    fields = ["name", "location", "description", "price", "image", "duration"]
    missing = require_fields(data, fields)
    if missing:
        return api_error(f"Campos requeridos: {', '.join(missing)}")
    try:
        price = float(data["price"])
        if price < 0:
            raise ValueError
    except (TypeError, ValueError):
        return api_error("El precio debe ser un número positivo.")
    db = get_db()
    result = db.execute(
        "UPDATE tours SET name=?, location=?, description=?, price=?, image=?, duration=?, featured=? WHERE id=?",
        (data["name"].strip(), data["location"].strip(), data["description"].strip(), price, data["image"].strip(), data["duration"].strip(), int(bool(data.get("featured"))), item_id),
    )
    db.commit()
    return jsonify({"ok": True}) if result.rowcount else api_error("Tour no encontrado.", 404)


@app.delete("/api/tours/<int:item_id>")
@admin_required
def delete_tour(item_id):
    db = get_db()
    result = db.execute("DELETE FROM tours WHERE id=?", (item_id,))
    db.commit()
    return jsonify({"ok": True}) if result.rowcount else api_error("Tour no encontrado.", 404)


@app.get("/api/hotels")
def list_hotels():
    rows = get_db().execute("SELECT * FROM hotels ORDER BY id DESC").fetchall()
    return jsonify(rows_to_dicts(rows))


@app.post("/api/hotels")
@admin_required
def create_hotel():
    data = request.get_json(silent=True) or {}
    fields = ["name", "destination", "description", "price_per_night", "amenities", "image"]
    missing = require_fields(data, fields)
    if missing:
        return api_error(f"Campos requeridos: {', '.join(missing)}")
    try:
        price = float(data["price_per_night"])
        if price < 0:
            raise ValueError
    except (TypeError, ValueError):
        return api_error("El precio debe ser un número positivo.")
    db = get_db()
    cursor = db.execute(
        "INSERT INTO hotels (name, destination, description, price_per_night, amenities, image) VALUES (?, ?, ?, ?, ?, ?)",
        (data["name"].strip(), data["destination"].strip(), data["description"].strip(), price, data["amenities"].strip(), data["image"].strip()),
    )
    db.commit()
    return jsonify({"ok": True, "id": cursor.lastrowid}), 201


@app.put("/api/hotels/<int:item_id>")
@admin_required
def update_hotel(item_id):
    data = request.get_json(silent=True) or {}
    fields = ["name", "destination", "description", "price_per_night", "amenities", "image"]
    missing = require_fields(data, fields)
    if missing:
        return api_error(f"Campos requeridos: {', '.join(missing)}")
    try:
        price = float(data["price_per_night"])
        if price < 0:
            raise ValueError
    except (TypeError, ValueError):
        return api_error("El precio debe ser un número positivo.")
    db = get_db()
    result = db.execute(
        "UPDATE hotels SET name=?, destination=?, description=?, price_per_night=?, amenities=?, image=? WHERE id=?",
        (data["name"].strip(), data["destination"].strip(), data["description"].strip(), price, data["amenities"].strip(), data["image"].strip(), item_id),
    )
    db.commit()
    return jsonify({"ok": True}) if result.rowcount else api_error("Hotel no encontrado.", 404)


@app.delete("/api/hotels/<int:item_id>")
@admin_required
def delete_hotel(item_id):
    db = get_db()
    result = db.execute("DELETE FROM hotels WHERE id=?", (item_id,))
    db.commit()
    return jsonify({"ok": True}) if result.rowcount else api_error("Hotel no encontrado.", 404)


@app.get("/api/promotions")
def list_promotions():
    rows = get_db().execute("SELECT * FROM promotions ORDER BY valid_until ASC").fetchall()
    return jsonify(rows_to_dicts(rows))


@app.post("/api/promotions")
@admin_required
def create_promotion():
    data = request.get_json(silent=True) or {}
    fields = ["title", "discount", "description", "valid_until"]
    missing = require_fields(data, fields)
    if missing:
        return api_error(f"Campos requeridos: {', '.join(missing)}")
    try:
        discount = int(data["discount"])
        datetime.strptime(data["valid_until"], "%Y-%m-%d")
        if not 0 <= discount <= 100:
            raise ValueError
    except (TypeError, ValueError):
        return api_error("Descuento o fecha de vigencia inválidos.")
    db = get_db()
    cursor = db.execute(
        "INSERT INTO promotions (title, discount, description, valid_until) VALUES (?, ?, ?, ?)",
        (data["title"].strip(), discount, data["description"].strip(), data["valid_until"]),
    )
    db.commit()
    return jsonify({"ok": True, "id": cursor.lastrowid}), 201


@app.put("/api/promotions/<int:item_id>")
@admin_required
def update_promotion(item_id):
    data = request.get_json(silent=True) or {}
    fields = ["title", "discount", "description", "valid_until"]
    missing = require_fields(data, fields)
    if missing:
        return api_error(f"Campos requeridos: {', '.join(missing)}")
    try:
        discount = int(data["discount"])
        datetime.strptime(data["valid_until"], "%Y-%m-%d")
        if not 0 <= discount <= 100:
            raise ValueError
    except (TypeError, ValueError):
        return api_error("Descuento o fecha de vigencia inválidos.")
    db = get_db()
    result = db.execute(
        "UPDATE promotions SET title=?, discount=?, description=?, valid_until=? WHERE id=?",
        (data["title"].strip(), discount, data["description"].strip(), data["valid_until"], item_id),
    )
    db.commit()
    return jsonify({"ok": True}) if result.rowcount else api_error("Promoción no encontrada.", 404)


@app.delete("/api/promotions/<int:item_id>")
@admin_required
def delete_promotion(item_id):
    db = get_db()
    result = db.execute("DELETE FROM promotions WHERE id=?", (item_id,))
    db.commit()
    return jsonify({"ok": True}) if result.rowcount else api_error("Promoción no encontrada.", 404)


@app.post("/api/reservations")
def create_reservation():
    data = request.get_json(silent=True) or {}
    fields = ["customer_name", "contact", "selection", "travel_date"]
    missing = require_fields(data, fields)
    if missing:
        return api_error(f"Campos requeridos: {', '.join(missing)}")
    try:
        travel_date = datetime.strptime(data["travel_date"], "%Y-%m-%d").date()
        guests = int(data.get("guests", 1))
        if travel_date < datetime.now().date() or guests < 1:
            raise ValueError
    except (TypeError, ValueError):
        return api_error("La fecha o el número de viajeros no es válido.")
    db = get_db()
    cursor = db.execute(
        "INSERT INTO reservations (customer_name, contact, selection, travel_date, guests, notes) VALUES (?, ?, ?, ?, ?, ?)",
        (data["customer_name"].strip(), data["contact"].strip(), data["selection"].strip(), data["travel_date"], guests, str(data.get("notes", "")).strip()),
    )
    db.commit()
    return jsonify({"ok": True, "id": cursor.lastrowid, "message": "¡Solicitud recibida! Nuestro equipo te contactará muy pronto."}), 201


@app.get("/api/reservations")
@admin_required
def list_reservations():
    rows = get_db().execute("SELECT * FROM reservations ORDER BY created_at DESC").fetchall()
    return jsonify(rows_to_dicts(rows))


@app.patch("/api/reservations/<int:item_id>")
@admin_required
def update_reservation(item_id):
    data = request.get_json(silent=True) or {}
    status = str(data.get("status", "")).strip()
    allowed = {"Nueva", "Contactada", "Confirmada", "Cerrada"}
    if status not in allowed:
        return api_error("Estado no válido.")
    db = get_db()
    result = db.execute("UPDATE reservations SET status=? WHERE id=?", (status, item_id))
    db.commit()
    return jsonify({"ok": True}) if result.rowcount else api_error("Reserva no encontrada.", 404)


@app.delete("/api/reservations/<int:item_id>")
@admin_required
def delete_reservation(item_id):
    db = get_db()
    result = db.execute("DELETE FROM reservations WHERE id=?", (item_id,))
    db.commit()
    return jsonify({"ok": True}) if result.rowcount else api_error("Reserva no encontrada.", 404)


with app.app_context():
    init_db()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
