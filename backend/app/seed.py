"""Seed an empty database.

Company content (settings, services, assignments, posts, gallery) is always seeded on first run.
Sector expertise is seeded whenever its table is empty, so existing databases pick it up on deploy.
Demo users, inquiries, projects and analytics are only added when SEED_DEMO=true.
Run: python -m app.seed
"""
import logging
from datetime import UTC, date, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .config import get_settings
from .db import SessionLocal
from .models import Activity, Announcement, Assignment, Document, Event, Expertise, Inquiry, Media, OutboundEmail, PageView, Post, Project, Service, SiteSettings, User
from .routers.common import DEFAULT_SETTINGS
from .security import hash_password

log = logging.getLogger("verdescope.seed")

SERVICES = [
    ("01", "leaf", "Environmental & Climate Consultancy", "/assets/img/stock/hero-mara.jpg",
     "Statutory environmental assessments, compliance and climate advisory that keep projects licensable, financeable and resilient.",
     ["EIA, ESIA, SEA and Environmental Audits (EA)", "Environmental compliance and due diligence", "ESMPs and climate risk assessments", "Climate adaptation, carbon footprint and green growth"]),
    ("02", "drop", "Natural Resource, WASH & Environmental Management", "/assets/img/stock/mau-spring.jpg",
     "Integrated land, water and ecosystem management that restores natural capital and secures water for communities.",
     ["Sustainable land and water management", "Ecosystem restoration and biodiversity conservation", "Watershed management and IWRM", "Solid waste and wastewater management", "ESG advisory and environmental risk assessment"]),
    ("03", "map", "Research, Monitoring, Evaluation & GIS", "/assets/img/stock/tana-satellite.jpg",
     "Evidence for decisions: rigorous studies, third-party monitoring and spatial intelligence from field to satellite.",
     ["Baseline, midline and endline studies", "MEAL and Third-Party Monitoring (TPM)", "Socio-economic, market and policy research", "GIS, remote sensing and spatial analysis", "Surveys, feasibility studies and data analytics"]),
    ("04", "shield", "Occupational Health, Safety & Risk Management", "/assets/img/projects/field-team.jpg",
     "Safer workplaces through structured audits, risk assessment and emergency preparedness planning.",
     ["OHS and EHS audits", "Workplace risk assessments", "Emergency preparedness and risk management"]),
    ("05", "people", "Capacity Building & Institutional Development", "/assets/img/projects/community-baraza.jpg",
     "Training and technical advisory that leave institutions and communities stronger long after the project ends.",
     ["Technical advisory and professional training", "Training in EIA, climate change, GIS, M&E, data collection (Kobo Toolbox & ODK), project management, RBM, WSP and IWRM", "Customised capacity-building programmes tailored to client needs"]),
]

# Technical expertise by sector, summarised from the key staff in the 2026 company profile.
# Individual staff are intentionally not published.
EXPERTISE = [
    ("Environmental Assessment & Compliance", "leaf",
     "NEMA-registered Lead Experts delivering statutory assessments and audits for public and private projects.",
     ["EIA, ESIA, SEA and environmental audits", "Environmental science, management and conservation", "Environmental governance and safeguards", "Licensing and compliance with EMCA and NEMA"]),
    ("Climate Change & Resilience", "globe",
     "Climate risk screening, adaptation planning and environmental and social safeguards across Kenya and the Horn of Africa.",
     ["Climate risk and vulnerability assessment", "Adaptation and resilience planning", "Environmental and social safeguards", "Carbon footprint and green growth"]),
    ("Water Resources & WASH Engineering", "drop",
     "Doctoral and degree-qualified water engineers and hydrologists for water supply, irrigation and catchment management.",
     ["Water and environmental engineering", "Hydrology and integrated water resource management", "Water Safety Planning", "WASH in development and emergency settings"]),
    ("Environmental & Resource Economics", "chart",
     "Doctoral-level environmental economists bringing economic evidence to environmental and development decisions.",
     ["Environmental and natural resource valuation", "Cost-benefit and socio-economic analysis", "Policy research and appraisal"]),
    ("Social Development & Stakeholder Engagement", "people",
     "Sociologists and community development specialists who put affected communities at the centre of project design.",
     ["Sociology and community development", "Public participation for ESIA studies", "Participatory Rural Appraisal (PRA)", "Strategic planning and organisational development"]),
    ("Public Health & Occupational Safety", "shield",
     "Public health and epidemiology specialists supporting safe workplaces and health-sector compliance.",
     ["Public health and epidemiology", "Occupational health and safety (OHS/EHS)", "Health facility environmental compliance"]),
    ("Civil Engineering & Construction Supervision", "building",
     "Civil engineers and project managers supervising infrastructure from design through construction.",
     ["Construction project management", "Site supervision and quality assurance", "Contract administration and value engineering", "AutoCAD, Civil 3D and Primavera P6"]),
    ("Research, MEAL & GIS", "map",
     "Researchers, MEAL and GIS specialists turning field data into evidence for decision-makers.",
     ["Monitoring, evaluation, accountability and learning (MEAL)", "GIS and remote sensing", "Surveys and data analytics (Kobo Toolbox, ODK)", "Capacity building and training"]),
]

