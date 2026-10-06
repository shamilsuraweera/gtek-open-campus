const API_BASE = '/api/v1';

let authToken = localStorage.getItem('gtek_token') || localStorage.getItem('token') || null;
let currentUser = null;
let allCourses = [];
let allStudents = [];
let allEnrollments = [];
let currentCourseLayout = 'grid';
let pendingDeleteAction = null;
let currentAttendanceDraft = {}; // studentId -> status

// Initialize Modals
let modals = {};

document.addEventListener('DOMContentLoaded', async () => {
    // Instantiate Bootstrap modals
    ['add-course', 'edit-course', 'add-student', 'edit-student', 'add-enrollment', 'bulk-enroll', 'add-session', 'add-assessment', 'transcript', 'confirm-delete'].forEach(name => {
        const el = document.getElementById(`modal-${name}`);
        if (el) modals[name] = new bootstrap.Modal(el);
    });

    // Login form handler
    const loginForm = document.getElementById('form-login');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Delete confirmation button
    const btnConfirmDelete = document.getElementById('btn-confirm-delete');
    if (btnConfirmDelete) {
        btnConfirmDelete.addEventListener('click', () => {
            if (pendingDeleteAction) {
                pendingDeleteAction();
                pendingDeleteAction = null;
            }
            modals['confirm-delete'].hide();
        });
    }

    // Hash change routing
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.replace('#', '') || 'dashboard';
        switchView(hash, false);
    });

    // Ensure session is authenticated without user friction
    await ensureAuthenticated();

    // Determine initial view from URL hash
    const initialView = window.location.hash.replace('#', '') || 'dashboard';
    switchView(initialView, false);
});

// ==================== AUTH & NOTIFICATIONS ====================

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toastId = 'toast-' + Date.now();
    const bgClass = type === 'success' ? 'bg-success' : type === 'danger' ? 'bg-danger' : 'bg-primary';
    const icon = type === 'success' ? 'bi-check-circle-fill' : type === 'danger' ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill';

    const html = `
        <div id="${toastId}" class="toast align-items-center text-white ${bgClass} border-0 shadow-lg mb-2" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body d-flex align-items-center gap-2">
                    <i class="bi ${icon} fs-5"></i>
                    <div>${message}</div>
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
    const toastEl = document.getElementById(toastId);
    const bsToast = new bootstrap.Toast(toastEl, { delay: 3500 });
    bsToast.show();
    toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

async function quickLogin(email = 'admin@gtek.edu', password = 'admin123', notify = true) {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
        });

        if (!res.ok) throw new Error('Auto-login failed');
        const data = await res.json();
        authToken = data.access_token;
        localStorage.setItem('gtek_token', authToken);
        localStorage.setItem('token', authToken);

        currentUser = await apiRequest('/users/me');
        updateUserUI();

        document.getElementById('view-login').style.display = 'none';
        document.getElementById('app-wrapper').style.display = 'block';

        if (notify) showToast(`Signed in as ${email}`, 'success');
        return true;
    } catch (err) {
        console.warn('Auto-login fallback failed:', err);
        return false;
    }
}

async function ensureAuthenticated() {
    if (authToken) {
        try {
            currentUser = await apiRequest('/users/me');
            updateUserUI();
            document.getElementById('view-login').style.display = 'none';
            document.getElementById('app-wrapper').style.display = 'block';
            return;
        } catch (e) {
            console.warn('Existing token expired, re-authenticating seamlessly...');
        }
    }

    // Seamless auto-login as default Admin for local development/testing
    const success = await quickLogin('admin@gtek.edu', 'admin123', false);
    if (!success) {
        showLoginView();
    }
}

function updateUserUI() {
    if (!currentUser) return;
    const emailEl = document.getElementById('user-display-email');
    const roleEl = document.getElementById('user-display-role');
    const avatarEl = document.getElementById('user-avatar');
    if (emailEl) emailEl.innerText = currentUser.email;
    if (roleEl) roleEl.innerText = currentUser.role.toUpperCase();
    if (avatarEl) avatarEl.innerText = currentUser.email.charAt(0).toUpperCase();
}

async function apiRequest(endpoint, method = 'GET', body = null, isFormData = false) {
    const headers = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    if (!isFormData && body) headers['Content-Type'] = 'application/json';

    const options = { method, headers };
    if (body) {
        options.body = isFormData ? body : JSON.stringify(body);
    }

    try {
        let response = await fetch(`${API_BASE}${endpoint}`, options);
        
        // Auto re-authenticate if token expired instead of throwing user back to login!
        if (response.status === 401 && endpoint !== '/auth/login') {
            const reauthed = await quickLogin('admin@gtek.edu', 'admin123', false);
            if (reauthed) {
                headers['Authorization'] = `Bearer ${authToken}`;
                response = await fetch(`${API_BASE}${endpoint}`, options);
            } else {
                showLoginView();
                throw new Error('Session expired. Please log in.');
            }
        }

        const data = await response.json().catch(() => null);
        if (!response.ok) {
            throw new Error((data && (data.detail || data.message)) || `HTTP error ${response.status}`);
        }
        return data;
    } catch (err) {
        showToast(err.message, 'danger');
        throw err;
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    await quickLogin(email, password, true);
    switchView('dashboard');
}

function showLoginView() {
    document.getElementById('app-wrapper').style.display = 'none';
    document.getElementById('view-login').style.display = 'flex';
}

function logout() {
    localStorage.removeItem('gtek_token');
    localStorage.removeItem('token');
    authToken = null;
    currentUser = null;
    showToast('Signed out', 'info');
    showLoginView();
}

// ==================== VIEW SWITCHER (WITH URL HASH ROUTING) ====================

function switchView(viewName, updateHash = true) {
    if (updateHash) {
        window.location.hash = viewName;
    }

    document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${viewName}` || link.getAttribute('onclick')?.includes(viewName)) {
            link.classList.add('active');
        }
    });

    document.querySelectorAll('.page-view').forEach(view => view.style.display = 'none');
    const target = document.getElementById(`view-${viewName}`);
    if (target) target.style.display = 'block';

    const titles = {
        'dashboard': 'System Dashboard & Reporting',
        'courses': 'Course Catalog & Management',
        'students': 'Student Directory',
        'enrollments': 'Student Enrollments',
        'attendance': 'Class Attendance Tracker',
        'gradebook': 'Gradebook & Assessments'
    };
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.innerText = titles[viewName] || 'G-TEK Campus';

    // Lazy load view data
    if (viewName === 'dashboard') loadDashboard();
    if (viewName === 'courses') loadCourses();
    if (viewName === 'students') loadStudents();
    if (viewName === 'enrollments') loadEnrollments();
    if (viewName === 'attendance') loadAttendance();
    if (viewName === 'gradebook') loadGradebook();
}

