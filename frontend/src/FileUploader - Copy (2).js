import React, { useState,useRef, useEffect } from 'react'; // Library for the UI
import * as XLSX from 'xlsx'; // Library for xlsx operations
import shopping_cart from './images/shopping_cart.png';
import arrow from './images/arrow.png';
import './Home.css'; 
import './Upload.css'; 
import './Select.css'; 

const FileUploader = () => {
 
  // State constants for managing UI and file data 
  const [file, setFile] = useState(null); // Stores selected file
  const [fileName, setFileName] = useState(''); // Stores the file name
  const [uploading, setUploading] = useState(false); // Upload process status
  const [sheetInfo, setSheetInfo] = useState([]); // Stores sheet names, row and column counts
  const [selectedSheets, setSelectedSheets] = useState([]); // Stores selected sheets
  const [page, setPage] = useState("0"); // Tracks sheet view for navigation
  const [selectAll, setSelectAll] = useState(true); // Tracks "Select All" state of the checkboxes
  const [uploadStatus, setUploadStatus] = useState(''); // Tracks upload success/error status
  const [error, setError] = useState(''); // Holds error message
  const [message, setMessage] = useState(''); // Stores user messages
  const messageRef = useRef(null); // Ref for scrolling to the message
 
  /**
   * Handles file selection and validation.
   * Reads the file and extracts sheet details.
   * @param {Event} event - The file input change event
   */
  const uploadFile = (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    // Allowed file extensions
    const extensions = [".xlsx", ".xls"];
    const fileExtension = selectedFile.name.split(".").pop().toLowerCase();

    // Validate file format
    if (!extensions.includes(`.${fileExtension}`)) {
      setError("Invalid file format. Please select an Excel file (.xlsx, .xls).");
      setFile(null);
      setFileName("");
      setSheetInfo([]);
      return;
    }
  
      setFile(selectedFile); 
      setFileName(selectedFile.name); 
      setError(""); 
  
      // Read the Excel file
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });

          // Extract sheet names, row and column counts
          const sheets = workbook.SheetNames.map((sheetName) => {
            const sheet = workbook.Sheets[sheetName];
            const jsonSheet = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // Sheet in JSON format for easier handling

            return {
              sheetName,
              rowCount: jsonSheet.length,
              columnCount: jsonSheet[0] ? jsonSheet[0].length : 0
            };
        });
  
        // Update sheet info state
        setSheetInfo(sheets);
      } catch (err) {
        setError("Error processing file. Please try again.");
      }
  };
  reader.readAsArrayBuffer(selectedFile);
};
  
  ///* AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA

  const callPythonFunction = async (blobi) => {
    try {
      const blob = new Blob([blobi], {type: "application/octet-stream"})
      const response = await fetch("http://127.0.0.1:5000/", {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
        },
        body: blob, // Send the input as JSON
      });

      if (response.ok) {
        const csvBlob = await response.blob();
        const url = window.URL.createObjectURL(csvBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "enriched_data.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        console.error("Failed to fetch data from backend.");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

//AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAa*/

    // Handle error message "Continue" button click
    const handleContinue0 = () => {
      setError("");
      setFile("");
      setFileName("");
      setPage("1");
    };


  // Handle error message "Continue" button click
  const handleContinue = () => {
    if (!file) {
      setError('Please choose a file before continuing.');
      return;
    }
    setPage("2");
  };

  const startEnrichment = async () => {
    try {
      setUploading(true); // Show spinner
      setUploadStatus(""); // Reset upload status
      setError(""); // Clear any previous error

      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          await callPythonFunction(data); // Replace with actual backend call
          setMessage("File uploaded successfully.");
          setUploadStatus("success");
          setPage("3"); // Navigate to the next page
        } catch (err) {
          console.error(err);
          setMessage("Error during file processing.");
          setUploadStatus("error");
        } finally {
          setUploading(false); // Hide spinner
        }
      };

      reader.onerror = () => {
        setUploading(false);
        setError("Error reading the file.");
      };

      reader.readAsArrayBuffer(file); // Read the file
    } catch (err) {
      console.error(err);
      setMessage(`Error uploading file: ${err.message}`);
      setUploadStatus("error");
      setUploading(false); // Ensure spinner hides
    }
  };

  useEffect(() => {
    if (uploading || message || error) {
      messageRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [uploading, message, error]);

  return (
    <div>
      {page === "0" ? (
        <div className="page0">
          <nav className="navbar navbar-expand-lg navbar-light fixed-top shadow-sm" id="mainNav">
            <div className="container">
                <a className="navbar-brand fw-bold" href="#page-top">Better Shopping</a> 
            </div>
          </nav>
          <header className="masthead">
            <div className="container">
                <div className="row gx-5 align-items-center">
                    <div className="col">
                        <div className="mb-5 mb-lg-0 text-center text-lg-start">
                            <h1 className="display-2 lh-1 mb-3">Better Shopping: Sustainability & Health Insights</h1>
                            <p className="lead fw-normal text-muted mb-5 fs-5"> Here you will get more information about the purchases: <br/>
                            how environmental friendly they are, their nutritional value, and more. </p>
                            <div className="d-flex flex-column flex-lg-row align-items-center">
                            </div>
                        </div>
                    </div>
                    <div className="col">
                      <div className="masthead-device-mockup">
                        <img src={shopping_cart} className="shopping_cart" alt="shopping_cart" /> 
                      </div>
                    </div>
                </div>
            </div>
          </header>
          <section className="features">
            <div className="container">      
              <div className="row">
                  <div className="col-3 md-2 mb-5">
                    <div className="text-center">                                     
                        <h3 className="display-3">Upload</h3> 
                        <p className="h4 text-muted mb-0">Upload the shopping data</p>
                    </div>
                  </div>
                  <div className="col-1 md-2 mb-5">
                    <img src={arrow} className="arrow" alt="arrow" /> 
                  </div>
                  <div className="col-3 md-2 mb-5">                                   
                      <div className="text-center">
                          <h3 className="display-3">Enrich</h3>
                          <p className="h4 text-muted mb-0">An enrichment of the data will be done with the help of{' '}
                          <a href="https://world.openfoodfacts.org/" target="_blank" rel="noreferrer">
                            Open Food Facts
                          </a>{' '}
                          database</p>
                      </div>
                  </div>   
                  <div className="col-1 md-2 mb-5">
                      <img src={arrow} className="arrow" alt="arrow" /> 
                  </div>
                  <div className="col-3 md-2 mb-5">                                   
                      <div className="text-center">
                          <h3 className="display-3">Explore</h3>
                          <p className="h4 text-muted mb-0">You will be able to download a file with the results and start exploring!</p>
                      </div>
                  </div>   
              </div>                    
            </div>
        </section>
        <nav aria-label="Page navigation example">
            <ul className="pagination">
              <li className="page-item">
                <button onClick={handleContinue0} className="btn btn-warning">Start</button>
              </li>
            </ul>
          </nav>
        </div>
      ) : null}

      {page === "1" && (
        <div className="page1">
          <div className="container">
            <div className="card w-75 mb-3">
              <div className="card-header">
                <h2>Upload: File</h2>
              </div>
              <div className="card-body">
                <p className="card-text">Please select the <strong>Excel</strong> file donated by the consumer.</p>
                <label htmlFor="choose_file_btn" className="btn btn-success">Choose file</label>
                <input id="choose_file_btn" style={{display:"none"}} type="file" onChange={uploadFile}  accept=".xlsx, .xls"/>
                {/* Display the name of the selected file */}
                {fileName && (
                  <p className="mt-3"><strong>Selected file:</strong> {fileName}</p>
                )}
              {/* Display error message if there's one */}
              {error && (
                  <p className="text-danger mt-2">{error}</p>
                )}
              </div>
            </div>
            <nav aria-label="Page navigation example">
              <ul className="pagination">
                <li className="page-item-back">
                  <button onClick={() => setPage("0")} className="page-link bg-warning text-dark">Back</button>
                </li>
                <li className="page-item-continue">
                  <button onClick={handleContinue} className="page-link bg-warning text-dark">Continue</button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      )}

      {page === "2" && (
        <div className="page2">
          <div className="container">
            <div className="card w-75 mb-3">
              <div className="card-header">
                  <h2>Enrich</h2>
                  <h3>Please press "Start" to begin with the enrichment</h3>
              </div>
            </div>

              {/* Upload button */}
              <div className="row">
              <div>
                <nav aria-label="Page navigation example">
                  <ul className="pagination">
                    <li className="page-item-back">
                      <button onClick={() => setPage("1")} className="page-link bg-warning text-dark" disabled={uploading}>
                        Back
                      </button>
                    </li>
                    <li className="page-item-continue">
                      <button onClick={startEnrichment} className="page-link bg-success text-dark" type="button" disabled={uploading}>
                        Start
                      </button>
                    </li>
                  </ul>
                </nav>

                {/* Show spinner while uploading */}
                <div> 
                  {uploading && (
                    <div className="text-center mt-3">
                      <div className="spinner-border text-primary" role="status">
                        <span className="sr-only"></span>
                      </div>
                      <p>Uploading file, please wait...</p>
                    </div>
                  )}
                </div>

                <div ref={messageRef} className="mt-3">
                  {message && <p className="alert alert-info">{message}</p>}
                  {error && <p className="alert alert-danger">{error}</p>}
                 </div>
            </div>
            </div>
          </div>
        </div>
      )}

      {page === "3" && (
        <div className="text-center mt-5">
          <h2>The data was downloaded</h2>
          <p>You can close this page now</p>
        </div>
      )}

    </div>
  );
};

export default FileUploader;
