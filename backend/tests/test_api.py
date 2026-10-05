import io

from PIL import Image


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


def test_public_site_content(client):
    r = client.get("/api/public/site")
    site = r.json()
    assert len(site["services"]) == 5
    assert len(site["expertise"]) == 8 and all(x["disciplines"] for x in site["expertise"])
    assert site["team"] == []  # staff are internal; empty list keeps older cached app versions working
    # Individual staff must not be published anywhere in the public content
    for name in ("Kiprotich", "Muthura", "Musonye", "Nzyuko", "Kapkwany", "Manyulu", "Zuber", "Anis"):
        assert name not in r.text
    assert site["settings"]["phone1"] == "+254 725 318 476"
    assert "mail_signature" not in site["settings"]  # internal settings stay private
    posts = client.get("/api/public/posts").json()
    assert posts and all(p["status"] == "published" for p in posts)
    assert client.get("/api/public/posts/kobo-odk-training-county-teams").status_code == 404  # draft
    events = client.get("/api/public/events").json()
    assert any(m["type"] == "video" for e in events for m in e["media"])


def test_unknown_api_route_is_json_404(client):
    r = client.get("/api/nope")
    assert r.status_code == 404 and r.json()["detail"] == "Not found"


def test_login_rejects_bad_password(client):
    assert client.post("/api/auth/login", json={"email": "admin@verdescope.demo", "password": "wrong"}).status_code == 401


def test_contact_form_to_inbox_and_reply(client, manager):
    r = client.post("/api/public/inquiries", json={"name": "Test Visitor", "email": "visitor@example.com", "message": "Need an EIA", "subject": "EIA quote"})
    assert r.status_code == 201
    iid = r.json()["id"]
    inbox = client.get("/api/mail/inquiries", headers=manager).json()
    assert inbox[0]["id"] == iid and inbox[0]["read"] is False

    detail = client.get(f"/api/mail/inquiries/{iid}", headers=manager).json()
    assert detail["read"] is True and detail["replies"] == []

    sent = client.post(f"/api/mail/inquiries/{iid}/reply", json={"body": "Thanks, we will be in touch."}, headers=manager).json()
    assert sent["subject"] == "Re: EIA quote"
    assert sent["delivered"] is False and "not configured" in sent["error"]  # no provider in tests

    detail = client.get(f"/api/mail/inquiries/{iid}", headers=manager).json()
    assert detail["status"] == "replied" and len(detail["replies"]) == 1
    assert any(e["id"] == sent["id"] for e in client.get("/api/mail/sent", headers=manager).json())


def test_honeypot_is_silently_dropped(client, manager):
    before = client.get("/api/mail/counts", headers=manager).json()["inbox"]
    r = client.post("/api/public/inquiries", json={"name": "Bot", "email": "bot@example.com", "message": "spam", "website": "http://spam"})
    assert r.status_code == 201
    assert client.get("/api/mail/counts", headers=manager).json()["inbox"] == before


def test_role_boundaries(client, manager, stakeholder):
    assert client.get("/api/mail/inquiries").status_code == 401
    assert client.get("/api/mail/inquiries", headers=stakeholder).status_code == 403
    assert client.get("/api/users", headers=manager).status_code == 403
    assert client.get("/api/settings", headers=manager).status_code == 403
    assert client.get("/api/me/overview", headers=manager).status_code == 403


def test_post_lifecycle(client, manager):
    body = {"title": "New website launched", "category": "News", "date": "2026-10-03", "status": "published", "excerpt": "Live", "body": "Hello"}
    p = client.post("/api/posts", json=body, headers=manager).json()
    assert p["slug"] == "new-website-launched" and p["author"] == "Website Manager"
    p2 = client.post("/api/posts", json=body, headers=manager).json()
    assert p2["slug"] == "new-website-launched-2"
    assert client.get("/api/public/posts/new-website-launched").status_code == 200
    assert client.delete(f"/api/posts/{p2['id']}", headers=manager).status_code == 204


