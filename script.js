// --- 1. App Namespace & State ---
const App = {
    chartInstance: null,
    // Page-specific elements will be populated in their init functions
    elements: {},
};

// --- 2. Common Functions ---
const getReports = () => JSON.parse(localStorage.getItem('reports_db')) || [];
const saveReports = (reports) => localStorage.setItem('reports_db', JSON.stringify(reports));

const ICONS = {
    sun: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`,
    moon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`
};

const setTheme = (theme) => {
    localStorage.setItem('theme', theme);
    document.body.classList.toggle('light-theme', theme === 'light');
    const themeSwitcher = document.getElementById('theme-switcher');
    if (themeSwitcher) {
        themeSwitcher.innerHTML = theme === 'light' ? ICONS.moon : ICONS.sun;
    }
    // If the chart render function exists (i.e., we are on the dashboard), call it
    if (typeof App.renderCategoryChart === 'function') {
        App.renderCategoryChart();
    }
};

// --- 3. Page-Specific Modules ---

/**
 * Initializes the Form Page (index.html)
 */
App.initFormPage = () => {
    App.elements.reportForm = document.getElementById('report-form');
    App.elements.formContainer = document.getElementById('form-container');
    App.elements.submissionResult = document.getElementById('submission-result');
    App.elements.refNumberEl = document.getElementById('ref-number');
    App.elements.jsonOutputEl = document.getElementById('json-output');
    App.elements.submitAnotherBtn = document.getElementById('submit-another');

    const showSuccessScreen = (data) => {
        App.elements.refNumberEl.textContent = data.id;
        App.elements.jsonOutputEl.textContent = JSON.stringify(data, null, 2);
        App.elements.formContainer.classList.add('hidden');
        App.elements.submissionResult.classList.remove('hidden');
    };
    const showFormScreen = () => {
        App.elements.reportForm.reset();
        App.elements.submissionResult.classList.add('hidden');
        App.elements.formContainer.classList.remove('hidden');
    };

    App.elements.reportForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const requiredFields = ['report-type', 'location', 'date-incident', 'description', 'confirmation'];
        let isValid = true;
        requiredFields.forEach(field => {
            const element = App.elements.reportForm.elements[field];
            if ((element.type === 'checkbox' && !element.checked) || !element.value) {
                isValid = false;
            }
        });

        if (!isValid) {
            alert('Please fill out all required fields in the Report Details and Confirmation sections.');
            return;
        }

        const formData = new FormData(App.elements.reportForm);
        const isAnonymous = formData.get('anonymous') === 'on';
        const dateIncidentStr = formData.get('date-incident');
        const submissionTimestamp = dateIncidentStr ? new Date(dateIncidentStr).toISOString() : new Date().toISOString();

        const reportData = {
            id: `ETH-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`,
            submittedAt: submissionTimestamp,
            contact: { name: isAnonymous ? '' : formData.get('name'), email: isAnonymous ? '' : formData.get('email'), phone: isAnonymous ? '' : formData.get('phone') },
            details: { type: formData.get('report-type'), location: formData.get('location'), incidentDate: dateIncidentStr, description: formData.get('description') },
            additionalInfo: { witnesses: formData.get('witnesses') === 'on', evidence: formData.get('evidence') === 'on', previouslyReported: formData.get('previous-report') === 'on' },
            isAnonymous: isAnonymous
        };
        
        const existingReports = getReports();
        existingReports.push(reportData);
        saveReports(existingReports);
        showSuccessScreen(reportData);
    });
    
    App.elements.submitAnotherBtn.addEventListener('click', showFormScreen);
};

/**
 * Initializes the Reports Page (reports.html)
 */
