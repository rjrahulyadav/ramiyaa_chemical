import React, { useState, useRef } from 'react';
import axios from 'axios';
import './FileUpload.css';

const API_BASE_URL = 'http://localhost:8000/api';

function FileUpload({ onUpload }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setMessage('');
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'text/csv') {
      setFile(droppedFile);
      setMessage('');
    } else {
      setMessage('Please drop a valid CSV file');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select a file');
      return;
    }

    setUploading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name);

    try {
      const response = await axios.post(`${API_BASE_URL}/upload/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setMessage('File uploaded successfully!');
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (onUpload) {
        onUpload();
      }
    } catch (error) {
      setMessage(
        error.response?.data?.error || 'Error uploading file. Make sure the backend is running and file format is correct.'
      );
    } finally {
      setUploading(false);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="file-upload">
      <h2>📄 Upload Equipment Data</h2>
      
      <div 
        className={`drop-zone ${dragActive ? 'drag-active' : ''} ${file ? 'has-file' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          disabled={uploading}
          style={{ display: 'none' }}
        />
        
        <div className="drop-content">
          {file ? (
            <>
              📊 <strong>{file.name}</strong>
              <p>File ready for upload ({(file.size / 1024).toFixed(1)} KB)</p>
            </>
          ) : (
            <>
              📁 <strong>Drop CSV file here or click to browse</strong>
              <p>Supports CSV files with equipment data</p>
            </>
          )}
        </div>
      </div>

      <div className="upload-actions">
        <button
          onClick={handleUpload}
          disabled={uploading || !file}
          className={`upload-button ${uploading ? 'uploading' : ''}`}
        >
          {uploading ? (
            <>
              <div className="spinner"></div>
              Processing...
            </>
          ) : (
            <>
              🚀 Upload & Analyze
            </>
          )}
        </button>
        
        {file && (
          <button
            onClick={() => {
              setFile(null);
              setMessage('');
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }}
            className="clear-button"
            disabled={uploading}
          >
            ✖️ Clear
          </button>
        )}
      </div>

      {message && (
        <div className={`message ${message.includes('Error') || message.includes('Please') ? 'error' : 'success'}`}>
          <span className="message-icon">
            {message.includes('Error') || message.includes('Please') ? '❌' : '✅'}
          </span>
          {message}
        </div>
      )}
      
      <div className="format-info">
        <h4>📊 Expected CSV Format:</h4>
        <div className="format-example">
          <code>Equipment Name, Type, Flowrate, Pressure, Temperature</code>
        </div>
        <p className="format-note">
          📝 Make sure your CSV includes headers and numeric values for parameters
        </p>
      </div>
    </div>
  );
}

export default FileUpload;