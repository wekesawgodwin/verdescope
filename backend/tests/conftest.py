import os
import tempfile

import pytest

# Point the app at a disposable database and upload dir *before* it is imported.
os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL", "postgresql+psycopg://verdescope:verdescope@localhost:5433/verdescope_test")
os.environ["UPLOAD_DIR"] = tempfile.mkdtemp(prefix="vs-uploads-")
os.environ["SEED_DEMO"] = "true"
os.environ["EMAIL_PROVIDER"] = ""
os.environ["STATIC_DIR"] = tempfile.mkdtemp(prefix="vs-static-")


def _ensure_database(url: str) -> None:
    from sqlalchemy import create_engine, text
    from sqlalchemy.engine import make_url

    u = make_url(url)
    admin = create_engine(u.set(database="postgres"), isolation_level="AUTOCOMMIT")
    with admin.connect() as c:
        if not c.scalar(text("select 1 from pg_database where datname = :n"), {"n": u.database}):
            c.execute(text(f'create database "{u.database}"'))
    admin.dispose()


@pytest.fixture(scope="session")
def client():
    from app.config import get_settings
    _ensure_database(get_settings().database_url)

    from fastapi.testclient import TestClient

    from app import seed
    from app.db import Base, engine
    from app.main import app

    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    seed.run()
    with TestClient(app) as c:
        yield c
    engine.dispose()


def _login(client, email, password):
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


@pytest.fixture(scope="session")
def admin(client):
    return _login(client, "admin@verdescope.demo", "admin123")


@pytest.fixture(scope="session")
def manager(client):
    return _login(client, "manager@verdescope.demo", "manager123")


@pytest.fixture(scope="session")
def stakeholder(client):
    return _login(client, "stakeholder@verdescope.demo", "partner123")


@pytest.fixture(scope="session")
def other_stakeholder(client):
    return _login(client, "mara.wua@verdescope.demo", "partner123")
