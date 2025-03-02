import { useEffect, useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as fabric from 'fabric';
import supabase from '../src/supabaseClient';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import * as pdfjsLib from 'pdfjs-dist';
import './Dashboard.css';

// Set the worker source using a compatible CDN URL
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

const DashboardPage = () => {
  const [userId, setUserId] = useState('');
  const [media, setMedia] = useState([]); // Add this line
  const [selectedFile, setSelectedFile] = useState(null);
  const pdfCanvasRef = useRef(null);
  const annotationCanvasRef = useRef(null);
  const fabricCanvas = useRef(null);

  useEffect(() => {
    getUser();
  }, []);

  useEffect(() => {
    if (userId) getMedia();
  }, [userId]);

  const getUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user ? user.id : '');
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  const uploadFile = async (file) => {
    if (!file || !userId) return;

    const fileUrl = URL.createObjectURL(file);
    setSelectedFile({ url: fileUrl, type: file.type }); // Store both URL and type
    console.log("Selected file URL:", fileUrl, "Type:", file.type);

    const filePath = `${userId}/${uuidv4()}_${file.name}`;
    const { error } = await supabase.storage.from('uploads').upload(filePath, file);

    if (error) {
      console.error('Upload error:', error);
    } else {
      getMedia();
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) uploadFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const getMedia = async () => {
    if (!userId) return;

    const { data, error } = await supabase.storage.from('uploads').list(`${userId}/`, {
      limit: 10,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' }
    });

    if (error) {
      console.error('Error fetching media:', error);
    } else {
      const mediaWithUrls = data.map(item => ({
        name: item.name,
        url: supabase.storage.from('uploads').getPublicUrl(`${userId}/${item.name}`).data.publicUrl
      }));
      setMedia(mediaWithUrls); // Use setMedia here
    }
  };

  const initCanvas = () => {
    if (annotationCanvasRef.current && !fabricCanvas.current) {
      console.log("Initializing Fabric.js canvas");
      fabricCanvas.current = new fabric.Canvas(annotationCanvasRef.current, {
        isDrawingMode: true, // Enable drawing mode
        selection: false, // Disable object selection
        width: annotationCanvasRef.current.width, // Match PDF canvas width
        height: annotationCanvasRef.current.height, // Match PDF canvas height
      });

      console.log("Fabric.js canvas initialized:", fabricCanvas.current);

      // Manually initialize freeDrawingBrush if it doesn't exist
      if (!fabricCanvas.current.freeDrawingBrush) {
        fabricCanvas.current.freeDrawingBrush = new fabric.PencilBrush(fabricCanvas.current);
        console.log("Manually initialized freeDrawingBrush");
      }

      // Set brush properties for highlighting
      if (fabricCanvas.current.freeDrawingBrush) {
        fabricCanvas.current.freeDrawingBrush.color = "rgba(255, 255, 0, 0.5)"; // Yellow highlight
        fabricCanvas.current.freeDrawingBrush.width = 5; // Brush size
        console.log("FreeDrawingBrush initialized successfully");
      } else {
        console.error("FreeDrawingBrush is still not initialized");
      }

      // Add a path:created event listener to persist drawn paths
      fabricCanvas.current.on('path:created', (event) => {
        const path = event.path;
        console.log("Path created:", path);

        // Add the path to the canvas
        fabricCanvas.current.add(path);
        fabricCanvas.current.renderAll(); // Re-render the canvas
      });
    }
  };

  const renderPDF = async (pdfUrl) => {
    try {
      console.log("Loading PDF from URL:", pdfUrl);
      const pdf = await pdfjsLib.getDocument({ url: pdfUrl }).promise;
      console.log("PDF loaded successfully");

      const page = await pdf.getPage(1);
      const scale = 1.5;
      const viewport = page.getViewport({ scale });

      const canvas = pdfCanvasRef.current;
      const context = canvas.getContext("2d");

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      console.log("Rendering PDF page...");
      await page.render(renderContext).promise;
      console.log("PDF rendered successfully");

      // Set the annotation canvas dimensions to match the PDF canvas
      const annotationCanvas = annotationCanvasRef.current;
      annotationCanvas.width = canvas.width;
      annotationCanvas.height = canvas.height;

      // Initialize the annotation canvas after rendering the PDF
      initCanvas();
    } catch (error) {
      console.error("Error rendering PDF:", error);
    }
  };

  useEffect(() => {
    if (selectedFile && selectedFile.type === "application/pdf") {
      renderPDF(selectedFile.url);
    }
  }, [selectedFile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserId('');
  };

  return (
    <div className="dashboard-page">
      {userId ? (
        <>
          <div className="upload-section" onDrop={handleDrop} onDragOver={handleDragOver}>
            <input type="file" onChange={handleFileSelect} accept="application/pdf" />
            <p>Drag & drop a PDF file here or click to upload</p>
          </div>

          <div className="viewer">
            {selectedFile && selectedFile.type === "application/pdf" && (
              <div className="annotation-container">
                <canvas ref={pdfCanvasRef} className="pdf-canvas"></canvas>
                <canvas ref={annotationCanvasRef} className="annotation-canvas"></canvas>
              </div>
            )}
          </div>

          <div className="sign-out">
            <button onClick={signOut}>Logout</button>
          </div>
        </>
      ) : (
        <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} />
      )}
    </div>
  );
};

export default DashboardPage;
