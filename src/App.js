import React, { useState } from 'react';
import axios from 'axios';
import Papa from 'papaparse';

function App() {
  const [latitude, setLat] = useState('')
  const [longitude, setLong] = useState('')
  const [radius, setRad] = useState('')
  const [download, setDownload] = useState('')
  const [file, setFile] = useState(null)
  const[contacts, setContacts] = useState('')
  const [mergeFiles, setMergeFiles] = useState([])
  const [merge, setMerge] = useState('')
  
  const handleRequest = async (event) => {
    event.preventDefault();
    try {
        const location = {latitude, longitude, radius}
        const response = await axios.post('http://127.0.0.1:5000/api/generate_places', location)
        const generatedPlacesPath = response.data.generatedPlacesPath;

        setDownload(`http://127.0.0.1:5000/api/download_csv?filePath=${generatedPlacesPath}`)

    } catch (error) {
        console.error('Error processing data', error);
    }
  }

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = download;
    link.setAttribute('download', 'generated_places.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const handleContactsDownload = () => {
    const link = document.createElement('a');
    link.href = contacts;
    link.setAttribute('download', 'generated_contacts.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleMergeDownload = () => {
    const link = document.createElement('a');
    link.href = merge;
    link.setAttribute('download', 'merged_file.csv')
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const handleUpload = async (event) => {
    event.preventDefault();

    if (!file) {
      alert('Select a file first');
      return;
    }

    Papa.parse(file, {
      header: false,
      complete: async (results) => {
        const preData = results.data.filter(row => row[0] && row[1]);

        const nameData = [];
        const typeData = [];

        for (let i = 0; i < preData.length; i++) {
          const placeName = preData[i][0];
          const typeName = preData[i][1];
          nameData.push(placeName);
          typeData.push(typeName);
        }

        const data = [nameData, typeData];

        console.log('Parsed data:', data);
        
        try {
          const response = await axios.post('http://127.0.0.1:5000/api/scrape_contacts', {data});
          const generatedContactsPath = response.data.generatedContactsPath;
          setContacts(`http://127.0.0.1:5000/api/download_contacts_csv?filePath=${generatedContactsPath}`);
        } catch (error) {
          console.error('Error uploading file:', error);
        }
      },
    });
  }

  const handleMergeUpload = async (event) => {
    event.preventDefault();

    if (mergeFiles.length < 2) {
      alert('Select 2 files first');
      return;
    }

    const parseFile = (file) => {
      return new Promise((resolve, reject) => {
        Papa.parse(file, {
          header: false,
          complete: (results) => resolve(results.data.filter(row => row[0])),
          error: (error) => reject(error),
        });
      });
    };

    const [firstParse, secondParse] = await Promise.all(
      mergeFiles.map(parseFile)
    );

    const data = [firstParse, secondParse];

    console.log('Parsed data:', data);

    const mergedList = [];
    for (let place of data[1]) {
      let hasContact = false;
      const emptyRow = [...place];
      for (let contact of data[0]) {
        const mergedRow = [...place];
        if (place[0] === contact[0]) {
          hasContact = true;
          mergedRow.push(contact[1]);
          mergedRow.push(contact[2]);
          mergedList.push(mergedRow);
        }
      } if (!hasContact) {
        emptyRow.push('');
        emptyRow.push('');
        mergedList.push(emptyRow);
      }
    }

    const headers = ["Company Name", "Type", "Address", "Phone", "Website", "Wifi", "Contact", "Link"];
    const mergedCsv = Papa.unparse({ fields: headers, data: mergedList });

    console.log('Merged CSV Content:', mergedCsv);

    const blob = new Blob([mergedCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
  
    // Set the URL as the href for the download
    setMerge(url);
  }

  const handleFileUpdate = async (event) => {
    setFile(event.target.files[0]);
  }

  const handleMergeUpdate = async (event) => {
    setMergeFiles(Array.from(event.target.files));
  }

  return (
    <div>
      <h1>Lead Generator Tool</h1>
      <h3>Generate Places</h3>
    <form onSubmit={handleRequest}>
        <input
            type="number"
            value={latitude}
            onChange={(e) => setLat(e.target.value)}
            placeholder="Enter latitude"
        />
        <input
            type="number"
            value={longitude}
            onChange={(e) => setLong(e.target.value)}
            placeholder="Enter longitude"
        />
        <input
            type="number"
            value={radius}
            onChange={(e) => setRad(e.target.value)}
            placeholder="Enter radius (meters)"
        />
        <button type="submit">Submit</button>
    </form>
    {download && (
    <div>
        <button onClick={handleDownload}> Download </button>
    </div> )
    }
    <h3>Generate Contacts</h3>
    <form onSubmit={handleUpload}>
      <input type="file" accept=".csv" onChange={handleFileUpdate}/>
      <button type="submit">Upload</button> 
    </form>
    {contacts && (
    <div>
        <button onClick={handleContactsDownload}> Download </button>
    </div> )
    }
    <h3>Merge Files</h3>
    <form onSubmit={handleMergeUpload}>
      <input type="file" multiple accept=".csv" onChange={handleMergeUpdate}/>
      <button type="submit">Upload</button>
    </form>
    {merge && (
      <div>
        <button onClick={handleMergeDownload}> Download </button>
      </div> )
    }
    </div>
);
}

export default App;