def test_image_upload_and_gallery_event(client, manager):
    buf = io.BytesIO()
    Image.new("RGB", (2400, 1200), "green").save(buf, "PNG")
    r = client.post("/api/uploads", files={"file": ("pic.png", buf.getvalue(), "image/png")}, headers=manager)
    assert r.status_code == 200
    url = r.json()["url"]
    assert url.startswith("/uploads/images/") and client.get(url).status_code == 200

    ev = client.post("/api/events", headers=manager, json={"title": "Launch day", "date": "2026-10-03", "location": "Nairobi", "category": "Events",
                                                              "media": [{"type": "image", "src": url, "caption": "Team"}]}).json()
    assert ev["media"][0]["src"] == url
    assert client.post("/api/uploads", files={"file": ("x.txt", b"hi", "text/plain")}, headers=manager).status_code == 415


def test_stakeholder_sees_only_own_documents(client, admin, stakeholder, other_stakeholder):
    projects = client.get("/api/projects", headers=admin).json()
    bomet = next(p for p in projects if p["org"] == "County Government of Bomet")
    doc = client.post("/api/documents", headers=admin, data={"project_id": bomet["id"]}, files={"file": ("Report.pdf", b"%PDF-1.4 test", "application/pdf")}).json()

    ov = client.get("/api/me/overview", headers=stakeholder).json()
    assert all(p["org"] == "County Government of Bomet" for p in ov["projects"])
    assert any(d["id"] == doc["id"] for d in ov["documents"])

    r = client.get(f"/api/documents/{doc['id']}/download", headers=stakeholder)
    assert r.status_code == 200 and r.content == b"%PDF-1.4 test"
    assert client.get(f"/api/documents/{doc['id']}/download", headers=other_stakeholder).status_code == 404


def test_stakeholder_message_reaches_inbox(client, stakeholder, manager):
    r = client.post("/api/me/messages", headers=stakeholder, json={"project": "General", "subject": "Site visit", "message": "When is the next visit?"})
    assert r.status_code == 201
    inbox = client.get("/api/mail/inquiries", headers=manager).json()
    assert inbox[0]["source"] == "stakeholder" and inbox[0]["subject"] == "[General] Site visit"
    assert len(client.get("/api/me/messages", headers=stakeholder).json()) >= 2


def test_admin_user_management(client, admin):
    u = client.post("/api/users", headers=admin, json={"name": "New Partner", "email": "partner@example.com", "role": "stakeholder", "org": "Kericho County", "password": "secret1"}).json()
    assert client.post("/api/users", headers=admin, json={"name": "Dup", "email": "PARTNER@example.com", "role": "manager", "org": "x", "password": "secret1"}).status_code == 409
    upd = {"name": "New Partner", "email": "partner@example.com", "role": "stakeholder", "org": "Kericho County", "active": False}
    assert client.put(f"/api/users/{u['id']}", headers=admin, json=upd).json()["active"] is False
    assert client.post("/api/auth/login", json={"email": "partner@example.com", "password": "secret1"}).status_code == 403

    me = client.get("/api/auth/me", headers=admin).json()
    assert client.delete(f"/api/users/{me['id']}", headers=admin).status_code == 400


def test_dashboard_and_settings(client, admin):
    d = client.get("/api/dashboard", headers=admin).json()
    assert len(d["visits"]) == 12 and d["visits"][-2]["value"] > 0
    assert d["activity"]
    s = client.put("/api/settings", headers=admin, json={"mail_from": "hello@verdescope.co.ke", "bogus": 1}).json()
    assert s["mail_from"] == "hello@verdescope.co.ke" and "bogus" not in s
    client.post("/api/public/track", json={"page": "home"})
    assert client.get("/api/dashboard", headers=admin).json()["visits"][-1]["value"] >= 1


def test_staff_directory_is_portal_only(client, admin, manager, stakeholder):
    assert client.get("/api/staff").status_code == 401
    assert client.get("/api/staff", headers=stakeholder).status_code == 403
    staff = client.get("/api/staff", headers=manager).json()
    assert len(staff) == 8 and staff[0]["name"] == "Kiprotich"

    m = client.post("/api/staff", headers=admin, json={"name": "New Specialist", "role": "GIS Analyst", "years": "5+"}).json()
    upd = client.put(f"/api/staff/{m['id']}", headers=manager, json={"name": "New Specialist", "role": "Senior GIS Analyst", "years": "6+"}).json()
    assert upd["role"] == "Senior GIS Analyst"
    # Never leaks onto the public site
    assert "New Specialist" not in client.get("/api/public/site").text
    assert client.delete(f"/api/staff/{m['id']}", headers=admin).status_code == 204