// ==================== DASHBOARD VIEW ====================

async function loadDashboard() {
    try {
        const [courses, students, enrollments, attRates, gradeDist] = await Promise.all([
            apiRequest('/courses/').catch(() => []),
            apiRequest('/students/').catch(() => []),
            apiRequest('/enrollments/').catch(() => []),
            apiRequest('/reporting/attendance-rates').catch(() => []),
            apiRequest('/reporting/grade-distributions').catch(() => [])
        ]);

        allCourses = courses;
        allStudents = students;
        allEnrollments = enrollments;

        const kpiCourses = document.getElementById('kpi-courses');
        const kpiStudents = document.getElementById('kpi-students');
        const kpiEnrollments = document.getElementById('kpi-enrollments');
        if (kpiCourses) kpiCourses.innerText = courses.length;
        if (kpiStudents) kpiStudents.innerText = students.length;
        if (kpiEnrollments) kpiEnrollments.innerText = enrollments.length;

        // Render Attendance MV Table
        const attBody = document.getElementById('dash-attendance-body');
        if (attBody) {
            if (attRates.length === 0) {
                attBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">No attendance metrics yet. Refresh MVs to compute.</td></tr>`;
            } else {
                attBody.innerHTML = attRates.map(r => {
                    const c = courses.find(x => x.id === r.course_id);
                    const title = c ? `${c.code} - ${c.title}` : `Course #${r.course_id}`;
                    const badgeClass = r.attendance_rate >= 75 ? 'bg-success' : r.attendance_rate >= 50 ? 'bg-warning' : 'bg-danger';
                    return `
                        <tr>
                            <td class="fw-semibold">${title}</td>
                            <td>${r.total_sessions} sessions</td>
                            <td>${r.present_count} present</td>
                            <td><span class="badge ${badgeClass} rounded-pill">${r.attendance_rate.toFixed(1)}%</span></td>
                        </tr>
                    `;
                }).join('');
            }
        }

        // Render Grade MV Table
        const grdBody = document.getElementById('dash-grades-body');
        if (grdBody) {
            if (gradeDist.length === 0) {
                grdBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">No grade metrics yet. Refresh MVs to compute.</td></tr>`;
            } else {
                grdBody.innerHTML = gradeDist.map(g => {
                    const c = courses.find(x => x.id === g.course_id);
                    const title = c ? `${c.code} - ${c.title}` : `Course #${g.course_id}`;
                    return `
                        <tr>
                            <td class="fw-semibold">${title}</td>
                            <td class="fw-bold text-primary">${g.average_score.toFixed(1)} / 100</td>
                            <td><span class="badge bg-success bg-opacity-10 text-success fw-bold">${g.max_score.toFixed(1)}</span></td>
                            <td><span class="badge bg-danger bg-opacity-10 text-danger fw-bold">${g.min_score.toFixed(1)}</span></td>
                        </tr>
                    `;
                }).join('');
            }
        }
    } catch (e) {
        console.error(e);
    }
}

