#!/usr/bin/env python3
"""Servidor local de Pyme360: archivos estáticos, SQLite y consulta ONU opcional."""

from __future__ import annotations

import json
import os
import re
import socket
import sqlite3
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from contextlib import contextmanager
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


MIN_PYTHON = (3, 11)
MAX_BODY_BYTES = 20 * 1024 * 1024
APP_NAME = "Pyme360"
SCHEMA_VERSION = 1
PORTS = range(8765, 8791)
PROJECT_ROOT = Path(__file__).resolve().parent.parent
WEB_ROOT = PROJECT_ROOT / "web"
benchmark_cache: dict | None = None
benchmark_cached_at = 0.0
benchmark_lock = threading.Lock()


def data_directory() -> Path:
    if sys.platform == "win32":
        root = Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData" / "Local"))
        return root / APP_NAME
    if sys.platform == "darwin":
        return Path.home() / "Library" / "Application Support" / APP_NAME
    root = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share"))
    return root / APP_NAME.lower()


DATA_DIR = data_directory()
DB_PATH = DATA_DIR / "pyme360.sqlite3"
BACKUP_DIR = DATA_DIR / "backups"


def connect_db() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA busy_timeout = 10000")
    return connection


@contextmanager
def db_session():
    connection = connect_db()
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def initialize_database() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    with db_session() as connection:
        connection.execute("PRAGMA journal_mode = WAL")
        connection.execute(
            """CREATE TABLE IF NOT EXISTS app_state (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                schema_version INTEGER NOT NULL,
                revision INTEGER NOT NULL,
                payload_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )"""
        )


def create_daily_backup(force: bool = False) -> None:
    """Crea una copia coherente con la API de respaldo de SQLite y conserva siete."""
    today = datetime.now().astimezone().date().isoformat()
    target = BACKUP_DIR / f"pyme360-{today}.sqlite3"
    with db_session() as connection:
        has_data = connection.execute("SELECT 1 FROM app_state WHERE id = 1").fetchone() is not None
    if has_data and (force or not target.exists()):
        source = connect_db()
        try:
            destination = sqlite3.connect(target)
            try:
                source.backup(destination)
            finally:
                destination.close()
        finally:
            source.close()
    backups = sorted(BACKUP_DIR.glob("pyme360-*.sqlite3"), key=lambda item: item.name, reverse=True)
    for old_backup in backups[7:]:
        try:
            old_backup.unlink()
        except OSError:
            pass


def state_row() -> dict:
    with db_session() as connection:
        row = connection.execute(
            "SELECT schema_version, revision, payload_json, updated_at FROM app_state WHERE id = 1"
        ).fetchone()
    if row is None:
        return {"revision": 0, "state": None, "schemaVersion": SCHEMA_VERSION}
    return {
        "revision": row["revision"],
        "state": json.loads(row["payload_json"]),
        "schemaVersion": row["schema_version"],
        "updatedAt": row["updated_at"],
    }


def normalize_benchmark_rows(api_response: object) -> dict:
    rows = api_response.get("data", []) if isinstance(api_response, dict) else api_response
    if not isinstance(rows, list):
        rows = []
    observations = []
    base_period = ""
    descriptions = []
    sources = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        area_code = str(row.get("geoAreaCode", ""))
        if area_code not in ("1", "170"):
            continue
        year_value = str(row.get("timePeriodStart", row.get("timePeriod", "")))
        year_match = re.search(r"\d{4}", year_value)
        try:
            value = float(row.get("value"))
        except (TypeError, ValueError):
            continue
        if not year_match:
            continue
        if not base_period and row.get("basePeriod"):
            base_period = str(row["basePeriod"])
        if row.get("seriesDescription"):
            descriptions.append(str(row["seriesDescription"]))
        if row.get("source"):
            sources.append(str(row["source"]))
        observations.append(
            {
                "areaCode": area_code,
                "area": row.get("geoAreaName") or ("Mundo" if area_code == "1" else "Colombia"),
                "year": int(year_match.group(0)),
                "value": value,
                "source": str(row.get("source") or ""),
                "basePeriod": str(row.get("basePeriod") or ""),
                "seriesDescription": str(row.get("seriesDescription") or ""),
            }
        )
    if not observations:
        raise ValueError("La API pública no devolvió observaciones para el indicador solicitado.")
    unique_sources = list(dict.fromkeys(item for item in sources if item))
    return {
        "indicator": "7.3.1",
        "series": "EG_EGY_PRIM",
        "unit": "MJ por USD de PIB en PPA constante" + (f" de {base_period}" if base_period else ""),
        "description": descriptions[0] if descriptions else "Intensidad energética de la economía respecto al PIB.",
        "source": "; ".join(unique_sources) if unique_sources else "ONU · Base mundial de indicadores ODS",
        "sourceUrl": "https://unstats.un.org/SDGAPI/swagger/",
        "metadataUrl": "https://unstats.un.org/sdgs/metadata/?Goal=7&Target=7.3",
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
        "stale": False,
        "observations": sorted(observations, key=lambda item: (item["year"], item["areaCode"])),
    }


