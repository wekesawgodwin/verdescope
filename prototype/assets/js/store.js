/* Verde-Scope MVP data layer.
 * Everything lives in localStorage so the public site and the portal share state
 * in the same browser. Swap VS.db for API calls when a backend exists. */
(function () {
  const KEY = 'vs_db_v1';
  const SESSION = 'vs_session_v1';

  const img = (p) => (window.VS_ROOT || '') + p;

  const seed = () => ({
    settings: {
      companyName: 'Verde-Scope Africa Limited',
      tagline: 'Sustainable Solutions. Resilient Ecosystems. Thriving Communities.',
      phone1: '+254 725 318 476',
      phone2: '+254 733 450 975',
      publicEmail: 'verdescopeafricaltd@gmail.com',
      mailFrom: 'info@verdescopeafrica.co.ke',
      mailSignature: 'Kind regards,\nVerde-Scope Africa Limited\n5th Floor, One Africa Place, Westlands, Nairobi\n+254 725 318 476 | +254 733 450 975',
      address: '5th Floor, One Africa Place, Chiromo Road / Rhapta Road junction, Westlands, Nairobi',
      postal: 'P.O. Box 451-00610, Nairobi, Kenya',
      maintenance: false,
    },

    services: [
      { id: 's1', num: '01', icon: 'leaf', title: 'Environmental & Climate Consultancy', image: 'assets/img/stock/hero-mara.jpg',
        summary: 'Statutory environmental assessments, compliance and climate advisory that keep projects licensable, financeable and resilient.',
        items: ['EIA, ESIA, SEA and Environmental Audits (EA)', 'Environmental compliance and due diligence', 'ESMPs and climate risk assessments', 'Climate adaptation, carbon footprint and green growth'] },
      { id: 's2', num: '02', icon: 'drop', title: 'Natural Resource, WASH & Environmental Management', image: 'assets/img/stock/mau-spring.jpg',
        summary: 'Integrated land, water and ecosystem management that restores natural capital and secures water for communities.',
        items: ['Sustainable land and water management', 'Ecosystem restoration and biodiversity conservation', 'Watershed management and IWRM', 'Solid waste and wastewater management', 'ESG advisory and environmental risk assessment'] },
      { id: 's3', num: '03', icon: 'map', title: 'Research, Monitoring, Evaluation & GIS', image: 'assets/img/stock/tana-satellite.jpg',
        summary: 'Evidence for decisions: rigorous studies, third-party monitoring and spatial intelligence from field to satellite.',
        items: ['Baseline, midline and endline studies', 'MEAL and Third-Party Monitoring (TPM)', 'Socio-economic, market and policy research', 'GIS, remote sensing and spatial analysis', 'Surveys, feasibility studies and data analytics'] },
      { id: 's4', num: '04', icon: 'shield', title: 'Occupational Health, Safety & Risk Management', image: 'assets/img/projects/field-team.jpg',
        summary: 'Safer workplaces through structured audits, risk assessment and emergency preparedness planning.',
        items: ['OHS and EHS audits', 'Workplace risk assessments', 'Emergency preparedness and risk management'] },
      { id: 's5', num: '05', icon: 'people', title: 'Capacity Building & Institutional Development', image: 'assets/img/projects/community-baraza.jpg',
        summary: 'Training and technical advisory that leave institutions and communities stronger long after the project ends.',
        items: ['Technical advisory and professional training', 'Training in EIA, climate change, GIS, M&E, data collection (Kobo Toolbox & ODK), project management, RBM, WSP and IWRM', 'Customised capacity-building programmes tailored to client needs'] },
    ],

    // Representative entries from the 82 assignments in the 2026 company profile.
    assignments: [
      { title: 'ESIA for the proposed Malaso Dam, Narok South', client: 'Lalela Limited', year: 2021, location: 'Narok', type: 'ESIA' },
      { title: 'EIA for the proposed Kyogong – Kaboson roads construction', client: 'China Civil Constructions Corporation', year: 2021, location: 'Bomet', type: 'EIA' },
      { title: 'ESIA for periodic maintenance of Kipsigak–Serem Road', client: 'Kenya Rural Roads Authority', year: 2021, location: 'Nandi', type: 'ESIA' },
      { title: 'ESIA and supervision of the proposed Nandi County Textile Unit', client: 'County Government of Nandi', year: 2021, location: 'Nandi', type: 'ESIA' },
      { title: 'EIA for renovation and rehabilitation of Navalas Dam and water project, Soy', client: 'County Government of Uasin Gishu', year: 2021, location: 'Eldoret', type: 'EIA' },
      { title: 'Environmental Audits for Imarisha SACCO buildings in Bomet, Litein and Kericho', client: 'Imarisha SACCO Limited', year: 2021, location: 'Kericho', type: 'Audit' },
      { title: 'EIA for the removal and disposal of asbestos roofing, KPCU Coffee House', client: 'Woolwich Properties Limited', year: 2020, location: 'Nairobi', type: 'EIA' },
      { title: 'EIAs for road construction borrow pits, quarries and dumping sites – Londiani, Fort Ternan', client: 'Index Constructions Ltd / Sinohydro Bureau', year: 2020, location: 'Kericho', type: 'EIA' },
      { title: 'Environmental Audit and Impact Assessment for Chibut Tea Factory', client: 'Chibut Tea Factory', year: 2020, location: 'Nandi', type: 'Audit' },
      { title: 'EIA for the proposed stone quarry in Kaaboi area, Soy', client: 'China Henan International Cooperation Co.', year: 2020, location: 'Uasin Gishu', type: 'EIA' },
      { title: 'ESIA of floating jetty and associated structures in Shimoni', client: 'KMFRI / World Bank', year: 2019, location: 'Kwale', type: 'ESIA' },
      { title: 'ESIA for proposed grain dams and associated infrastructure, Moi’s Bridge', client: 'Cargill Kenya Limited', year: 2019, location: 'Uasin Gishu', type: 'ESIA' },
      { title: 'Full-study ESIA for Reale Hospital Centre, Elgon View', client: 'Reale Hospital', year: 2019, location: 'Uasin Gishu', type: 'ESIA' },
      { title: 'Environmental auditing of 30 public schools, Ziwa and Koisagat zones', client: 'Public schools, Soy Sub-County', year: 2019, location: 'Uasin Gishu', type: 'Audit' },
      { title: 'EIA for proposed bauxite mining at Itigo, Mosoriot', client: 'County Government of Nandi', year: 2019, location: 'Nandi', type: 'EIA' },
      { title: 'Full-study ESIA for Ainushamsi Energy Limited, Korando B', client: 'Ainushamsi Energy Limited', year: 2019, location: 'Kisumu', type: 'ESIA' },
      { title: 'Design, supervision and construction of 15 sand dams', client: 'Amref Health Africa', year: 2018, location: 'Kajiado', type: 'Water' },
      { title: 'Design and supervision of Oljoro mini-irrigation and water supply project, Mulot', client: 'GLOWS / WADA / WWF – Mara Water Users Association', year: 2018, location: 'Narok', type: 'Water' },
      { title: 'Design and supervision of Chebinyiny water supply project, Mulot', client: 'GLOWS / WADA / WWF – Mara Water Users Association', year: 2018, location: 'Narok', type: 'Water' },
      { title: 'EIA for 10 milk cooling plants in Bomet', client: 'County Government of Bomet', year: 2018, location: 'Bomet', type: 'EIA' },
      { title: 'EIA for Itembe borehole water project, Kapkwen', client: 'Bomet Municipal Council / European Union', year: 2018, location: 'Bomet', type: 'EIA' },
      { title: 'Environmental Audit for Tenwek Mission Hospital', client: 'Tenwek Mission Hospital', year: 2018, location: 'Bomet', type: 'Audit' },
      { title: 'Environmental Audit for Tirgaga Tea Factory', client: 'Tirgaga Tea Factory (KTDA)', year: 2018, location: 'Bomet', type: 'Audit' },
      { title: 'EIA for removal and disposal of asbestos roofing at Mogogosiek Hospital', client: 'County Government of Bomet', year: 2018, location: 'Bomet', type: 'EIA' },
    ],

    team: [
      { name: 'Kiprotich', role: 'Lead ESIA Expert', bio: 'B.Sc. Environmental Science. Community development, WASH, project and public health management, OHS. NEMA-registered Lead Expert.', years: '17+' },
      { name: 'Anis Yussuf Ibrahim', role: 'Environmental & Climate Specialist / MEAL & Research Expert', bio: 'M.Sc. Environmental Governance; B.Sc. Environmental Management & Conservation. Safeguards, MEAL, GIS and research across the Horn of Africa.', years: '10+' },
      { name: 'Jacqueline Muthura', role: 'Associate WASH Consultant, Capacity Building & Training', bio: 'B.Sc. Water & Environmental Engineering. Water Safety Planning, PRA and M&E in Kenya, Sudan, South Sudan and Ghana.', years: '10+' },
      { name: 'Dr. Ben Akala Musonye', role: 'Environmental Economist', bio: 'D.Phil. and M.Phil. in Environmental Studies (Environmental Economics).', years: '15+' },
      { name: 'Dr. Solomon Nzyuko', role: 'Associate Consultant / Sociologist', bio: 'Doctorate in Management; MA, BA Sociology. Strategic planning, programme M&E, fundraising and facilitation.', years: '20+' },
      { name: 'Dr. Eng. Joseph Kapkwany', role: 'Water Engineer', bio: 'PhD Environmental Engineering; M.Sc. Water Engineering; B.Sc. Hydrology.', years: '' },
      { name: 'Dr. Wycliff Manyulu', role: 'Public Health Specialist', bio: 'PhD Public Health; M.Sc. Epidemiology.', years: '15+' },
      { name: 'Zuber Ibrahim', role: 'Civil Engineer', bio: 'Construction project management, site supervision, QA, contract administration. AutoCAD, Civil 3D, Primavera P6.', years: '7+' },
    ],

    posts: [
      { id: 'p1', slug: 'eia-process-kenya-guide', title: 'The EIA process in Kenya: a practical guide for project proponents', category: 'Compliance', author: 'Verde-Scope Team', date: '2026-09-22', status: 'published',
        image: 'assets/img/stock/rift-valley.jpg',
        excerpt: 'Under EMCA, most development projects need a NEMA licence before ground is broken. Here is how the process works and where projects typically lose time.',
        body: 'Under the Environmental Management and Co-ordination Act (EMCA), most development projects in Kenya require an Environmental Impact Assessment licence from NEMA before construction begins. Understanding the process early saves months.\n\n## Screening and project reports\nThe first question is how significant the project\'s impacts are likely to be. Low-risk projects may proceed on a Project Report, while medium and high-risk projects require a full study with Terms of Reference approved by NEMA.\n\n## Public participation\nMeaningful consultation is not a box to tick. Barazas, key-informant interviews and questionnaires give affected communities a voice and frequently surface risks that desk studies miss.\n\n## Where projects lose time\n- Incomplete baseline data on water, soils and biodiversity\n- Weak or undocumented stakeholder engagement\n- ESMPs that are generic rather than site-specific\n\nA NEMA-registered Lead Expert can guide proponents through each stage, from screening to licence conditions and annual audits.' },
      { id: 'p2', slug: 'sand-dams-asal-resilience', title: 'Why sand dams matter for resilience in Kenya’s ASALs', category: 'Water & WASH', author: 'Verde-Scope Team', date: '2026-08-30', status: 'published',
        image: 'assets/img/stock/samburu-arid.jpg',
        excerpt: 'In arid and semi-arid lands, a well-sited sand dam can store water through the dry season. Design and community ownership make the difference.',
        body: 'Across Kenya\'s arid and semi-arid lands (ASALs), seasonal rivers flow for only a few weeks a year. A sand dam is a reinforced wall built across the riverbed; sand accumulates behind it and stores water within its pores, protected from evaporation.\n\n## Siting is everything\nBedrock depth, sand quality, catchment size and distance to users all determine whether a dam will fill and stay full.\n\n## Community ownership\nWater User Associations that participate from design onwards are far more likely to maintain the structure and manage abstraction fairly.\n\nVerde-Scope\'s team has designed and supervised sand dam construction in Kajiado and continues to support integrated water resource management in dryland counties.' },
      { id: 'p3', slug: 'gis-forest-cover-monitoring', title: 'Monitoring forest cover with GIS and remote sensing', category: 'GIS & Research', author: 'Verde-Scope Team', date: '2026-08-12', status: 'published',
        image: 'assets/img/stock/mau-forest.jpg',
        excerpt: 'Free satellite archives now let counties and conservation partners track canopy change across entire water towers, season by season.',
        body: 'Kenya\'s water towers, including the Mau complex, supply rivers that sustain millions of people. Tracking change in forest cover used to require expensive aerial surveys. Today, open satellite archives make continuous monitoring possible.\n\n## From pixels to decisions\nVegetation indices derived from multispectral imagery reveal degradation hot-spots, while change detection between seasons highlights encroachment early enough to act.\n\n## Ground truthing still matters\nRemote sensing is most powerful when combined with field plots and community knowledge. Mobile data collection with Kobo Toolbox or ODK links what the satellite sees with what is happening on the ground.' },
      { id: 'p4', slug: 'climate-risk-assessments-lenders', title: 'Climate risk assessments: what lenders and investors now expect', category: 'Climate', author: 'Verde-Scope Team', date: '2026-07-25', status: 'published',
        image: 'assets/img/stock/hero-sunset.jpg',
        excerpt: 'Development finance institutions increasingly require physical and transition climate risk screening. Here is what a credible assessment covers.',
        body: 'Development finance institutions and commercial lenders increasingly ask borrowers to demonstrate that projects are resilient to a changing climate.\n\n## Physical risk\nHow will flooding, drought, heat and changing rainfall patterns affect the asset over its lifetime?\n\n## Transition risk\nHow exposed is the business to new regulation, carbon pricing or shifts in market demand?\n\n## Adaptation measures\nA good assessment does not stop at identifying risk; it proposes practical, costed adaptation measures that can be built into design and the ESMP.' },
      { id: 'p5', slug: 'kobo-odk-training-county-teams', title: 'Building data capacity: Kobo Toolbox and ODK training for field teams', category: 'Capacity Building', author: 'Verde-Scope Team', date: '2026-07-02', status: 'draft',
        image: 'assets/img/projects/community-baraza.jpg',
        excerpt: 'Digital data collection reduces errors and speeds up reporting. Our training approach focuses on practical, field-ready skills.',
        body: 'Digital data collection tools such as Kobo Toolbox and ODK have transformed monitoring and evaluation. Our training programmes take participants from form design to cleaning and analysing data, with exercises built around their own programmes.' },
    ],

    events: [
      { id: 'e1', title: 'Irrigation & Water Distribution Infrastructure', date: '2026-06-18', location: 'Kenya', category: 'Field Supervision', sample: false,
        description: 'Site supervision of agricultural irrigation schemes, pump houses and local water distribution infrastructure.',
        media: [
          { type: 'video', src: 'assets/video/field-highlights.mp4', poster: 'assets/video/field-highlights.jpg', caption: 'Field highlights (video)' },
          { type: 'image', src: 'assets/img/projects/pump-house.jpg', caption: 'Pump house and rising mains' },
          { type: 'image', src: 'assets/img/projects/pump-station.jpg', caption: 'Pump station electrical and mechanical works' },
        ] },
      { id: 'e2', title: 'Community Public Participation Forum', date: '2026-05-09', location: 'Kenya', category: 'Stakeholder Engagement', sample: false,
        description: 'Public participation baraza held as part of an environmental and social impact assessment, giving affected residents a voice in project design.',
        media: [
          { type: 'image', src: 'assets/img/projects/community-baraza.jpg', caption: 'Residents attending the public baraza' },
          { type: 'image', src: 'assets/img/projects/field-team.jpg', caption: 'Field team preparing for consultations' },
        ] },
      { id: 'e3', title: 'Environmental Awareness & Tree Planting Day', date: '2026-04-22', location: 'Western Kenya', category: 'Restoration', sample: true,
        description: 'Ecosystem restoration and environmental education activities with schools and community groups.',
        media: [
          { type: 'video', src: 'assets/video/restoration-day.mp4', poster: 'assets/video/restoration-day.jpg', caption: 'Restoration day (video)' },
          { type: 'image', src: 'assets/img/stock/tree-planting-school.jpg', caption: 'Learners planting seedlings', credit: 'MboyaFM / CC BY-SA 4.0' },
          { type: 'image', src: 'assets/img/stock/tree-planter-2.jpg', caption: 'Community tree nursery', credit: 'Caroletravis / CC BY-SA 4.0' },
          { type: 'image', src: 'assets/img/stock/tree-planter-3.jpg', caption: 'Seedling preparation', credit: 'Caroletravis / CC BY-SA 4.0' },
        ] },
      { id: 'e4', title: 'Mau Water Tower Field Reconnaissance', date: '2026-02-14', location: 'Mau Forest Complex', category: 'Natural Resources', sample: true,
        description: 'Reconnaissance of forest cover, springs and catchment conditions to inform watershed management planning.',
        media: [
          { type: 'image', src: 'assets/img/stock/mau-forest.jpg', caption: 'Mau Forest canopy', credit: 'Kaa.rie / CC BY-SA 4.0' },
          { type: 'image', src: 'assets/img/stock/mau-spring.jpg', caption: 'Natural spring in the Mau', credit: 'Galkey / CC BY-SA 4.0' },
          { type: 'image', src: 'assets/img/stock/mau-inside.jpg', caption: 'Forest interior', credit: 'Bett Duncan / CC BY-SA 4.0' },
        ] },
      { id: 'e5', title: 'Landscapes We Work In', date: '2025-11-30', location: 'Kenya', category: 'Landscapes', sample: true,
        description: 'From the Rift Valley to the rangelands of Samburu and the Tana River: the ecosystems at the heart of our work.',
        media: [
          { type: 'image', src: 'assets/img/stock/rift-valley.jpg', caption: 'Great Rift Valley', credit: 'Renvoy / CC BY 4.0' },
          { type: 'image', src: 'assets/img/stock/hero-mara.jpg', caption: 'Maasai Mara rangeland', credit: 'Daniel Case / CC BY-SA 4.0' },
          { type: 'image', src: 'assets/img/stock/samburu-arid.jpg', caption: 'Arid lands, Samburu', credit: 'Daniel Case / CC BY-SA 4.0' },
          { type: 'image', src: 'assets/img/stock/tana-sunset.jpg', caption: 'Tana River at sunset', credit: 'Tish Madesh / CC0' },
          { type: 'image', src: 'assets/img/stock/tana-satellite.jpg', caption: 'Tana River from orbit, for GIS analysis', credit: 'ESA / Copernicus Sentinel' },
        ] },
    ],

    inquiries: [
      { id: 'm1', folder: 'inbox', source: 'website', name: 'Grace Wanjiru', email: 'grace.wanjiru@example.com', phone: '+254 711 000 111', org: 'Kericho Market Traders SACCO', service: 'Environmental & Climate Consultancy',
        subject: 'EIA for a proposed market complex', message: 'Hello, we are planning a three-storey market complex in Kericho town and need an EIA licence before construction. Could you share your process, timelines and a fee estimate?', date: '2026-10-02T08:42:00', read: false, status: 'new', thread: [] },
      { id: 'm2', folder: 'inbox', source: 'website', name: 'David Otieno', email: 'd.otieno@example.com', phone: '+254 722 000 222', org: 'Lakeside Agro Processors Ltd', service: 'Occupational Health, Safety & Risk Management',
        subject: 'Annual environmental audit and OHS audit', message: 'We need our annual environmental audit and an OHS audit for our factory in Kisumu. Are you able to do both in October?', date: '2026-10-01T14:10:00', read: false, status: 'new', thread: [] },
      { id: 'm3', folder: 'inbox', source: 'stakeholder', name: 'County Government of Bomet', email: 'stakeholder@verdescope.demo', phone: '', org: 'County Government of Bomet', service: 'Project update',
        subject: 'Request: draft ESMP for market construction', message: 'Kindly share the draft ESMP for the Bomet town market project ahead of our technical committee meeting next week.', date: '2026-09-29T10:05:00', read: true, status: 'replied',
        thread: [{ from: 'info@verdescopeafrica.co.ke', date: '2026-09-29T15:30:00', body: 'Dear Sir/Madam,\n\nThank you. The draft ESMP has been uploaded to your stakeholder dashboard under Reports & Documents.\n\nKind regards,\nVerde-Scope Africa Limited' }] },
      { id: 'm4', folder: 'inbox', source: 'website', name: 'Amina Hassan', email: 'amina.h@example.org', phone: '+254 733 000 333', org: 'Northern Rangelands Resilience Initiative', service: 'Research, Monitoring, Evaluation & GIS',
        subject: 'Baseline survey and GIS mapping – Marsabit', message: 'We are designing a resilience programme in Marsabit and require a baseline survey with GIS mapping of water points. Please share relevant experience and a team proposal.', date: '2026-09-27T09:00:00', read: true, status: 'in-progress', thread: [] },
    ],

    users: [
      { id: 'u1', name: 'System Administrator', email: 'admin@verdescope.demo', password: 'admin123', role: 'admin', active: true, org: 'Verde-Scope Africa', lastLogin: '2026-10-02T17:20:00' },
      { id: 'u2', name: 'Website Manager', email: 'manager@verdescope.demo', password: 'manager123', role: 'manager', active: true, org: 'Verde-Scope Africa', lastLogin: '2026-10-02T11:05:00' },
      { id: 'u3', name: 'County Government of Bomet', email: 'stakeholder@verdescope.demo', password: 'partner123', role: 'stakeholder', active: true, org: 'County Government of Bomet', lastLogin: '2026-09-29T09:58:00' },
      { id: 'u4', name: 'Mara Water Users Association', email: 'mara.wua@verdescope.demo', password: 'partner123', role: 'stakeholder', active: true, org: 'Mara Water Users Association', lastLogin: '2026-09-15T13:40:00' },
    ],

    projects: [
      { id: 'pr1', org: 'County Government of Bomet', title: 'ESIA – Proposed Market Construction, Bomet Town', status: 'In progress', progress: 72, start: '2026-06-01', due: '2026-11-15', lead: 'Lead ESIA Expert',
        milestones: [{ t: 'Screening & scoping', done: true }, { t: 'Baseline surveys', done: true }, { t: 'Public participation', done: true }, { t: 'Draft ESIA & ESMP', done: false }, { t: 'NEMA submission', done: false }] },
      { id: 'pr2', org: 'County Government of Bomet', title: 'Environmental Audit – Bomet Slaughter House', status: 'Report review', progress: 90, start: '2026-07-10', due: '2026-10-20', lead: 'Environmental Auditor',
        milestones: [{ t: 'Site inspection', done: true }, { t: 'Compliance checklist', done: true }, { t: 'Draft audit report', done: true }, { t: 'Final report', done: false }] },
      { id: 'pr3', org: 'County Government of Bomet', title: 'Climate Risk Screening – County Water Projects', status: 'Planning', progress: 15, start: '2026-09-20', due: '2027-01-30', lead: 'Climate Specialist',
        milestones: [{ t: 'Inception report', done: true }, { t: 'Data collection', done: false }, { t: 'Risk modelling', done: false }, { t: 'Adaptation plan', done: false }] },
      { id: 'pr4', org: 'Mara Water Users Association', title: 'IWRM Plan – Mulot Sub-catchment', status: 'In progress', progress: 48, start: '2026-05-15', due: '2026-12-10', lead: 'Water Engineer',
        milestones: [{ t: 'Catchment mapping', done: true }, { t: 'Water use survey', done: true }, { t: 'Stakeholder workshops', done: false }, { t: 'Final plan', done: false }] },
    ],

    documents: [
      { id: 'd1', org: 'County Government of Bomet', project: 'pr1', name: 'Inception Report – Bomet Market ESIA.pdf', size: '1.8 MB', date: '2026-06-14' },
      { id: 'd2', org: 'County Government of Bomet', project: 'pr1', name: 'Public Participation Minutes.pdf', size: '640 KB', date: '2026-08-21' },
      { id: 'd3', org: 'County Government of Bomet', project: 'pr1', name: 'Draft ESMP v1.docx', size: '980 KB', date: '2026-09-29' },
      { id: 'd4', org: 'County Government of Bomet', project: 'pr2', name: 'Draft Environmental Audit Report.pdf', size: '2.4 MB', date: '2026-09-18' },
      { id: 'd5', org: 'Mara Water Users Association', project: 'pr4', name: 'Catchment Map – Mulot.pdf', size: '5.1 MB', date: '2026-07-30' },
    ],

    announcements: [
      { id: 'a1', date: '2026-09-30', title: 'Stakeholder portal launched', body: 'Track project progress, download reports and message the Verde-Scope team in one place.' },
      { id: 'a2', date: '2026-09-12', title: 'Office relocation', body: 'We are now at 5th Floor, One Africa Place, Westlands, Nairobi.' },
    ],

    analytics: {
      monthly: [
        { m: 'Nov', v: 820 }, { m: 'Dec', v: 640 }, { m: 'Jan', v: 910 }, { m: 'Feb', v: 1040 }, { m: 'Mar', v: 1180 }, { m: 'Apr', v: 1120 },
        { m: 'May', v: 1350 }, { m: 'Jun', v: 1420 }, { m: 'Jul', v: 1510 }, { m: 'Aug', v: 1690 }, { m: 'Sep', v: 1880 }, { m: 'Oct', v: 240 },
      ],
      pages: {},
    },

    activity: [
      { date: '2026-10-02T17:20:00', user: 'System Administrator', action: 'Signed in' },
      { date: '2026-10-02T11:12:00', user: 'Website Manager', action: 'Published blog post “The EIA process in Kenya”' },
      { date: '2026-09-29T15:30:00', user: 'Website Manager', action: 'Replied to County Government of Bomet' },
      { date: '2026-09-29T09:58:00', user: 'County Government of Bomet', action: 'Downloaded Draft ESMP v1.docx' },
    ],
  });

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* fall through to seed */ }
    const s = seed();
    save(s);
    return s;
  }
  function save(d) {
    try { localStorage.setItem(KEY, JSON.stringify(d)); return true; }
    catch (e) { alert('Storage is full. Try a smaller image.'); return false; }
  }

  const uid = (p) => p + Math.random().toString(36).slice(2, 9);

  const VS = {
    get db() { return load(); },
    update(fn) { const d = load(); fn(d); return save(d); },
    reset() { localStorage.removeItem(KEY); return load(); },
    uid,
    img,
    log(user, action) {
      VS.update((d) => { d.activity.unshift({ date: new Date().toISOString(), user, action }); d.activity = d.activity.slice(0, 200); });
    },
    trackView(page) {
      VS.update((d) => {
        d.analytics.pages[page] = (d.analytics.pages[page] || 0) + 1;
        const last = d.analytics.monthly[d.analytics.monthly.length - 1];
        if (last) last.v += 1;
      });
    },
    submitInquiry(f) {
      const m = { id: uid('m'), folder: 'inbox', source: f.source || 'website', name: f.name, email: f.email, phone: f.phone || '', org: f.org || '',
        service: f.service || 'General', subject: f.subject || 'Website inquiry', message: f.message, date: new Date().toISOString(), read: false, status: 'new', thread: [] };
      VS.update((d) => { d.inquiries.unshift(m); });
      VS.log(f.name, `Sent an inquiry: “${m.subject}”`);
      return m;
    },
    // Session
    login(email, password) {
      const u = load().users.find((x) => x.email.toLowerCase() === String(email).toLowerCase().trim() && x.password === password);
      if (!u) return { error: 'Incorrect email or password.' };
      if (!u.active) return { error: 'This account has been deactivated. Contact the administrator.' };
      VS.update((d) => { const x = d.users.find((y) => y.id === u.id); x.lastLogin = new Date().toISOString(); });
      localStorage.setItem(SESSION, u.id);
      VS.log(u.name, 'Signed in');
      return { user: u };
    },
    logout() { localStorage.removeItem(SESSION); },
    currentUser() {
      const id = localStorage.getItem(SESSION);
      return id ? load().users.find((u) => u.id === id && u.active) || null : null;
    },
    // Helpers
    fmtDate(s, opts) {
      const d = new Date(s);
      return isNaN(d) ? s : d.toLocaleDateString('en-GB', opts || { day: 'numeric', month: 'short', year: 'numeric' });
    },
    esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); },
    // Tiny markdown: paragraphs, ## headings, - lists
    md(src) {
      const esc = VS.esc;
      return String(src || '').split(/\n{2,}/).map((block) => {
        const b = block.trim();
        const lines = b.split('\n');
        if (lines.every((l) => l.startsWith('- '))) return '<ul>' + lines.map((l) => `<li>${esc(l.slice(2))}</li>`).join('') + '</ul>';
        if (lines[0].startsWith('## ')) {
          const rest = lines.slice(1).join(' ').trim();
          return `<h2>${esc(lines[0].slice(3))}</h2>` + (rest ? `<p>${esc(rest)}</p>` : '');
        }
        return `<p>${esc(b).replace(/\n/g, '<br>')}</p>`;
      }).join('');
    },
    // Downscale an uploaded image to keep localStorage small
    fileToDataURL(file, max = 1400) {
      return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onerror = reject;
        r.onload = () => {
          const im = new Image();
          im.onload = () => {
            const s = Math.min(1, max / Math.max(im.width, im.height));
            const c = document.createElement('canvas');
            c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
            c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
            resolve(c.toDataURL('image/jpeg', 0.78));
          };
          im.onerror = reject;
          im.src = r.result;
        };
        r.readAsDataURL(file);
      });
    },
  };

  // Resolve stored relative asset paths from any page depth
  VS.src = (p) => (/^(data:|https?:|blob:)/.test(p) ? p : img(p));

  window.VS = VS;
})();