# Representative entries from the 82 assignments in the 2026 company profile
ASSIGNMENTS = [
    ("ESIA for the proposed Malaso Dam, Narok South", "Lalela Limited", 2021, "Narok", "ESIA"),
    ("EIA for the proposed Kyogong – Kaboson roads construction", "China Civil Constructions Corporation", 2021, "Bomet", "EIA"),
    ("ESIA for periodic maintenance of Kipsigak–Serem Road", "Kenya Rural Roads Authority", 2021, "Nandi", "ESIA"),
    ("ESIA and supervision of the proposed Nandi County Textile Unit", "County Government of Nandi", 2021, "Nandi", "ESIA"),
    ("EIA for renovation and rehabilitation of Navalas Dam and water project, Soy", "County Government of Uasin Gishu", 2021, "Eldoret", "EIA"),
    ("Environmental Audits for Imarisha SACCO buildings in Bomet, Litein and Kericho", "Imarisha SACCO Limited", 2021, "Kericho", "Audit"),
    ("EIA for the removal and disposal of asbestos roofing, KPCU Coffee House", "Woolwich Properties Limited", 2020, "Nairobi", "EIA"),
    ("EIAs for road construction borrow pits, quarries and dumping sites – Londiani, Fort Ternan", "Index Constructions Ltd / Sinohydro Bureau", 2020, "Kericho", "EIA"),
    ("Environmental Audit and Impact Assessment for Chibut Tea Factory", "Chibut Tea Factory", 2020, "Nandi", "Audit"),
    ("EIA for the proposed stone quarry in Kaaboi area, Soy", "China Henan International Cooperation Co.", 2020, "Uasin Gishu", "EIA"),
    ("ESIA of floating jetty and associated structures in Shimoni", "KMFRI / World Bank", 2019, "Kwale", "ESIA"),
    ("ESIA for proposed grain dams and associated infrastructure, Moi’s Bridge", "Cargill Kenya Limited", 2019, "Uasin Gishu", "ESIA"),
    ("Full-study ESIA for Reale Hospital Centre, Elgon View", "Reale Hospital", 2019, "Uasin Gishu", "ESIA"),
    ("Environmental auditing of 30 public schools, Ziwa and Koisagat zones", "Public schools, Soy Sub-County", 2019, "Uasin Gishu", "Audit"),
    ("EIA for proposed bauxite mining at Itigo, Mosoriot", "County Government of Nandi", 2019, "Nandi", "EIA"),
    ("Full-study ESIA for Ainushamsi Energy Limited, Korando B", "Ainushamsi Energy Limited", 2019, "Kisumu", "ESIA"),
    ("Design, supervision and construction of 15 sand dams", "Amref Health Africa", 2018, "Kajiado", "Water"),
    ("Design and supervision of Oljoro mini-irrigation and water supply project, Mulot", "GLOWS / WADA / WWF – Mara Water Users Association", 2018, "Narok", "Water"),
    ("Design and supervision of Chebinyiny water supply project, Mulot", "GLOWS / WADA / WWF – Mara Water Users Association", 2018, "Narok", "Water"),
    ("EIA for 10 milk cooling plants in Bomet", "County Government of Bomet", 2018, "Bomet", "EIA"),
    ("EIA for Itembe borehole water project, Kapkwen", "Bomet Municipal Council / European Union", 2018, "Bomet", "EIA"),
    ("Environmental Audit for Tenwek Mission Hospital", "Tenwek Mission Hospital", 2018, "Bomet", "Audit"),
    ("Environmental Audit for Tirgaga Tea Factory", "Tirgaga Tea Factory (KTDA)", 2018, "Bomet", "Audit"),
    ("EIA for removal and disposal of asbestos roofing at Mogogosiek Hospital", "County Government of Bomet", 2018, "Bomet", "EIA"),
]