async function triggerRefreshMVs() {
    try {
        await apiRequest('/reporting/refresh-views', 'POST');
        showToast('Background refresh triggered! Syncing in 1.5s...', 'info');
        setTimeout(() => {
            loadDashboard();
            showToast('Materialized views refreshed successfully!', 'success');
        }, 1500);
    } catch (e) {}
}

// ==================== COURSES CRUD ====================

function setCourseLayout(layout) {
    currentCourseLayout = layout;
    const btnGrid = document.getElementById('btn-courses-grid');
    const btnTable = document.getElementById('btn-courses-table');
    if (btnGrid) btnGrid.classList.toggle('active', layout === 'grid');
    if (btnTable) btnTable.classList.toggle('active', layout === 'table');
    
    const gridContainer = document.getElementById('courses-grid-container');
    const tableContainer = document.getElementById('courses-table-container');
    if (gridContainer) gridContainer.style.display = layout === 'grid' ? 'flex' : 'none';
    if (tableContainer) tableContainer.style.display = layout === 'table' ? 'block' : 'none';
    renderCourses();
}

async function loadCourses() {
    allCourses = await apiRequest('/courses/').catch(() => []);
    allEnrollments = await apiRequest('/enrollments/').catch(() => []);
    renderCourses();
}

function renderCourses() {
    const filter = (document.getElementById('course-search-input')?.value || '').toLowerCase();
    const filtered = allCourses.filter(c => c.title.toLowerCase().includes(filter) || c.code.toLowerCase().includes(filter));

    // Render Canvas Cards Grid
    const colors = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#db2777', '#0891b2'];
    const gridContainer = document.getElementById('courses-grid-container');
    if (gridContainer) {
        gridContainer.innerHTML = filtered.map((c, idx) => {
            const enrolledCount = allEnrollments.filter(e => e.course_id === c.id).length;
            const color = colors[idx % colors.length];
            return `
                <div class="col-md-4">
                    <div class="course-card">
                        <div class="course-card-banner" style="background-color: ${color};">
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="course-code">${c.code}</span>
                                <div class="dropdown">
                                    <button class="btn btn-sm btn-link text-white p-0" data-bs-toggle="dropdown"><i class="bi bi-three-dots-vertical fs-5"></i></button>
                                    <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0">
                                        <li><a class="dropdown-item" href="javascript:void(0)" onclick="openEditCourseModal(${c.id})"><i class="bi bi-pencil me-2"></i>Edit Course</a></li>
                                        <li><hr class="dropdown-divider"></li>
                                        <li><a class="dropdown-item text-danger" href="javascript:void(0)" onclick="confirmDeleteCourse(${c.id}, '${c.title}')"><i class="bi bi-trash me-2"></i>Delete Course</a></li>
                                    </ul>
                                </div>
                            </div>
                            <h5 class="fw-bold mb-0 text-white text-truncate mt-3">${c.title}</h5>
                        </div>
                        <div class="course-card-body">
                            <div>
                                <div class="d-flex justify-content-between align-items-center small text-muted mb-2">
                                    <span>Capacity: <b>${enrolledCount} / ${c.capacity}</b></span>
                                    <span>${Math.round((enrolledCount / c.capacity) * 100)}%</span>
                                </div>
                                <div class="progress mb-3" style="height: 6px;">
                                    <div class="progress-bar" style="width: ${Math.min((enrolledCount / c.capacity) * 100, 100)}%; background-color: ${color};"></div>
                                </div>
                                <div class="d-flex flex-wrap gap-1">
                                    ${c.metadata_obj && c.metadata_obj.lab_required ? '<span class="badge bg-info bg-opacity-10 text-info">🔬 Lab Required</span>' : ''}
                                    <span class="badge bg-light text-dark border">Teacher #${c.teacher_id}</span>
                                </div>
                            </div>
                            <div class="d-flex justify-content-end gap-2 mt-4 pt-2 border-top">
                                <button class="btn btn-outline-secondary btn-sm" onclick="openEditCourseModal(${c.id})"><i class="bi bi-pencil"></i> Edit</button>
                                <button class="btn btn-outline-danger btn-sm" onclick="confirmDeleteCourse(${c.id}, '${c.title}')"><i class="bi bi-trash"></i></button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Render Table View
    const tableBody = document.getElementById('courses-table-body');
    if (tableBody) {
        tableBody.innerHTML = filtered.map(c => `
            <tr>
                <td class="fw-bold">${c.code}</td>
                <td>${c.title}</td>
                <td>Teacher #${c.teacher_id}</td>
                <td><span class="badge bg-secondary">${c.capacity} seats</span></td>
                <td><code class="small">${JSON.stringify(c.metadata_obj || {})}</code></td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="openEditCourseModal(${c.id})"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="confirmDeleteCourse(${c.id}, '${c.title}')"><i class="bi bi-trash"></i></button>
                </td>
            </tr>
        `).join('');
    }
}

function filterCourses() {
    renderCourses();
}

function openAddCourseModal() {
    document.getElementById('form-add-course').reset();
    modals['add-course'].show();
}

async function submitAddCourse(e) {
    e.preventDefault();
    const title = document.getElementById('add-course-title').value;
    const code = document.getElementById('add-course-code').value;
    const capacity = parseInt(document.getElementById('add-course-capacity').value);
    const notes = document.getElementById('add-course-notes').value;

    const metadata_obj = notes ? { syllabus_note: notes, lab_required: notes.toLowerCase().includes('lab') } : {};

    try {
        await apiRequest('/courses/', 'POST', { title, code, capacity, metadata_obj });
        showToast(`Course "${title}" created!`, 'success');
        modals['add-course'].hide();
        loadCourses();
    } catch (e) {}
}

function openEditCourseModal(id) {
    const course = allCourses.find(c => c.id === id);
    if (!course) return;
    document.getElementById('edit-course-id').value = course.id;
    document.getElementById('edit-course-title').value = course.title;
    document.getElementById('edit-course-code').value = course.code;
    document.getElementById('edit-course-capacity').value = course.capacity;
    modals['edit-course'].show();
}

async function submitEditCourse(e) {
    e.preventDefault();
    const id = document.getElementById('edit-course-id').value;
    const title = document.getElementById('edit-course-title').value;
    const code = document.getElementById('edit-course-code').value;
    const capacity = parseInt(document.getElementById('edit-course-capacity').value);

    try {
        await apiRequest(`/courses/${id}`, 'PUT', { title, code, capacity });
        showToast('Course updated successfully!', 'success');
        modals['edit-course'].hide();
        loadCourses();
    } catch (e) {}
}

function confirmDeleteCourse(id, title) {
    document.getElementById('confirm-delete-msg').innerText = `Are you sure you want to permanently delete course "${title}"? This will drop all related enrollments and sessions!`;
    pendingDeleteAction = async () => {
        try {
            await apiRequest(`/courses/${id}`, 'DELETE');
            showToast(`Course "${title}" deleted.`, 'success');
            loadCourses();
        } catch (e) {}
    };
    modals['confirm-delete'].show();
}

// ==================== STUDENTS CRUD ====================

async function loadStudents() {
    allStudents = await apiRequest('/students/').catch(() => []);
    renderStudents();
}

function renderStudents() {
    const filter = (document.getElementById('student-search-input')?.value || '').toLowerCase();
    const filtered = allStudents.filter(s => 
        s.first_name.toLowerCase().includes(filter) ||
        s.last_name.toLowerCase().includes(filter) ||
        s.student_id_number.toLowerCase().includes(filter)
    );

    const tbody = document.getElementById('students-table-body');
    if (!tbody) return;
    tbody.innerHTML = filtered.map(s => {
        const email = s.user ? s.user.email : 'N/A';
        const role = s.user ? s.user.role : 'student';
        return `
            <tr>
                <td>
                    <div class="d-flex align-items-center gap-2">
                        <div class="rounded-circle bg-secondary bg-opacity-10 text-secondary fw-bold d-flex align-items-center justify-content-center" style="width: 32px; height: 32px; font-size: 0.85rem;">
                            ${s.first_name.charAt(0)}${s.last_name.charAt(0)}
                        </div>
                        <div class="fw-semibold">${s.first_name} ${s.last_name}</div>
                    </div>
                </td>
                <td><span class="badge bg-light text-dark border font-monospace">${s.student_id_number}</span></td>
                <td><span class="text-muted small">${email}</span></td>
                <td><span class="badge bg-primary bg-opacity-10 text-primary">${role}</span></td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-info me-1" onclick="viewStudentTranscript(${s.id})" title="Official Transcript"><i class="bi bi-file-earmark-text"></i> Transcript</button>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="openEditStudentModal(${s.id})"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-outline-danger" onclick="confirmDeleteStudent(${s.id}, '${s.first_name} ${s.last_name}')"><i class="bi bi-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');
}

function filterStudents() {
    renderStudents();
}

function openAddStudentModal() {
    document.getElementById('form-add-student').reset();
    modals['add-student'].show();
}

async function submitAddStudent(e) {
    e.preventDefault();
    const first_name = document.getElementById('add-student-fname').value;
    const last_name = document.getElementById('add-student-lname').value;
    const student_id_number = document.getElementById('add-student-idnum').value;
    const email = document.getElementById('add-student-email').value || undefined;
    const password = document.getElementById('add-student-pass').value || undefined;

    try {
        await apiRequest('/students/', 'POST', { first_name, last_name, student_id_number, email, password });
        showToast(`Student ${first_name} ${last_name} registered!`, 'success');
        modals['add-student'].hide();
        loadStudents();
    } catch (e) {}
}

function openEditStudentModal(id) {
    const student = allStudents.find(s => s.id === id);
    if (!student) return;
    document.getElementById('edit-student-id').value = student.id;
    document.getElementById('edit-student-fname').value = student.first_name;
    document.getElementById('edit-student-lname').value = student.last_name;
    document.getElementById('edit-student-idnum').value = student.student_id_number;
    modals['edit-student'].show();
}

async function submitEditStudent(e) {
    e.preventDefault();
    const id = document.getElementById('edit-student-id').value;
    const first_name = document.getElementById('edit-student-fname').value;
    const last_name = document.getElementById('edit-student-lname').value;
    const student_id_number = document.getElementById('edit-student-idnum').value;

    try {
        await apiRequest(`/students/${id}`, 'PUT', { first_name, last_name, student_id_number });
        showToast('Student information updated!', 'success');
        modals['edit-student'].hide();
        loadStudents();
    } catch (e) {}
}

function confirmDeleteStudent(id, name) {
    document.getElementById('confirm-delete-msg').innerText = `Are you sure you want to permanently delete student ${name}? This will remove all grades and attendance records!`;
    pendingDeleteAction = async () => {
        try {
            await apiRequest(`/students/${id}`, 'DELETE');
            showToast(`Student ${name} deleted.`, 'success');
            loadStudents();
        } catch (e) {}
    };
    modals['confirm-delete'].show();
}

async function viewStudentTranscript(studentId) {
    const modalBody = document.getElementById('transcript-modal-body');
    modalBody.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary" role="status"></div></div>';
    modals['transcript'].show();

    try {
        const student = allStudents.find(s => s.id === studentId);
        const data = await apiRequest(`/gradebook/transcript/${studentId}`);
        const courses = await apiRequest('/courses/');

        const gpaColor = data.gpa >= 3.5 ? 'text-success' : data.gpa >= 2.5 ? 'text-primary' : 'text-danger';

        let html = `
            <div class="text-center mb-4 pb-3 border-bottom">
                <h4 class="fw-bold mb-1">${student ? `${student.first_name} ${student.last_name}` : `Student #${studentId}`}</h4>
                <div class="text-muted small mb-3">Student ID: <code>${student ? student.student_id_number : studentId}</code></div>
                <div class="display-3 fw-bold ${gpaColor}">${data.gpa.toFixed(2)}</div>
                <span class="badge bg-light text-secondary border text-uppercase">Cumulative GPA</span>
            </div>
            <h6 class="fw-bold mb-3">Enrolled Course Grades</h6>
            <div class="list-group list-group-flush border rounded-3">
        `;

        if (!data.courses || data.courses.length === 0) {
            html += `<div class="p-3 text-center text-muted small">No completed courses or grades found.</div>`;
        } else {
            data.courses.forEach(c => {
                const courseObj = courses.find(x => x.id === c.course_id);
                const title = courseObj ? `${courseObj.code} - ${courseObj.title}` : `Course #${c.course_id}`;
                const gradeBadge = c.letter_grade === 'A' ? 'bg-success' : c.letter_grade === 'B' ? 'bg-primary' : c.letter_grade === 'C' ? 'bg-warning' : 'bg-danger';
                html += `
                    <div class="list-group-item d-flex justify-content-between align-items-center py-3">
                        <div>
                            <div class="fw-semibold">${title}</div>
                            <small class="text-muted">Weighted Final: ${c.final_score.toFixed(1)}%</small>
                        </div>
                        <span class="badge ${gradeBadge} fs-6 px-3 py-2">${c.letter_grade}</span>
                    </div>
                `;
            });
        }
        html += `</div>`;
        modalBody.innerHTML = html;
    } catch (e) {
        modalBody.innerHTML = `<div class="alert alert-danger">Failed to load transcript data.</div>`;
    }
}

