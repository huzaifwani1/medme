function startDemoMode() {
    localStorage.setItem('demoMode', 'true');
    localStorage.setItem('demoStep', '1');
    window.location.href = '/';
}

function checkDemoMode() {
    if(localStorage.getItem('demoMode') !== 'true') return;
    
    const step = parseInt(localStorage.getItem('demoStep') || '1');
    let message = '';
    let nextAction = '';

    const path = window.location.pathname;

    if (step === 1 && path === '/') {
        message = 'Welcome to MedMe Demo! Let\'s start by exploring the Analytics Dashboard.';
        nextAction = `<button class="btn btn-primary btn-sm" onclick="nextStep(2, '/analytics.html')">Go to Analytics</button>`;
    } 
    else if (step === 2 && path.includes('analytics')) {
        message = 'Here are visual charts showing demographics and disease distributions. Next, we will view the QR Workflow.';
        nextAction = `<button class="btn btn-primary btn-sm" onclick="nextStep(3, '/qr-demo.html')">Go to QR Demo</button>`;
    }
    else if (step === 3 && path.includes('qr-demo')) {
        message = 'Click "Scan Patient QR" to simulate scanning a physical identity card, then click "Open Full Record".';
        nextAction = `<button class="btn btn-outline btn-sm" onclick="nextStep(4)">I will click it</button>`;
    }
    else if (step === 4 && path.includes('viewer') && window.location.search.includes('patient')) {
        message = 'This is the detailed Patient Profile. Notice the ⚠️ Hereditary Risk box explaining exactly why the alert triggered. Click on a Prescription card below to see details.';
        nextAction = `<button class="btn btn-outline btn-sm" onclick="nextStep(5)">I will click a prescription</button>`;
    }
    else if (step === 5 && path.includes('viewer') && window.location.search.includes('prescription')) {
        message = 'Every detail is traceable. Let\'s check the Admin panel next.';
        nextAction = `<button class="btn btn-primary btn-sm" onclick="nextStep(6, '/admin.html')">Go to Admin Dashboard</button>`;
    }
    else if (step === 6 && path.includes('admin')) {
        message = 'The Admin dashboard tracks real-time stats and an immutable activity feed. Every card and row here is clickable. Feel free to explore!';
        nextAction = `<button class="btn btn-danger btn-sm" onclick="endDemo()">End Demo</button>`;
    }

    if (message) {
        const div = document.createElement('div');
        div.className = 'tour-widget card';
        div.style.position = 'fixed';
        div.style.bottom = '20px';
        div.style.right = '20px';
        div.style.zIndex = '9999';
        div.style.borderLeft = '4px solid var(--primary)';
        div.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)';
        div.style.maxWidth = '300px';
        div.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 5px; color: var(--primary);">Guided Walkthrough (Step ${step}/6)</div>
            <p style="font-size: 13px; margin-bottom: 15px;">${message}</p>
            <div style="display: flex; gap: 10px;">${nextAction} <button class="btn btn-outline btn-sm" style="padding: 5px 10px; font-size: 12px;" onclick="endDemo()">Exit</button></div>
        `;
        document.body.appendChild(div);
    }
}

function nextStep(step, url) {
    localStorage.setItem('demoStep', step.toString());
    if(url) window.location.href = url;
    else {
        document.querySelector('.tour-widget').remove();
        checkDemoMode();
    }
}

function endDemo() {
    localStorage.removeItem('demoMode');
    localStorage.removeItem('demoStep');
    if(document.querySelector('.tour-widget')) document.querySelector('.tour-widget').remove();
}

document.addEventListener('DOMContentLoaded', checkDemoMode);