POSTS = [
    dict(slug="eia-process-kenya-guide", title="The EIA process in Kenya: a practical guide for project proponents", category="Compliance", date=date(2026, 9, 22), status="published",
         image="/assets/img/stock/rift-valley.jpg",
         excerpt="Under EMCA, most development projects need a NEMA licence before ground is broken. Here is how the process works and where projects typically lose time.",
         body="Under the Environmental Management and Co-ordination Act (EMCA), most development projects in Kenya require an Environmental Impact Assessment licence from NEMA before construction begins. Understanding the process early saves months.\n\n## Screening and project reports\nThe first question is how significant the project's impacts are likely to be. Low-risk projects may proceed on a Project Report, while medium and high-risk projects require a full study with Terms of Reference approved by NEMA.\n\n## Public participation\nMeaningful consultation is not a box to tick. Barazas, key-informant interviews and questionnaires give affected communities a voice and frequently surface risks that desk studies miss.\n\n## Where projects lose time\n- Incomplete baseline data on water, soils and biodiversity\n- Weak or undocumented stakeholder engagement\n- ESMPs that are generic rather than site-specific\n\nA NEMA-registered Lead Expert can guide proponents through each stage, from screening to licence conditions and annual audits."),
    dict(slug="sand-dams-asal-resilience", title="Why sand dams matter for resilience in Kenya’s ASALs", category="Water & WASH", date=date(2026, 8, 30), status="published",
         image="/assets/img/stock/samburu-arid.jpg",
         excerpt="In arid and semi-arid lands, a well-sited sand dam can store water through the dry season. Design and community ownership make the difference.",
         body="Across Kenya's arid and semi-arid lands (ASALs), seasonal rivers flow for only a few weeks a year. A sand dam is a reinforced wall built across the riverbed; sand accumulates behind it and stores water within its pores, protected from evaporation.\n\n## Siting is everything\nBedrock depth, sand quality, catchment size and distance to users all determine whether a dam will fill and stay full.\n\n## Community ownership\nWater User Associations that participate from design onwards are far more likely to maintain the structure and manage abstraction fairly.\n\nVerde-Scope's team has designed and supervised sand dam construction in Kajiado and continues to support integrated water resource management in dryland counties."),
    dict(slug="gis-forest-cover-monitoring", title="Monitoring forest cover with GIS and remote sensing", category="GIS & Research", date=date(2026, 8, 12), status="published",
         image="/assets/img/stock/mau-forest.jpg",
         excerpt="Free satellite archives now let counties and conservation partners track canopy change across entire water towers, season by season.",
         body="Kenya's water towers, including the Mau complex, supply rivers that sustain millions of people. Tracking change in forest cover used to require expensive aerial surveys. Today, open satellite archives make continuous monitoring possible.\n\n## From pixels to decisions\nVegetation indices derived from multispectral imagery reveal degradation hot-spots, while change detection between seasons highlights encroachment early enough to act.\n\n## Ground truthing still matters\nRemote sensing is most powerful when combined with field plots and community knowledge. Mobile data collection with Kobo Toolbox or ODK links what the satellite sees with what is happening on the ground."),
    dict(slug="climate-risk-assessments-lenders", title="Climate risk assessments: what lenders and investors now expect", category="Climate", date=date(2026, 7, 25), status="published",
         image="/assets/img/stock/hero-sunset.jpg",
         excerpt="Development finance institutions increasingly require physical and transition climate risk screening. Here is what a credible assessment covers.",
         body="Development finance institutions and commercial lenders increasingly ask borrowers to demonstrate that projects are resilient to a changing climate.\n\n## Physical risk\nHow will flooding, drought, heat and changing rainfall patterns affect the asset over its lifetime?\n\n## Transition risk\nHow exposed is the business to new regulation, carbon pricing or shifts in market demand?\n\n## Adaptation measures\nA good assessment does not stop at identifying risk; it proposes practical, costed adaptation measures that can be built into design and the ESMP."),
    dict(slug="kobo-odk-training-county-teams", title="Building data capacity: Kobo Toolbox and ODK training for field teams", category="Capacity Building", date=date(2026, 7, 2), status="draft",
         image="/assets/img/projects/community-baraza.jpg",
         excerpt="Digital data collection reduces errors and speeds up reporting. Our training approach focuses on practical, field-ready skills.",
         body="Digital data collection tools such as Kobo Toolbox and ODK have transformed monitoring and evaluation. Our training programmes take participants from form design to cleaning and analysing data, with exercises built around their own programmes."),
]

