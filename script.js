// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000/api';
const username = 'admin';
const password = 'admin123';

// State
let datasets = [];
let selectedDataset = null;
let summary = null;
let equipment = [];
let flowrateChart = null;
let pressureChart = null;
let temperatureChart = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchDatasets();
    setupKeyboardShortcuts();
    setupDragAndDrop();
    setupFileInput();
});

// Keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'u') {
            e.preventDefault();
            document.getElementById('file-input').click();
        }
    });
}

// Drag and drop
function setupDragAndDrop() {
    const uploadArea = document.getElementById('upload-area');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.add('dragover');
        });
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.remove('dragover');
        });
    });
    
    uploadArea.addEventListener('drop', handleDrop);
}

function handleDrop(e) {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
}

// File input
function setupFileInput() {
    const fileInput = document.getElementById('file-input');
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });
}

function handleFile(file) {
    if (!file.name.endsWith('.csv')) {
        showNotification('Please upload a CSV file', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    showNotification('Uploading file...', 'info');
    
    fetch(`${API_BASE_URL}/datasets/`, {
        method: 'POST',
        body: formData,
        auth: {
            username: username,
            password: password
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Upload failed');
        }
        return response.json();
    })
    .then(data => {
        showNotification('File uploaded and processed successfully! 🎉', 'success');
        fetchDatasets();
    })
    .catch(error => {
        console.error('Upload error:', error);
        showNotification('Error uploading file. Please ensure the backend is running.', 'error');
    });
}

// Fetch datasets
function fetchDatasets() {
    fetch(`${API_BASE_URL}/datasets/`, {
        auth: {
            username: username,
            password: password
        }
    })
    .then(response => response.json())
    .then(data => {
        datasets = data;
        renderDatasets();
        if (data.length > 0 && !selectedDataset) {
            handleDatasetSelect(data[0].id);
        }
    })
    .catch(error => {
        console.error('Error fetching datasets:', error);
        showNotification('Error connecting to backend. Please ensure the server is running.', 'error');
    });
}

// Render datasets list
function renderDatasets() {
    const list = document.getElementById('datasets-list');
    
    if (datasets.length === 0) {
        list.innerHTML = '<p class="empty-message">No datasets uploaded yet</p>';
        return;
    }
    
    list.innerHTML = datasets.map(dataset => `
        <div class="dataset-item ${selectedDataset === dataset.id ? 'selected' : ''}" 
             onclick="handleDatasetSelect(${dataset.id})">
            <h4>📄 ${dataset.file_name}</h4>
            <small>📅 ${new Date(dataset.created_at).toLocaleDateString()}</small>
        </div>
    `).join('');
}

// Handle dataset selection
function handleDatasetSelect(datasetId) {
    selectedDataset = datasetId;
    renderDatasets();
    
    showLoading(true);
    
    Promise.all([
        fetch(`${API_BASE_URL}/datasets/${datasetId}/summary/`, {
            auth: { username: username, password: password }
        }),
        fetch(`${API_BASE_URL}/datasets/${datasetId}/equipment/`, {
            auth: { username: username, password: password }
        })
    ])
    .then(responses => Promise.all(responses.map(r => r.json())))
    .then(([summaryData, equipmentData]) => {
        summary = summaryData;
        equipment = equipmentData;
        
        document.getElementById('dataset-id').textContent = `📅 Dataset ID: ${datasetId}`;
        document.getElementById('record-count').textContent = `🔢 Records: ${summary.total_count}`;
        document.getElementById('pdf-button').disabled = false;
        
        showLoading(false);
        renderVisualization();
        showNotification(`Dataset loaded successfully! Found ${equipmentData.length} equipment records.`, 'success');
    })
    .catch(error => {
        console.error('Error fetching dataset data:', error);
        showLoading(false);
        showNotification('Error loading dataset data', 'error');
    });
}

// Render visualization
function renderVisualization() {
    document.getElementById('empty-state').classList.add('hidden');
    document.getElementById('data-visualization').classList.remove('hidden');
    
    // Update summary cards
    document.getElementById('total-count').textContent = summary.total_count;
    document.getElementById('avg-flowrate').textContent = summary.avg_flowrate.toFixed(2);
    document.getElementById('avg-pressure').textContent = summary.avg_pressure.toFixed(2);
    document.getElementById('avg-temperature').textContent = summary.avg_temperature.toFixed(2);
    
    // Destroy existing charts
    if (flowrateChart) flowrateChart.destroy();
    if (pressureChart) pressureChart.destroy();
    if (temperatureChart) temperatureChart.destroy();
    
    // Create charts
    createChart('flowrateChart', 'Flowrate by Equipment', 'flowrateChart', '#3b82f6');
    createChart('pressureChart', 'Pressure by Equipment', 'pressureChart', '#10b981');
    createChart('temperatureChart', 'Temperature by Equipment', 'temperatureChart', '#f59e0b');
}

function createChart(canvasId, label, dataKey, color) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    const chartData = equipment.slice(0, 10).map(item => ({
        x: item.equipment_name.substring(0, 15),
        y: item[dataKey]
    }));
    
    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.map(d => d.x),
            datasets: [{
                label: label,
                data: chartData.map(d => d.y),
                backgroundColor: color,
                borderColor: color,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: label
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    
    if (dataKey === 'flowrate') {
        flowrateChart = chart;
    } else if (dataKey === 'pressure') {
        pressureChart = chart;
    } else {
        temperatureChart = chart;
    }
}

// Generate PDF
function generatePDF() {
    if (!selectedDataset) return;
    
    showNotification('Generating PDF report...', 'info');
    
    fetch(`${API_BASE_URL}/datasets/${selectedDataset}/pdf/`, {
        auth: {
            username: username,
            password: password
        }
    })
    .then(response => response.blob())
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `equipment_report_${selectedDataset}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        showNotification('PDF report downloaded successfully! 📄', 'success');
    })
    .catch(error => {
        console.error('Error downloading PDF:', error);
        showNotification('Error generating PDF report', 'error');
    });
}

// Show/hide loading
function showLoading(show) {
    document.getElementById('loading-state').classList.toggle('hidden', !show);
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const messageEl = document.getElementById('notification-message');
    
    notification.className = `notification ${type}`;
    messageEl.textContent = message;
    notification.classList.remove('hidden');
    
    setTimeout(() => {
        hideNotification();
    }, 4000);
}

// Hide notification
function hideNotification() {
    document.getElementById('notification').classList.add('hidden');
}