def public_benchmark() -> tuple[int, dict]:
    global benchmark_cache, benchmark_cached_at
    with benchmark_lock:
        now = time.time()
        if benchmark_cache is not None and now - benchmark_cached_at < 24 * 60 * 60:
            return 200, benchmark_cache
        query = urllib.parse.urlencode(
            [("seriesCode", "EG_EGY_PRIM"), ("areaCode", "1"), ("areaCode", "170"), ("page", "1"), ("pageSize", "200")]
        )
        request = urllib.request.Request(
            "https://unstats.un.org/SDGAPI/v1/sdg/Series/Data?" + query,
            headers={"Accept": "application/json", "User-Agent": "Pyme360-local/1.0"},
        )
        try:
            with urllib.request.urlopen(request, timeout=18) as response:
                payload = normalize_benchmark_rows(json.loads(response.read().decode("utf-8")))
            benchmark_cache = payload
            benchmark_cached_at = now
            return 200, payload
        except (urllib.error.URLError, TimeoutError, ValueError, json.JSONDecodeError) as exc:
            if benchmark_cache is not None:
                stale = dict(benchmark_cache)
                stale["stale"] = True
                stale["cacheAgeHours"] = round(max(0, (now - benchmark_cached_at) / 3600), 1)
                return 200, stale
            return 502, {"error": "No fue posible consultar la referencia pública de la ONU.", "detail": str(exc)}


class Pyme360Handler(SimpleHTTPRequestHandler):
    server_version = "Pyme360Local/1.0"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB_ROOT), **kwargs)

    def log_message(self, fmt: str, *args) -> None:
        # Evita imprimir datos personales o consultas con parámetros en la terminal.
        if self.path.startswith("/api/"):
            print("Solicitud API local de Pyme360 atendida.")
        else:
            super().log_message(fmt, *args)

    def end_headers(self) -> None:
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "same-origin")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def guess_type(self, path: str) -> str:
        explicit_types = {".wasm": "application/wasm", ".mjs": "text/javascript"}
        extension = Path(path).suffix.lower()
        return explicit_types.get(extension, super().guess_type(path))

    def _is_local_request(self) -> bool:
        try:
            if not self.client_address[0].startswith(("127.", "::1")):
                return False
            host = self.headers.get("Host", "").lower()
            allowed_hosts = {f"127.0.0.1:{self.server.server_port}", f"localhost:{self.server.server_port}"}
            if host not in allowed_hosts:
                return False
            origin = self.headers.get("Origin")
            if origin:
                parsed = urllib.parse.urlsplit(origin)
                if parsed.scheme != "http" or parsed.netloc.lower() not in allowed_hosts:
                    return False
            return True
        except (AttributeError, ValueError):
            return False

    def _json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _read_json(self) -> dict:
        raw_length = self.headers.get("Content-Length", "")
        try:
            length = int(raw_length)
        except ValueError as exc:
            raise ValueError("La solicitud no indicó un tamaño válido.") from exc
        if length < 1 or length > MAX_BODY_BYTES:
            raise OverflowError("El archivo de datos supera el límite local de 20 MB.")
        if "application/json" not in self.headers.get("Content-Type", "").lower():
            raise ValueError("El servidor esperaba datos JSON.")
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ValueError("Los datos recibidos no forman un JSON válido.") from exc
        if not isinstance(payload, dict) or not isinstance(payload.get("state"), dict):
            raise ValueError("No encontramos el estado de Pyme360 en la solicitud.")
        if not isinstance(payload.get("expectedRevision"), int) or payload["expectedRevision"] < 0:
            raise ValueError("La versión de los datos no es válida.")
        state = payload["state"]
        for key in ("contacts", "inventory", "sales", "purchases", "production", "environment", "activity", "importExtras"):
            if key in state and not isinstance(state[key], list):
                raise ValueError(f"La sección {key} debe ser una lista.")
        return payload

    def do_GET(self) -> None:
        path = urllib.parse.urlsplit(self.path).path
        if path.startswith("/api/") and not self._is_local_request():
            return self._json(403, {"error": "Esta API solo acepta solicitudes del mismo computador."})
        if path == "/api/v1/state":
            return self._json(200, state_row())
        if path == "/api/v1/environment/public-benchmark":
            status, payload = public_benchmark()
            return self._json(status, payload)
        return super().do_GET()

    def do_PUT(self) -> None:
        if urllib.parse.urlsplit(self.path).path != "/api/v1/state":
            return self._json(404, {"error": "No encontramos esta dirección."})
        if not self._is_local_request():
            return self._json(403, {"error": "Esta API solo acepta solicitudes del mismo computador."})
        try:
            request_payload = self._read_json()
        except OverflowError as exc:
            return self._json(413, {"error": str(exc)})
        except ValueError as exc:
            return self._json(400, {"error": str(exc)})

        serialized = json.dumps(request_payload["state"], ensure_ascii=False, separators=(",", ":"))
        current_time = datetime.now(timezone.utc).isoformat()
        try:
            with db_session() as connection:
                connection.execute("BEGIN IMMEDIATE")
                row = connection.execute("SELECT revision FROM app_state WHERE id = 1").fetchone()
                current_revision = int(row["revision"]) if row else 0
                if current_revision != request_payload["expectedRevision"]:
                    connection.rollback()
                    return self._json(409, {"error": "Los datos cambiaron en otra pestaña.", **state_row()})
                next_revision = current_revision + 1
                connection.execute(
                    """INSERT INTO app_state (id, schema_version, revision, payload_json, updated_at)
                       VALUES (1, ?, ?, ?, ?)
                       ON CONFLICT(id) DO UPDATE SET schema_version=excluded.schema_version,
                         revision=excluded.revision, payload_json=excluded.payload_json, updated_at=excluded.updated_at""",
                    (SCHEMA_VERSION, next_revision, serialized, current_time),
                )
                connection.commit()
        except sqlite3.Error as exc:
            return self._json(500, {"error": "SQLite no pudo guardar los datos. Revisa el espacio y los permisos del computador.", "detail": str(exc)})
        try:
            create_daily_backup(force=True)
        except (OSError, sqlite3.Error) as exc:
            print(f"Aviso: no se pudo actualizar la copia diaria: {exc}")
        self._json(200, {"revision": next_revision, "schemaVersion": SCHEMA_VERSION, "updatedAt": current_time})

    def do_POST(self) -> None:
        self._json(405, {"error": "Esta operación no está disponible."})

    def do_DELETE(self) -> None:
        self._json(405, {"error": "Esta operación no está disponible."})

    def translate_path(self, path: str) -> str:
        # SimpleHTTPRequestHandler permite estáticos, pero nunca salir de la carpeta web.
        parsed = urllib.parse.urlsplit(path)
        parts = [part for part in urllib.parse.unquote(parsed.path).split("/") if part and part not in (".", "..")]
        if any(part.startswith(".") for part in parts) or (parts and Path(parts[-1]).suffix.lower() in {".py", ".ps1", ".bat", ".sh", ".command"}):
            return str(WEB_ROOT / "__not_found__")
        candidate = WEB_ROOT.joinpath(*parts).resolve()
        root = WEB_ROOT
        try:
            candidate.relative_to(root)
        except ValueError:
            return str(root / "__not_found__")
        return str(candidate)