EVENTS = [
    dict(title="Irrigation & Water Distribution Infrastructure", date=date(2026, 6, 18), location="Kenya", category="Field Supervision", sample=False,
         description="Site supervision of agricultural irrigation schemes, pump houses and local water distribution infrastructure.",
         media=[("video", "/assets/video/field-highlights.mp4", "/assets/video/field-highlights.jpg", "Field highlights (video)", ""),
                ("image", "/assets/img/projects/pump-house.jpg", "", "Pump house and rising mains", ""),
                ("image", "/assets/img/projects/pump-station.jpg", "", "Pump station electrical and mechanical works", "")]),
    dict(title="Community Public Participation Forum", date=date(2026, 5, 9), location="Kenya", category="Stakeholder Engagement", sample=False,
         description="Public participation baraza held as part of an environmental and social impact assessment, giving affected residents a voice in project design.",
         media=[("image", "/assets/img/projects/community-baraza.jpg", "", "Residents attending the public baraza", ""),
                ("image", "/assets/img/projects/field-team.jpg", "", "Field team preparing for consultations", "")]),
    dict(title="Environmental Awareness & Tree Planting Day", date=date(2026, 4, 22), location="Western Kenya", category="Restoration", sample=True,
         description="Ecosystem restoration and environmental education activities with schools and community groups.",
         media=[("video", "/assets/video/restoration-day.mp4", "/assets/video/restoration-day.jpg", "Restoration day (video)", ""),
                ("image", "/assets/img/stock/tree-planting-school.jpg", "", "Learners planting seedlings", "MboyaFM / CC BY-SA 4.0"),
                ("image", "/assets/img/stock/tree-planter-2.jpg", "", "Community tree nursery", "Caroletravis / CC BY-SA 4.0"),
                ("image", "/assets/img/stock/tree-planter-3.jpg", "", "Seedling preparation", "Caroletravis / CC BY-SA 4.0")]),
    dict(title="Mau Water Tower Field Reconnaissance", date=date(2026, 2, 14), location="Mau Forest Complex", category="Natural Resources", sample=True,
         description="Reconnaissance of forest cover, springs and catchment conditions to inform watershed management planning.",
         media=[("image", "/assets/img/stock/mau-forest.jpg", "", "Mau Forest canopy", "Kaa.rie / CC BY-SA 4.0"),
                ("image", "/assets/img/stock/mau-spring.jpg", "", "Natural spring in the Mau", "Galkey / CC BY-SA 4.0"),
                ("image", "/assets/img/stock/mau-inside.jpg", "", "Forest interior", "Bett Duncan / CC BY-SA 4.0")]),
    dict(title="Landscapes We Work In", date=date(2025, 11, 30), location="Kenya", category="Landscapes", sample=True,
         description="From the Rift Valley to the rangelands of Samburu and the Tana River: the ecosystems at the heart of our work.",
         media=[("image", "/assets/img/stock/rift-valley.jpg", "", "Great Rift Valley", "Renvoy / CC BY 4.0"),
                ("image", "/assets/img/stock/hero-mara.jpg", "", "Maasai Mara rangeland", "Daniel Case / CC BY-SA 4.0"),
                ("image", "/assets/img/stock/samburu-arid.jpg", "", "Arid lands, Samburu", "Daniel Case / CC BY-SA 4.0"),
                ("image", "/assets/img/stock/tana-sunset.jpg", "", "Tana River at sunset", "Tish Madesh / CC0"),
                ("image", "/assets/img/stock/tana-satellite.jpg", "", "Tana River from orbit, for GIS analysis", "ESA / Copernicus Sentinel")]),
]


