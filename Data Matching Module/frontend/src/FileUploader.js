import React, { useState } from 'react'; 
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
  const [page, setPage] = useState("0"); // Tracks sheet view for navigation
  const [error, setError] = useState(''); // Holds error message
  const [message, setMessage] = useState(''); // Stores user messages
 
  /**
   * Handles file selection and validation.
   * Reads the file and extracts sheet details.
   * @param {Event} event - The file input change event
   */
  const uploadFile = (event) => {
    // Get the first selected file from the file input
    const selectedFile = event.target.files[0];
    // If no file was selected, exit early
    if (!selectedFile) return;

    // Define the allowed file extensions
    const extensions = [".xlsx", ".xls"];
    // Extract the extension of the selected file 
    const fileExtension = selectedFile.name.split(".").pop().toLowerCase();

    // Validate if the selected file has a valid Excel extension
    if (!extensions.includes(`.${fileExtension}`)) {
      // If invalid, set an error message and clear any previously selected file
      setError("Invalid file format. Please select an Excel file (.xlsx, .xls).");
      setFile(null);
      setFileName("");
      return;
    }

    // If valid, store the selected file and its name in the state
    setFile(selectedFile);
    setFileName(selectedFile.name);
    // Clear any previous error message
    setError("");

    // Create a FileReader instance 
    const reader = new FileReader();
    // Start reading the file as binary data
    reader.readAsArrayBuffer(selectedFile);
  };
  
    /**
   * Sends the file to the backend for enrichment.
   * @param {Blob} fileBlob - The file data in blob format
   */
    const callPythonFunction = async (blobi) => {
      try {
        // Create a Blob from the binary data to prepare it for upload
        const blob = new Blob([blobi], { type: "application/octet-stream" });
    
        // Send the Blob to the Python backend via a POST request
        const response = await fetch("http://127.0.0.1:5000/", {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
          },
          body: blob,
        });

        if (response.ok) {
          // If the backend responds successfully, receive the enriched CSV file as a Blob
          const csvBlob = await response.blob();
    
          // Create a temporary URL for the CSV file to trigger download
          const url = window.URL.createObjectURL(csvBlob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "enriched_data.csv"; 
          document.body.appendChild(a);
          a.click(); 
          document.body.removeChild(a); 
        } else {
          // Log an error if the response is not successful
          console.error("Failed to fetch data from backend.");
        }
      } catch (error) {
        // Log any unexpected errors during the request
        console.error("Error:", error);
      }
    };
  
      // Handle error message "Continue" button click
      const handleContinue0 = () => {
        // Clear error state and reset file-related states
        setError("");
        setFile("");
        setFileName("");
        // Navigate back to the first page
        setPage("1");
      };
  
    // Handle error message "Continue" button click
    const handleContinue = () => {
      // Validate that a file has been selected before proceeding
      if (!file) {
        setError("Please choose a file before continuing.");
        return;
      }
      // Proceed to the next page
      setPage("2");
    };

    /**
   * Handles file file enrichment/upload process
   */
  const startEnrichment = async () => {
  try {
    // Indicate that uploading is in progress
    setUploading(true);
    // Clear any previous errors
    setError("");

    // Create a new FileReader instance to read the file
    const reader = new FileReader();

    // Define the callback to handle successful file reading
    reader.onload = async (e) => {
      try {
        // Convert the file data to a Uint8Array for binary processing
        const data = new Uint8Array(e.target.result);
        // Call a Python function (likely through an API) with the binary data
        await callPythonFunction(data);
        // Notify user of successful upload
        setMessage("File uploaded successfully.");
        // Navigate to the next page/step
        setPage("3");
      } catch (err) {
        // Log and display any errors that occur during processing
        console.error(err);
        setMessage("Error during file processing.");
      } finally {
        // Reset uploading state regardless of success or failure
        setUploading(false);
      }
    };

    // Define the callback to handle file reading errors
    reader.onerror = () => {
      // Reset uploading state and display error message
      setUploading(false);
      setError("Error reading the file.");
    };

    // Start reading the file as an ArrayBuffer (binary data)
    reader.readAsArrayBuffer(file);
  } catch (err) {
    // Handle unexpected errors during the overall process
    console.error(err);
    setMessage(`Error uploading file: ${err.message}`);
    setUploading(false);
  }
};

  return (
    <div>
      {/* Page 0: Overview of process */}
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
                <button onClick={handleContinue0} className="btn btn-warning btn-lg">Start</button>
              </li>
            </ul>
          </nav>
        </div>
      ) : null}
      {/* Page 1: File Upload */}
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
                {fileName && (
                  <p className="mt-3"><strong>Selected file:</strong> {fileName}</p>
                )}
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
      {/* Page 2: Enrich Data */}
      {page === "2" && (
        <div className="page2">
          <div className="container">
            <div className="card w-75 mb-3">
              <div className="card-header">
                  <h2>Enrich</h2>
              </div>
              <div className="card-body">
                <p className="card-text"> 
                Please click <strong>"Start"</strong> to begin with the enrichment process of the selected file. This could take some minutes. <br/>
                In case you want to go back and select another file click on <strong>Back</strong>.</p>
              </div>
            </div>

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
                      <button onClick={startEnrichment} className="page-link bg-success text-light" type="button" disabled={uploading}>
                        Start
                      </button>
                    </li>
                  </ul>
                </nav>

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

                <div  className="mt-3">
                  {message && <p className="alert alert-info">{message}</p>}
                  {error && <p className="alert alert-danger">{error}</p>}
                 </div>
            </div>
            </div>
          </div>
        </div>
      )}
      {/* Page 3: End message */}
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