App.initReportsPage = () => {
    // Automatic Data Fixer
    (function cleanAndValidateData() {
        let reports = getReports();
        if (reports.length > 0 && typeof reports[0].details === 'undefined') {
            console.warn('Old data format detected. Clearing localStorage to reset.');
            localStorage.removeItem('reports_db');
        }
    })();
    
    App.elements.reportsBody = document.getElementById('reportsBody');
    App.elements.q = document.getElementById('q');
    App.elements.detailModal = document.getElementById('detailModal');
    App.elements.detailContent = document.getElementById('detailContent');
    App.elements.closeModal = document.getElementById('closeModal');

    function seedInitialReports() {
        if (getReports().length > 0) return;
        const samples = []; const now = new Date(); const types = ['Fraud', 'Harassment', 'Ethics', 'Safety', 'Fraud', 'Other']; const locations = ['New York', 'London', 'Remote', 'Tokyo', 'Berlin', 'Chicago'];
        for (let i = 0; i < 6; i++) {
            const submissionDate = new Date(now.getTime() - (i * 15 * 24 * 60 * 60 * 1000));
            const incidentDate = new Date(submissionDate.getTime() - (Math.random() * 10 * 24 * 60 * 60 * 1000));
            const isAnon = i % 2 === 0;
            samples.push({ id: `ETH-${submissionDate.getFullYear()}-SEED${i + 1}`, submittedAt: submissionDate.toISOString(), contact: { name: isAnon ? '' : `Sample User ${i+1}`, email: isAnon ? '' : `user${i+1}@example.com`, phone: isAnon ? '' : '555-123-4567' }, details: { type: types[i], location: locations[i], incidentDate: incidentDate.toISOString().slice(0,10), description: `This is a sample hardcoded report for a ${types[i]} concern.` }, additionalInfo: { witnesses: i % 3 === 0, evidence: i % 2 !== 0, previouslyReported: i === 5 }, isAnonymous: isAnon });
        }
        saveReports(samples);
    }
    
    function formatDate(isoString) { if (!isoString) return '—'; try { return new Date(isoString).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); } catch (e) { return isoString; } }
    
    function renderList(filterText = '') {
        App.elements.reportsBody.innerHTML = '';
        const reports = getReports().slice().sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
        const ft = filterText.trim().toLowerCase();
        const shown = reports.filter(r => { if (!ft) return true; return (r.id || '').toLowerCase().includes(ft) || ((r.details||{}).type || '').toLowerCase().includes(ft) || ((r.details||{}).location || '').toLowerCase().includes(ft); });
        if (shown.length === 0) { App.elements.reportsBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:40px;">No reports found.</td></tr>`; return; }
        shown.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td style="font-weight:600">${r.id || '—'}</td><td>${formatDate(r.submittedAt)}</td><td>${(r.details && r.details.type) || '—'}</td><td>${(r.details && r.details.location) || '—'}</td><td><span class="status ${r.isAnonymous ? 'yes' : 'no'}">${r.isAnonymous ? 'Yes' : 'No'}</span></td><td><button class="ghost view-btn" data-id="${r.id}" style="padding: 6px 10px;">View</button></td>`;
            App.elements.reportsBody.appendChild(tr);
        });
    }

    function openDetail(id) {
        const r = getReports().find(x => x.id === id); if (!r) return;
        const c = r.contact || {}; const d = r.details || {}; const a = r.additionalInfo || {};
        App.elements.detailContent.innerHTML = `<div class="meta"><div><strong>Report ID</strong> ${r.id}</div><div><strong>Submission Date</strong> ${formatDate(r.submittedAt)}</div><div><strong>Incident Date</strong> ${d.incidentDate || '—'}</div><div><strong>Concern Type</strong> ${d.type || '—'}</div><div><strong>Location / Dept.</strong> ${d.location || '—'}</div><div><strong>Anonymous Submission</strong> ${r.isAnonymous ? 'Yes' : 'No'}</div></div><h4>Contact Information</h4><div class="meta"><div><strong>Name</strong> ${c.name || '—'}</div><div><strong>Email</strong> ${c.email || '—'}</div><div><strong>Phone</strong> ${c.phone || '—'}</div></div><h4>Additional Information</h4><div class="meta"><div><strong>Witnesses Present</strong> ${a.witnesses ? 'Yes' : 'No'}</div><div><strong>Evidence Available</strong> ${a.evidence ? 'Yes' : 'No'}</div><div><strong>Previously Reported</strong> ${a.previouslyReported ? 'Yes' : 'No'}</div></div><h4>Description</h4><p style="white-space:pre-wrap; color:var(--muted); margin-top:4px;">${d.description || '—'}</p><details><summary style="cursor:pointer; font-size:14px; margin-top:16px;">View Raw JSON Data</summary><pre>${JSON.stringify(r, null, 2)}</pre></details>`;
        App.elements.detailModal.classList.add('visible');
    }

    App.elements.reportsBody.addEventListener('click', (event) => {
        const viewButton = event.target.closest('.view-btn');
        if (viewButton) { openDetail(viewButton.dataset.id); }
    });
    
    App.elements.closeModal.addEventListener('click', () => App.elements.detailModal.classList.remove('visible'));
    App.elements.q.addEventListener('input', (e) => renderList(e.target.value));

    seedInitialReports();
    renderList();
};

/**
 * Initializes the Dashboard Page (dashboardnew.html)
 */
App.initDashboard = () => {
    Object.assign(App.elements, {
        kpiTotal: document.getElementById('kpi-total-reports'),
        kpiAnonymous: document.getElementById('kpi-anonymous-reports'),
        kpiCommonCategory: document.getElementById('kpi-common-category'),
        kpiLatest: document.getElementById('kpi-latest'),
        kpiReports30d: document.getElementById('kpi-reports-30d'),
        kpiAvgAge: document.getElementById('kpi-avg-age'),
        reportsTableBody: document.getElementById('reportsTableBody'),
        categoryChartCanvas: document.getElementById('categoryChart'),
    });

    function renderKpis() {
        const reports = getReports(); const now = Date.now();
        App.elements.kpiTotal.textContent = reports.length;
        App.elements.kpiAnonymous.textContent = reports.filter(r => r.isAnonymous).length;
        const categoryCounts = reports.reduce((acc, r) => { const type = (r.details || {}).type || 'Other'; acc[type] = (acc[type] || 0) + 1; return acc; }, {});
        let commonCategory = '-'; if (Object.keys(categoryCounts).length > 0) { commonCategory = Object.keys(categoryCounts).reduce((a, b) => categoryCounts[a] > categoryCounts[b] ? a : b); }
        App.elements.kpiCommonCategory.textContent = commonCategory;
        const reportsLast30d = reports.filter(r => (now - new Date(r.submittedAt).getTime()) <= 30 * 24 * 60 * 60 * 1000).length;
        App.elements.kpiReports30d.textContent = reportsLast30d;
        const ages = reports.map(r => (now - new Date(r.submittedAt).getTime()) / (24 * 60 * 60 * 1000));
        const avgAgeDays = ages.length ? (ages.reduce((s, a) => s + a, 0) / ages.length) : 0;
        App.elements.kpiAvgAge.textContent = avgAgeDays ? avgAgeDays.toFixed(1) + 'd' : '0d';
        const sortedReports = [...reports].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
        if (sortedReports.length > 0) {
            const latestReport = sortedReports[0]; const daysAgo = Math.floor((now - new Date(latestReport.submittedAt).getTime()) / (24*60*60*1000));
            let agoText = 'Today'; if (daysAgo === 1) { agoText = `Yesterday`; } else if (daysAgo > 1) { agoText = `${daysAgo}d ago`; }
            App.elements.kpiLatest.innerHTML = `<span style="font-size: 1.2rem; display: block;">${(latestReport.details||{}).type}</span><span style="font-size: 0.8rem; color: var(--muted);">${agoText}</span>`;
        } else { App.elements.kpiLatest.textContent = '-'; }
    }

    function renderReportsTable() {
        const reports = getReports().sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
        App.elements.reportsTableBody.innerHTML = '';
        if (reports.length === 0) { App.elements.reportsTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--muted);">No reports found.</td></tr>`; return; }
        reports.slice(0, 5).forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td style="font-weight:600">${r.id}</td><td>${new Date(r.submittedAt).toLocaleDateString()}</td><td>${(r.details||{}).type || '—'}</td><td>${(r.details||{}).location || '—'}</td><td><a href="reports.html" class="ghost" style="padding:4px 8px; font-size:12px; text-decoration:none;">View Details</a></td>`;
            App.elements.reportsTableBody.appendChild(tr);
        });
    }

    App.renderCategoryChart = () => {
        if (App.chartInstance) { App.chartInstance.destroy(); }
        const reports = getReports();
        const counts = reports.reduce((acc, r) => { const type = ((r.details||{}).type || 'Other'); acc[type] = (acc[type] || 0) + 1; return acc; }, {});
        const chartLabels = Object.keys(counts);
        if (chartLabels.length === 0) { App.elements.categoryChartCanvas.getContext('2d').clearRect(0,0,App.elements.categoryChartCanvas.width, App.elements.categoryChartCanvas.height); return; }
        const isLightTheme = document.body.classList.contains('light-theme');
        const tickColor = isLightTheme ? 'rgba(20, 30, 40, 0.6)' : 'rgba(255, 255, 255, 0.6)';
        const gridColor = isLightTheme ? 'rgba(0, 0, 0, 0.07)' : 'rgba(255, 255, 255, 0.04)';
        const preferred = ['Harassment', 'Fraud', 'Ethics', 'Safety', 'Legal', 'Other'];
        const orderedLabels = preferred.filter(p => chartLabels.includes(p)).concat(chartLabels.filter(l => !preferred.includes(l)).sort());
        const orderedData = orderedLabels.map(l => counts[l] || 0);
        App.chartInstance = new Chart(App.elements.categoryChartCanvas, {
            type: 'bar',
            data: {
                labels: orderedLabels,
                datasets: [{ label: '# of Reports', data: orderedData, backgroundColor: orderedLabels.map(l => { if (l === 'Fraud') return 'rgba(200,60,60,0.6)'; if (l === 'Harassment') return 'rgba(255,69,0,0.5)'; if (l === 'Ethics') return 'rgba(99,102,241,0.55)'; if (l === 'Safety') return 'rgba(245,158,11,0.6)'; if (l === 'Legal') return 'rgba(16,163,74,0.6)'; return 'rgba(160,160,160,0.45)'; }), borderWidth: 0, borderRadius: 4, barPercentage: 0.45, maxBarThickness: 18 }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { precision: 0, color: tickColor }, grid: { color: gridColor } }, x: { ticks: { color: tickColor }, grid: { display: false } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y}` } } } }
        });
    }

    function refreshDashboard() { renderKpis(); renderReportsTable(); App.renderCategoryChart(); }
    refreshDashboard();
};


    // --- 4. Main Initializer ---
    if (document.getElementById('report-form')) {
        App.initFormPage();
    } else if (document.getElementById('reportsBody')) {
        App.initReportsPage();
    } else if (document.getElementById('kpi-total-reports')) {
        App.initDashboard();
    }
    setTheme(localStorage.getItem('theme') || 'dark');