def seed_content(db: Session) -> None:
    db.add(SiteSettings(id=1, data=dict(DEFAULT_SETTINGS)))
    for i, (num, icon, title, image, summary, items) in enumerate(SERVICES):
        db.add(Service(num=num, icon=icon, title=title, image=image, summary=summary, items=items, sort_order=i))
    for title, client, year, location, typ in ASSIGNMENTS:
        db.add(Assignment(title=title, client=client, year=year, location=location, type=typ))
    for p in POSTS:
        db.add(Post(author="Verde-Scope Team", **p))
    for e in EVENTS:
        media = e.pop("media")
        ev = Event(**e)
        ev.media = [Media(type=t, src=s, poster=pv, caption=c, credit=cr, sort_order=i) for i, (t, s, pv, c, cr) in enumerate(media)]
        db.add(ev)


def seed_demo(db: Session) -> None:
    now = datetime.now(UTC)
    users = {
        "admin": User(name="System Administrator", email="admin@verdescope.demo", role="admin", org="Verde-Scope Africa", password_hash=hash_password("admin123")),
        "manager": User(name="Website Manager", email="manager@verdescope.demo", role="manager", org="Verde-Scope Africa", password_hash=hash_password("manager123")),
        "bomet": User(name="County Government of Bomet", email="stakeholder@verdescope.demo", role="stakeholder", org="County Government of Bomet", password_hash=hash_password("partner123")),
        "mara": User(name="Mara Water Users Association", email="mara.wua@verdescope.demo", role="stakeholder", org="Mara Water Users Association", password_hash=hash_password("partner123")),
    }
    db.add_all(users.values())
    db.flush()

    def ago(**kw):
        return now - timedelta(**kw)

    inq = [
        Inquiry(name="Grace Wanjiru", email="grace.wanjiru@example.com", phone="+254 711 000 111", org="Kericho Market Traders SACCO", service="Environmental & Climate Consultancy",
                subject="EIA for a proposed market complex", message="Hello, we are planning a three-storey market complex in Kericho town and need an EIA licence before construction. Could you share your process, timelines and a fee estimate?", created_at=ago(hours=20)),
        Inquiry(name="David Otieno", email="d.otieno@example.com", phone="+254 722 000 222", org="Lakeside Agro Processors Ltd", service="Occupational Health, Safety & Risk Management",
                subject="Annual environmental audit and OHS audit", message="We need our annual environmental audit and an OHS audit for our factory in Kisumu. Are you able to do both in October?", created_at=ago(days=1, hours=6)),
        Inquiry(name="Amina Hassan", email="amina.h@example.org", phone="+254 733 000 333", org="Northern Rangelands Resilience Initiative", service="Research, Monitoring, Evaluation & GIS",
                subject="Baseline survey and GIS mapping – Marsabit", message="We are designing a resilience programme in Marsabit and require a baseline survey with GIS mapping of water points. Please share relevant experience and a team proposal.",
                read=True, status="in-progress", created_at=ago(days=6)),
    ]
    bomet_msg = Inquiry(name="County Government of Bomet", email=users["bomet"].email, org="County Government of Bomet", service="Project update", source="stakeholder", user_id=users["bomet"].id,
                        subject="[ESIA – Proposed Market Construction, Bomet Town] Draft ESMP", message="Kindly share the draft ESMP for the Bomet town market project ahead of our technical committee meeting next week.",
                        read=True, status="replied", created_at=ago(days=4))
    db.add_all([*inq, bomet_msg])
    db.flush()
    db.add(OutboundEmail(inquiry_id=bomet_msg.id, from_email=DEFAULT_SETTINGS["mail_from"], to_email=bomet_msg.email, to_name=bomet_msg.name, subject="Re: " + bomet_msg.subject,
                         body="Dear Sir/Madam,\n\nThank you. The draft ESMP has been uploaded to your stakeholder dashboard under Reports & Documents.\n\n" + DEFAULT_SETTINGS["mail_signature"],
                         sent_by="Website Manager", delivered=False, error="Demo data", created_at=ago(days=4, hours=-5)))

    m = lambda *names: [{"t": t.lstrip("*"), "done": not t.startswith("*")} for t in names]  # noqa: E731  "*" = not done
    projects = [
        Project(org="County Government of Bomet", title="ESIA – Proposed Market Construction, Bomet Town", status="In progress", progress=72, start=date(2026, 6, 1), due=date(2026, 11, 15), lead="Lead ESIA Expert",
                milestones=m("Screening & scoping", "Baseline surveys", "Public participation", "*Draft ESIA & ESMP", "*NEMA submission")),
        Project(org="County Government of Bomet", title="Environmental Audit – Bomet Slaughter House", status="Report review", progress=90, start=date(2026, 7, 10), due=date(2026, 10, 20), lead="Environmental Auditor",
                milestones=m("Site inspection", "Compliance checklist", "Draft audit report", "*Final report")),
        Project(org="County Government of Bomet", title="Climate Risk Screening – County Water Projects", status="Planning", progress=15, start=date(2026, 9, 20), due=date(2027, 1, 30), lead="Climate Specialist",
                milestones=m("Inception report", "*Data collection", "*Risk modelling", "*Adaptation plan")),
        Project(org="Mara Water Users Association", title="IWRM Plan – Mulot Sub-catchment", status="In progress", progress=48, start=date(2026, 5, 15), due=date(2026, 12, 10), lead="Water Engineer",
                milestones=m("Catchment mapping", "Water use survey", "*Stakeholder workshops", "*Final plan")),
    ]
    db.add_all(projects)
    db.flush()
    for p_idx, name, size, d in [(0, "Inception Report – Bomet Market ESIA.pdf", 1_800_000, ago(days=110)), (0, "Public Participation Minutes.pdf", 640_000, ago(days=42)),
                                 (0, "Draft ESMP v1.docx", 980_000, ago(days=4)), (1, "Draft Environmental Audit Report.pdf", 2_400_000, ago(days=15)), (3, "Catchment Map – Mulot.pdf", 5_100_000, ago(days=65))]:
        db.add(Document(project_id=projects[p_idx].id, org=projects[p_idx].org, name=name, size=size, created_at=d))

    db.add_all([
        Announcement(date=date.today() - timedelta(days=3), title="Stakeholder portal launched", body="Track project progress, download reports and message the Verde-Scope team in one place."),
        Announcement(date=date.today() - timedelta(days=21), title="Office relocation", body="We are now at 5th Floor, One Africa Place, Westlands, Nairobi."),
    ])

    # Historical monthly traffic so the dashboard chart has shape on day one
    month_values = [820, 640, 910, 1040, 1180, 1120, 1350, 1420, 1510, 1690, 1880]
    first = date.today().replace(day=1)
    for i, v in enumerate(reversed(month_values), start=1):
        y, mo = first.year, first.month - i
        while mo <= 0:
            mo += 12
            y -= 1
        db.add(PageView(day=date(y, mo, 1), page="history", count=v))

    db.add_all([
        Activity(user_name="Website Manager", action="Published blog post “The EIA process in Kenya”", created_at=ago(days=1, hours=2)),
        Activity(user_name="Website Manager", action="Replied to County Government of Bomet", created_at=ago(days=4)),
    ])


def ensure_expertise(db: Session) -> None:
    if db.scalar(select(func.count()).select_from(Expertise)) == 0:
        for i, (sector, icon, summary, disciplines) in enumerate(EXPERTISE):
            db.add(Expertise(sector=sector, icon=icon, summary=summary, disciplines=disciplines, sort_order=i))
        log.info("Seeded sector expertise")


def ensure_admin(db: Session) -> None:
    s = get_settings()
    if s.admin_email and s.admin_password and not db.scalar(select(User.id).where(func.lower(User.email) == s.admin_email.lower())):
        db.add(User(name="Administrator", email=s.admin_email.lower(), role="admin", org="Verde-Scope Africa", password_hash=hash_password(s.admin_password)))
        log.info("Created admin user %s", s.admin_email)


def run() -> None:
    logging.basicConfig(level=logging.INFO)
    s = get_settings()
    with SessionLocal() as db:
        if db.scalar(select(func.count()).select_from(Service)) == 0:
            seed_content(db)
            log.info("Seeded company content")
            if s.seed_demo:
                seed_demo(db)
                log.info("Seeded demo users and data")
        ensure_expertise(db)
        ensure_admin(db)
        db.commit()


if __name__ == "__main__":
    run()