class LoopbackHTTPServer(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True
    address_family = socket.AF_INET


def main() -> int:
    if sys.version_info < MIN_PYTHON:
        print("Pyme360 necesita Python 3.11 o superior para guardar los datos en SQLite.")
        print("Instálalo desde https://www.python.org/downloads/ y vuelve a abrir el lanzador.")
        return 1
    try:
        initialize_database()
    except (OSError, sqlite3.Error) as exc:
        print(f"No se pudo preparar la base local de Pyme360: {exc}")
        print(f"Revisa que tengas espacio y permisos en {DATA_DIR}.")
        return 1
    try:
        create_daily_backup()
    except (OSError, sqlite3.Error) as exc:
        print(f"Aviso: no se pudo actualizar la copia diaria al iniciar: {exc}")
    server = None
    for port in PORTS:
        try:
            server = LoopbackHTTPServer(("127.0.0.1", port), Pyme360Handler)
            break
        except OSError:
            continue
    if server is None:
        print("No hay un puerto disponible entre 8765 y 8790. Cierra otra ventana de Pyme360 e inténtalo de nuevo.")
        return 1
    url = f"http://127.0.0.1:{server.server_port}/index.html"
    print(f"Pyme360 está disponible en {url}")
    print(f"Base de datos local: {DB_PATH}")
    print(f"Copias de seguridad: {BACKUP_DIR} (siete días rotativos)")
    print("Solo se aceptan conexiones desde este computador. Cierra esta ventana para detenerlo.")
    if "--no-browser" not in sys.argv:
        try:
            webbrowser.open(url)
        except Exception:
            print(f"Abre esta dirección en tu navegador: {url}")
    try:
        server.serve_forever(poll_interval=0.5)
    except KeyboardInterrupt:
        print("\nPyme360 se cerró. Los datos permanecen guardados en SQLite.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
