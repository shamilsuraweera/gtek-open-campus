const API_URL = '/api/v1';

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
    });

    if (res.ok) {
        const data = await res.json();
        localStorage.setItem('token', data.access_token);
        showApp();
    } else {
        document.getElementById('login-error').innerText = 'Invalid credentials';
        document.getElementById('login-error').style.display = 'block';
    }
});

function getHeaders() {
    return { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
}

function showApp() {
    if (!localStorage.getItem('token')) return;
    document.getElementById('login-view').style.display = 'none';
    document.getElementById('navbar').style.display = 'flex';
    loadDashboard();
}

function hideAllViews() {
    ['dashboard-view', 'students-view', 'courses-view'].forEach(id => {
        document.getElementById(id).style.display = 'none';
    });
}

function logout() {
    localStorage.removeItem('token');
    window.location.reload();
}

async function loadDashboard() {
    hideAllViews();
    document.getElementById('dashboard-view').style.display = 'block';
    
    const [attRes, grdRes] = await Promise.all([
        fetch(`${API_URL}/reporting/attendance-rates`, { headers: getHeaders() }),
        fetch(`${API_URL}/reporting/grade-distributions`, { headers: getHeaders() })
    ]);

    if (attRes.ok) {
        const data = await attRes.json();
        document.getElementById('attendance-list').innerHTML = data.map(d => 
            `<li class="list-group-item d-flex justify-content-between align-items-center p-3">
                <span>📘 Course <b>#${d.course_id}</b></span>
                <span class="badge ${d.attendance_rate > 70 ? 'bg-success' : 'bg-danger'} rounded-pill fs-6">${d.attendance_rate.toFixed(1)}%</span>
            </li>`
        ).join('');
    }
    
    if (grdRes.ok) {
        const data = await grdRes.json();
        document.getElementById('grades-list').innerHTML = data.map(d => 
            `<li class="list-group-item p-3">
                <div class="d-flex justify-content-between">
                    <span>📘 Course <b>#${d.course_id}</b></span>
                    <span class="fw-bold">Avg: ${d.average_score.toFixed(1)}</span>
                </div>
                <div class="text-muted small mt-1">High: ${d.max_score.toFixed(1)} | Low: ${d.min_score.toFixed(1)}</div>
            </li>`
        ).join('');
    }
}

async function refreshMVs() {
    await fetch(`${API_URL}/reporting/refresh-views`, { method: 'POST', headers: getHeaders() });
    alert('Materialized Views are refreshing in the background!');
    setTimeout(loadDashboard, 1000);
}

async function loadStudents() {
    hideAllViews();
    document.getElementById('students-view').style.display = 'block';
    
    const res = await fetch(`${API_URL}/students/`, { headers: getHeaders() });
    if (res.ok) {
        const data = await res.json();
        document.getElementById('students-tbody').innerHTML = data.map(s => 
            `<tr>
                <td>${s.id}</td>
                <td class="fw-bold">${s.first_name} ${s.last_name}</td>
                <td><span class="badge bg-secondary">${s.student_id_number}</span></td>
                <td><button class="btn btn-sm btn-dark" onclick="viewTranscript(${s.id})">View Transcript</button></td>
            </tr>`
        ).join('');
    }
}

async function loadCourses() {
    hideAllViews();
    document.getElementById('courses-view').style.display = 'block';
    
    const res = await fetch(`${API_URL}/courses/`, { headers: getHeaders() });
    if (res.ok) {
        const data = await res.json();
        document.getElementById('courses-tbody').innerHTML = data.map(c => 
            `<tr>
                <td class="fw-bold">${c.code}</td>
                <td>${c.title}</td>
                <td>${c.capacity} students</td>
            </tr>`
        ).join('');
    }
}

let transcriptModal;
async function viewTranscript(studentId) {
    if (!transcriptModal) {
        transcriptModal = new bootstrap.Modal(document.getElementById('transcriptModal'));
    }
    
    const body = document.getElementById('transcript-body');
    body.innerHTML = 'Loading...';
    transcriptModal.show();
    
    const res = await fetch(`${API_URL}/gradebook/transcript/${studentId}`, { headers: getHeaders() });
    if (res.ok) {
        const data = await res.json();
        let html = `<div class="text-center mb-4">
            <h1 class="display-4 fw-bold text-primary">${data.gpa.toFixed(2)}</h1>
            <div class="text-muted text-uppercase fw-bold letter-spacing-1">Cumulative GPA</div>
        </div><ul class="list-group list-group-flush">`;
        
        data.courses.forEach(c => {
            html += `<li class="list-group-item d-flex justify-content-between align-items-center">
                Course #${c.course_id}
                <span><b>${c.final_score.toFixed(1)}%</b> <span class="badge bg-secondary ms-2">${c.letter_grade}</span></span>
            </li>`;
        });
        html += '</ul>';
        body.innerHTML = html;
    } else {
        body.innerHTML = '<div class="alert alert-danger">Failed to load transcript.</div>';
    }
}

// Auto-login check
if (localStorage.getItem('token')) {
    showApp();
}