// ==================== ENROLLMENTS CRUD ====================

async function loadEnrollments() {
    const courseId = document.getElementById('enrollment-filter-course')?.value || null;
    const endpoint = courseId ? `/enrollments/?course_id=${courseId}` : '/enrollments/';
    allEnrollments = await apiRequest(endpoint).catch(() => []);

    // Populate course filter dropdown if empty
    const filterSelect = document.getElementById('enrollment-filter-course');
    if (filterSelect && filterSelect.options.length <= 1) {
        allCourses = await apiRequest('/courses/').catch(() => []);
        allCourses.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.innerText = `${c.code} - ${c.title}`;
            filterSelect.appendChild(opt);
        });
    }

    const tbody = document.getElementById('enrollments-table-body');
    if (!tbody) return;
    tbody.innerHTML = allEnrollments.map(e => `
        <tr>
            <td class="text-muted">#${e.id}</td>
            <td class="fw-semibold">${e.student_name || `Student #${e.student_id}`}</td>
            <td><span class="badge bg-primary bg-opacity-10 text-primary">${e.course_code || 'CODE'}</span> ${e.course_title || `Course #${e.course_id}`}</td>
            <td class="small text-muted">${new Date(e.enrolled_at).toLocaleDateString()}</td>
            <td><span class="badge bg-success rounded-pill">${e.status}</span></td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-danger" onclick="confirmDeleteEnrollment(${e.id})" title="Drop Course"><i class="bi bi-x-circle me-1"></i> Drop</button>
            </td>
        </tr>
    `).join('');
}

async function openAddEnrollmentModal() {
    allStudents = await apiRequest('/students/').catch(() => []);
    allCourses = await apiRequest('/courses/').catch(() => []);

    const stuSelect = document.getElementById('enroll-student-select');
    stuSelect.innerHTML = allStudents.map(s => `<option value="${s.id}">${s.first_name} ${s.last_name} (${s.student_id_number})</option>`).join('');

    const crsSelect = document.getElementById('enroll-course-select');
    crsSelect.innerHTML = allCourses.map(c => `<option value="${c.id}">${c.code} - ${c.title} (Cap: ${c.capacity})</option>`).join('');

    modals['add-enrollment'].show();
}

async function submitAddEnrollment(e) {
    e.preventDefault();
    const student_id = parseInt(document.getElementById('enroll-student-select').value);
    const course_id = parseInt(document.getElementById('enroll-course-select').value);

    try {
        await apiRequest('/enrollments/', 'POST', { student_id, course_id, status: 'Active' });
        showToast('Student enrolled successfully!', 'success');
        modals['add-enrollment'].hide();
        loadEnrollments();
    } catch (e) {}
}

function confirmDeleteEnrollment(id) {
    document.getElementById('confirm-delete-msg').innerText = `Drop student from this enrollment (#${id})?`;
    pendingDeleteAction = async () => {
        try {
            await apiRequest(`/enrollments/${id}`, 'DELETE');
            showToast('Enrollment dropped.', 'success');
            loadEnrollments();
        } catch (e) {}
    };
    modals['confirm-delete'].show();
}

function openBulkEnrollModal() {
    modals['bulk-enroll'].show();
}

async function submitBulkEnrollment(e) {
    e.preventDefault();
    const fileInput = document.getElementById('bulk-csv-file');
    if (!fileInput.files[0]) return;

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    try {
        const res = await apiRequest('/enrollments/bulk-import', 'POST', formData, true);
        showToast(`Imported ${res.success_count} enrollments!`, 'success');
        modals['bulk-enroll'].hide();
        loadEnrollments();
    } catch (e) {}
}

// ==================== ATTENDANCE ====================

async function loadAttendance() {
    allCourses = await apiRequest('/courses/').catch(() => []);
    const select = document.getElementById('att-select-course');
    if (select) {
        select.innerHTML = `<option value="">-- Choose Course --</option>` + allCourses.map(c => `<option value="${c.id}">${c.code} - ${c.title}</option>`).join('');
    }
    const sessionSelect = document.getElementById('att-select-session');
    if (sessionSelect) sessionSelect.innerHTML = `<option value="">-- Choose Session --</option>`;
    const rosterBody = document.getElementById('att-roster-body');
    if (rosterBody) rosterBody.innerHTML = `<tr><td colspan="4" class="text-center py-5 text-muted">Select a course and session to begin marking attendance.</td></tr>`;
    const btnSave = document.getElementById('btn-save-attendance');
    if (btnSave) btnSave.disabled = true;
}

async function onAttendanceCourseChange() {
    const courseId = document.getElementById('att-select-course').value;
    if (!courseId) return;

    const sessions = await apiRequest(`/sessions/?course_id=${courseId}`).catch(() => []);
    const sessionSelect = document.getElementById('att-select-session');
    if (sessionSelect) {
        if (sessions.length === 0) {
            sessionSelect.innerHTML = `<option value="">No sessions scheduled</option>`;
        } else {
            sessionSelect.innerHTML = `<option value="">-- Choose Session --</option>` + sessions.map(s => `
                <option value="${s.id}">Session #${s.id} (${new Date(s.start_time).toLocaleDateString()} @ ${s.location || 'Campus'})</option>
            `).join('');
        }
    }
}

async function onAttendanceSessionChange() {
    const sessionId = document.getElementById('att-select-session').value;
    const courseId = document.getElementById('att-select-course').value;
    if (!sessionId || !courseId) return;

    // Load enrolled students & existing attendance
    const [enrollments, existingAttendance] = await Promise.all([
        apiRequest(`/enrollments/?course_id=${courseId}`).catch(() => []),
        apiRequest(`/attendance/session/${sessionId}`).catch(() => [])
    ]);

    currentAttendanceDraft = {};
    existingAttendance.forEach(a => currentAttendanceDraft[a.student_id] = a.status);

    const tbody = document.getElementById('att-roster-body');
    if (enrollments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">No students currently enrolled in this course.</td></tr>`;
        document.getElementById('btn-save-attendance').disabled = true;
        return;
    }

    tbody.innerHTML = enrollments.map(e => {
        const curStatus = currentAttendanceDraft[e.student_id] || 'Present';
        currentAttendanceDraft[e.student_id] = curStatus;

        return `
            <tr id="att-row-${e.student_id}">
                <td><span class="badge bg-light text-dark border">#${e.student_id}</span></td>
                <td class="fw-semibold">${e.student_name}</td>
                <td><span class="badge status-badge-${e.student_id} ${curStatus === 'Present' ? 'bg-success' : curStatus === 'Late' ? 'bg-warning' : 'bg-danger'}">${curStatus}</span></td>
                <td class="text-center">
                    <div class="btn-group att-btn-group" role="group">
                        <button type="button" class="btn btn-sm ${curStatus === 'Present' ? 'btn-success' : 'btn-outline-success'}" onclick="setAttendanceStatus(${e.student_id}, 'Present')">Present</button>
                        <button type="button" class="btn btn-sm ${curStatus === 'Late' ? 'btn-warning' : 'btn-outline-warning'}" onclick="setAttendanceStatus(${e.student_id}, 'Late')">Late</button>
                        <button type="button" class="btn btn-sm ${curStatus === 'Absent' ? 'btn-danger' : 'btn-outline-danger'}" onclick="setAttendanceStatus(${e.student_id}, 'Absent')">Absent</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    document.getElementById('btn-save-attendance').disabled = false;
}

function setAttendanceStatus(studentId, status) {
    currentAttendanceDraft[studentId] = status;
    const badge = document.querySelector(`.status-badge-${studentId}`);
    if (badge) {
        badge.className = `badge status-badge-${studentId} ${status === 'Present' ? 'bg-success' : status === 'Late' ? 'bg-warning' : 'bg-danger'}`;
        badge.innerText = status;
    }
    const row = document.getElementById(`att-row-${studentId}`);
    if (row) {
        row.querySelectorAll('.att-btn-group .btn').forEach(btn => {
            btn.className = `btn btn-sm btn-outline-${btn.innerText === 'Present' ? 'success' : btn.innerText === 'Late' ? 'warning' : 'danger'}`;
            if (btn.innerText === status) {
                btn.className = `btn btn-sm btn-${status === 'Present' ? 'success' : status === 'Late' ? 'warning' : 'danger'}`;
            }
        });
    }
}

async function saveBulkAttendance() {
    const sessionId = parseInt(document.getElementById('att-select-session').value);
    if (!sessionId) return;

    const records = Object.keys(currentAttendanceDraft).map(sid => ({
        student_id: parseInt(sid),
        status: currentAttendanceDraft[sid]
    }));

    try {
        await apiRequest('/attendance/bulk', 'POST', { session_id: sessionId, records });
        showToast(`Attendance recorded for ${records.length} students!`, 'success');
    } catch (e) {}
}

async function openAddSessionModal() {
    allCourses = await apiRequest('/courses/').catch(() => []);
    const crsSelect = document.getElementById('session-course-select');
    crsSelect.innerHTML = allCourses.map(c => `<option value="${c.id}">${c.code} - ${c.title}</option>`).join('');

    // Pre-fill current datetime
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('session-start-time').value = now.toISOString().slice(0, 16);
    now.setHours(now.getHours() + 2);
    document.getElementById('session-end-time').value = now.toISOString().slice(0, 16);

    modals['add-session'].show();
}

async function submitAddSession(e) {
    e.preventDefault();
    const course_id = parseInt(document.getElementById('session-course-select').value);
    const start_time = new Date(document.getElementById('session-start-time').value).toISOString();
    const end_time = new Date(document.getElementById('session-end-time').value).toISOString();
    const location = document.getElementById('session-location').value;

    try {
        await apiRequest('/sessions/', 'POST', { course_id, start_time, end_time, location });
        showToast('Class session scheduled!', 'success');
        modals['add-session'].hide();
        document.getElementById('att-select-course').value = course_id;
        onAttendanceCourseChange();
    } catch (e) {}
}

// ==================== GRADEBOOK & ASSESSMENTS ====================

async function loadGradebook() {
    allCourses = await apiRequest('/courses/').catch(() => []);
    const select = document.getElementById('gb-select-course');
    if (select) {
        select.innerHTML = `<option value="">-- Choose Course --</option>` + allCourses.map(c => `<option value="${c.id}">${c.code} - ${c.title}</option>`).join('');
    }
}

async function loadGradebookCourse() {
    const courseId = document.getElementById('gb-select-course').value;
    if (!courseId) return;

    const [assessments, enrollments] = await Promise.all([
        apiRequest(`/gradebook/assessments?course_id=${courseId}`).catch(() => []),
        apiRequest(`/enrollments/?course_id=${courseId}`).catch(() => [])
    ]);

    // Render Assessments List
    const assessBody = document.getElementById('gb-assessments-body');
    if (assessBody) {
        if (assessments.length === 0) {
            assessBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-muted">No assessments defined for this course yet. Click "New Assessment" above.</td></tr>`;
        } else {
            assessBody.innerHTML = assessments.map(a => `
                <tr>
                    <td class="fw-bold">${a.title}</td>
                    <td><span class="badge bg-secondary">${a.max_score} pts</span></td>
                    <td><span class="badge bg-light text-dark border">${a.weight}x</span></td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-danger" onclick="confirmDeleteAssessment(${a.id})" title="Delete Assessment"><i class="bi bi-trash"></i></button>
                    </td>
                </tr>
            `).join('');
        }
    }

    // Render Grade Entry Table
    const gradesBody = document.getElementById('gb-grades-entry-body');
    if (gradesBody) {
        if (enrollments.length === 0 || assessments.length === 0) {
            gradesBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">Both enrolled students and assessments are needed to enter grades.</td></tr>`;
            return;
        }

        const activeAssessment = assessments[0];
        const grades = await apiRequest(`/gradebook/grades?assessment_id=${activeAssessment.id}`).catch(() => []);

        gradesBody.innerHTML = enrollments.map(e => {
            const gradeObj = grades.find(g => g.student_id === e.student_id);
            const scoreVal = gradeObj ? gradeObj.score : '';
            const feedbackVal = gradeObj ? (gradeObj.feedback || '') : '';

            return `
                <tr>
                    <td class="fw-semibold">${e.student_name}</td>
                    <td><span class="badge bg-primary bg-opacity-10 text-primary">${activeAssessment.title}</span></td>
                    <td>
                        <div class="input-group input-group-sm">
                            <input type="number" step="0.5" class="form-control fw-bold" id="score-input-${e.student_id}" value="${scoreVal}" max="${activeAssessment.max_score}">
                            <span class="input-group-text">/${activeAssessment.max_score}</span>
                        </div>
                    </td>
                    <td>
                        <input type="text" class="form-control form-control-sm" id="feedback-input-${e.student_id}" value="${feedbackVal}" placeholder="Feedback...">
                    </td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-primary" onclick="saveStudentGrade(${activeAssessment.id}, ${e.student_id})"><i class="bi bi-save me-1"></i> Save</button>
                    </td>
                </tr>
            `;
        }).join('');
    }
}

function openAddAssessmentModal() {
    const courseId = document.getElementById('gb-select-course').value;
    if (!courseId) {
        showToast('Please select a course first!', 'warning');
        return;
    }
    document.getElementById('form-add-assessment').reset();
    modals['add-assessment'].show();
}

async function submitAddAssessment(e) {
    e.preventDefault();
    const course_id = parseInt(document.getElementById('gb-select-course').value);
    const title = document.getElementById('assess-title').value;
    const max_score = parseFloat(document.getElementById('assess-max-score').value);
    const weight = parseFloat(document.getElementById('assess-weight').value);

    try {
        await apiRequest('/gradebook/assessments', 'POST', { course_id, title, max_score, weight });
        showToast('Assessment added to gradebook!', 'success');
        modals['add-assessment'].hide();
        loadGradebookCourse();
    } catch (e) {}
}

function confirmDeleteAssessment(id) {
    document.getElementById('confirm-delete-msg').innerText = `Are you sure you want to delete this assessment (#${id})? All recorded scores for this assessment will be removed!`;
    pendingDeleteAction = async () => {
        try {
            await apiRequest(`/gradebook/assessments/${id}`, 'DELETE');
            showToast('Assessment removed.', 'success');
            loadGradebookCourse();
        } catch (e) {}
    };
    modals['confirm-delete'].show();
}

async function saveStudentGrade(assessmentId, studentId) {
    const score = parseFloat(document.getElementById(`score-input-${studentId}`).value);
    const feedback = document.getElementById(`feedback-input-${studentId}`).value;

    if (isNaN(score)) {
        showToast('Please enter a valid numeric score', 'warning');
        return;
    }

    try {
        await apiRequest('/gradebook/grades', 'POST', { assessment_id: assessmentId, student_id: studentId, score, feedback });
        showToast('Grade saved!', 'success');
    } catch (e) {}
}
