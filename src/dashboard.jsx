// import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { useDropzone } from 'react-dropzone';
// import './Dashboard.css';

// const DashboardPage = () => {
//   const [files, setFiles] = useState([]);
//   const navigate = useNavigate();

//   const onDrop = (acceptedFiles) => {
//     const pdfFiles = acceptedFiles.filter(file => file.type === 'application/pdf');
//     if (pdfFiles.length === 0) {
//       alert("Please upload a valid PDF file.");
//       return;
//     }
//     setFiles(pdfFiles);
//     // Future: Process PDF for text extraction and annotations
//   };

//   const { getRootProps, getInputProps } = useDropzone({
//     onDrop,
//     accept: 'application/pdf',
//     multiple: true,
//   });

//   return (
//     <div className="dashboard-container">
//       <h2>Welcome to Your Dashboard</h2>
//       <p>Drop your PDF files below to start reading and annotating.</p>
      
//       <div {...getRootProps()} className="dropzone">
//         <input {...getInputProps()} />
//         <p>Drag & drop PDF files here, or click to select files</p>
//       </div>
      
//       <div className="file-list">
//         {files.length > 0 && <h3>Uploaded Files:</h3>}
//         <ul>
//           {files.map((file, index) => (
//             <li key={index}>{file.name}</li>
//           ))}
//         </ul>
//       </div>
      
//       <button onClick={() => navigate('/')}>Sign Out</button>
//     </div>
//   );
// };

// export default DashboardPage;

// const DashboardPage = () => {
//   const [files, setFiles] = useState([]);
//   const [selectedFile, setSelectedFile] = useState(null);
//   const navigate = useNavigate();

//   const onDrop = (acceptedFiles) => {
//     const pdfFiles = acceptedFiles.filter(file => file.type === 'application/pdf');
//     if (pdfFiles.length === 0) {
//       alert("Please upload a valid PDF file.");
//       return;
//     }
//     setFiles(pdfFiles);
//     setSelectedFile(pdfFiles[0]); // Set the first file for annotation overlay
//   };

//   const { getRootProps, getInputProps } = useDropzone({
//     onDrop,
//     accept: 'application/pdf',
//     multiple: true,
//   });

//   return (
//     <div className="dashboard-container">
//       <h2>Welcome to Your Dashboard</h2>
//       <p>Drop your PDF files below to start reading and annotating.</p>
      
//       <div {...getRootProps()} className="dropzone">
//         <input {...getInputProps()} />
//         <p className="dropzone-text">Drag & drop PDF files here, or click to select files</p>
//       </div>
      
//       <div className="file-list">
//         {files.length > 0 && <h3>Uploaded Files:</h3>}
//         <ul>
//           {files.map((file, index) => (
//             <li key={index} onClick={() => setSelectedFile(file)}>{file.name}</li>
//           ))}
//         </ul>
//       </div>
      
//       {selectedFile && (
//         <div className="overlay">
//           <h3>Annotating: {selectedFile.name}</h3>
//           <iframe src={URL.createObjectURL(selectedFile)} className="pdf-viewer" title="PDF Viewer"></iframe>
//         </div>
//       )}
      
//       <button onClick={() => navigate('/')}>Sign Out</button>
//     </div>
//   );
// };

// export default DashboardPage;

// import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { useDropzone } from 'react-dropzone';
// import supabase from '../src/supabaseClient';
// import './Dashboard.css';

// const DashboardPage = () => {
//   const [files, setFiles] = useState([]);
//   const [selectedFile, setSelectedFile] = useState(null);
//   const [user, setUser] = useState(null);
//   const navigate = useNavigate();

//   useEffect(() => {
//     const fetchUser = async () => {
//       const { data: { user } } = await supabase.auth.getUser();
//       if (!user) navigate('/');
//       setUser(user);
//     };
//     fetchUser();
//   }, [navigate]);

//     /// STARTING FROM HERE
//   const onDrop = async (acceptedFiles) => {
//     // Ensure the user is authenticated
//     const { data: { user }, error: authError } = await supabase.auth.getUser();
//     if (authError || !user) {
//       console.error('Authentication error:', authError);
//       alert('You need to be logged in to upload files.');
//       return;
//     }

//     console.log('Authenticated user ID:', user.id);

//     // Filter for PDF files
//     const pdfFiles = acceptedFiles.filter(file => file.type === 'application/pdf');
//     if (pdfFiles.length === 0) {
//       alert("Please upload a valid PDF file.");
//       return;
//     }

//     // Set the first file for annotation overlay
//     const file = pdfFiles[0]; // Initialize the `file` variable here
//     setFiles(pdfFiles);
//     setSelectedFile(file);

//     // Upload file to Supabase Storage
//     const filePath = `user_files/${user.id}/${Date.now()}-${file.name}`; // Unique file path
//     console.log('File path:', filePath);
//     console.log('File object:', file);

//     const { data: fileData, error: fileError } = await supabase.storage
//       .from('pdf-files') // Ensure this matches the bucket name
//       .upload(filePath, file, { upsert: true });

//     if (fileError) {
//       console.error('Storage upload error:', fileError);
//       alert(`Upload error: ${JSON.stringify(fileError, null, 2)}`);
//       return;
//     }

//     // Log the data being inserted
//     const insertData = {
//       user_id: user.id,
//       file_name: file.name,
//       file_path: filePath,
//       created_at: new Date().toISOString(),
//     };
//     console.log('Insert data:', insertData);

//     // Save file reference to the database
//     const { data: dbData, error: insertError } = await supabase
//       .from('user_files')
//       .insert([insertData]);

//     if (insertError) {
//       console.error('Database insert error:', insertError);
//       alert(`Database insert error: ${insertError.message}`);
//       return;
//     }

//     console.log('File uploaded and inserted successfully:', dbData);
//   };
//     ///ENDING HERE

//   const { getRootProps, getInputProps } = useDropzone({
//     onDrop,
//     accept: 'application/pdf',
//     multiple: true,
//   });

//   return (
//     <div className="dashboard-container">
//       <h2>Welcome to Your Dashboard</h2>
//       <p>Drop your PDF files below to start reading and annotating.</p>
      
//       <div {...getRootProps()} className="dropzone">
//         <input {...getInputProps()} />
//         <p className="dropzone-text">Drag & drop PDF files here, or click to select files</p>
//       </div>
      
//       <div className="file-list">
//         {files.length > 0 && <h3>Uploaded Files:</h3>}
//         <ul>
//           {files.map((file, index) => (
//             <li key={index} onClick={() => setSelectedFile(file)}>{file.name}</li>
//           ))}
//         </ul>
//       </div>
      
//       {selectedFile && (
//         <div className="overlay">
//           <h3>Annotating: {selectedFile.name}</h3>
//           <iframe src={URL.createObjectURL(selectedFile)} className="pdf-viewer" title="PDF Viewer"></iframe>
//         </div>
//       )}
      
//       <button onClick={() => navigate('/')}>Sign Out</button>
//     </div>
//   );
// };

// export default DashboardPage;


