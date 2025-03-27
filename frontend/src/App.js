import React, { useState } from "react";
import FileUploader from './FileUploader'; // Main code
import 'bootstrap/dist/css/bootstrap.css'; // CSS Framework for design 

function App() {
  const [setSelectedFile] = useState(null);

  return (
    <div className="container-fluid">
      <div className="col-12">
        <FileUploader onFileSelect={setSelectedFile} />
      </div>
    </div>
  );
}

export default App;
