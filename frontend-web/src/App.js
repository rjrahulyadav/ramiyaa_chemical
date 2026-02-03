import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import FileUpload from './components/FileUpload';
import DatasetList from './components/DatasetList';
import DataVisualization from './components/DataVisualization';

// Configure axios with basic auth
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api';
const username = 'admin';
const password = 'admin123';

axios.defaults.auth = {
  username: username,
  password: password
};

function App() {
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [summary, setSummary] = useState(null);
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    fetchDatasets();
    // Add keyboard shortcuts
    const handleKeyPress = (e) => {
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        document.querySelector('input[type="file"]')?.click();
      }
    };
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchDatasets = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/datasets/`);
      setDatasets(response.data);
      if (response.data.length > 0 && !selectedDataset) {
        handleDatasetSelect(response.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching datasets:', error);
      showNotification('Error connecting to backend. Please ensure the server is running.', 'error');
    }
  };

  const handleDatasetSelect = async (datasetId) => {
    setSelectedDataset(datasetId);
    setLoading(true);
    try {
      const [summaryResponse, equipmentResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/datasets/${datasetId}/summary/`),
        axios.get(`${API_BASE_URL}/datasets/${datasetId}/equipment/`)
      ]);
      setSummary(summaryResponse.data);
      setEquipment(equipmentResponse.data);
      showNotification(`Dataset loaded successfully! Found ${equipmentResponse.data.length} equipment records.`);
    } catch (error) {
      console.error('Error fetching dataset data:', error);
      showNotification('Error loading dataset data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async () => {
    await fetchDatasets();
    showNotification('File uploaded and processed successfully! 🎉');
  };

  const handleDownloadPDF = async () => {
    if (!selectedDataset) return;
    try {
      showNotification('Generating PDF report...', 'info');
      const response = await axios.get(
        `${API_BASE_URL}/datasets/${selectedDataset}/pdf/`,
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `equipment_report_${selectedDataset}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showNotification('PDF report downloaded successfully! 📄');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      showNotification('Error generating PDF report', 'error');
    }
  };

  return (
    <div className="App">
      {notification && (
        <div className={`notification ${notification.type}`}>
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)}>×</button>
        </div>
      )}
      
      <header className="App-header">
        <div className="header-content">
          <h1>⚗️ Chemical Equipment Parameter Visualizer</h1>
          <p>Advanced Analytics & Visualization Platform</p>
          <div className="header-stats">
            <span className="stat">📈 Real-time Analysis</span>
            <span className="stat">📊 Interactive Charts</span>
            <span className="stat">📄 PDF Reports</span>
          </div>
        </div>
      </header>
      
      <main className="App-main">
        <div className="upload-section">
          <FileUpload onUpload={handleFileUpload} />
          <div className="quick-tips">
            <h4>💡 Quick Tips</h4>
            <ul>
              <li>Press <kbd>Ctrl+U</kbd> to quickly select files</li>
              <li>Drag & drop CSV files for instant upload</li>
              <li>View last 5 uploaded datasets in history</li>
            </ul>
          </div>
        </div>

        <div className="content-section">
          <div className="datasets-panel">
            <h2>📁 Dataset History</h2>
            <DatasetList
              datasets={datasets}
              selectedDataset={selectedDataset}
              onSelect={handleDatasetSelect}
            />
            {selectedDataset && (
              <div className="panel-actions">
                <button
                  className="pdf-button"
                  onClick={handleDownloadPDF}
                  disabled={loading}
                >
                  📄 Generate PDF Report
                </button>
                <div className="dataset-info">
                  <small>📅 Dataset ID: {selectedDataset}</small>
                  {summary && <small>🔢 Records: {summary.total_count}</small>}
                </div>
              </div>
            )}
          </div>

          <div className="visualization-panel">
            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner"></div>
                <h3>⏳ Processing Data...</h3>
                <p>Analyzing equipment parameters and generating visualizations</p>
              </div>
            ) : summary && equipment.length > 0 ? (
              <DataVisualization summary={summary} equipment={equipment} />
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📈</div>
                <h3>Ready for Data Analysis</h3>
                <p>Upload a CSV file to start visualizing your chemical equipment data</p>
                <div className="sample-format">
                  <h4>Expected CSV Format:</h4>
                  <code>Equipment Name, Type, Flowrate, Pressure, Temperature</code>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
