//TTS WORKS BUT NO PAUSE/STOP, LOADS WHOLE PDF

import { v4 as uuidv4 } from 'uuid';
import * as fabric from 'fabric';
import supabase from '../src/supabaseClient';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import './Dashboard.css';
import { useState, useEffect, useRef } from 'react';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

const DashboardPage = () => {
  const [userId, setUserId] = useState('');
  const [media, setMedia] = useState([]);
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

    const fileId = uuidv4();
    const fileUrl = URL.createObjectURL(file);
    setSelectedFile({ id: fileId, url: fileUrl, type: file.type, name: file.name });

    const filePath = `${userId}/${fileId}_${file.name}`;
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
        id: item.name.split('_')[0],
        name: item.name,
        url: supabase.storage.from('uploads').getPublicUrl(`${userId}/${item.name}`).data.publicUrl,
        type: item.name.endsWith('.pdf') ? 'application/pdf' : 'unknown'
      }));
      setMedia(mediaWithUrls);
    }
  };

  const initCanvas = () => {
    if (annotationCanvasRef.current) {
      if (fabricCanvas.current) {
        fabricCanvas.current.dispose();
      }

      fabricCanvas.current = new fabric.Canvas(annotationCanvasRef.current, {
        isDrawingMode: true,
        selection: false,
        width: annotationCanvasRef.current.width,
        height: annotationCanvasRef.current.height,
      });

      fabricCanvas.current.freeDrawingBrush = new fabric.PencilBrush(fabricCanvas.current);
      fabricCanvas.current.freeDrawingBrush.color = "rgba(255, 255, 0, 0.5)";
      fabricCanvas.current.freeDrawingBrush.width = 5;

      fabricCanvas.current.on('path:created', async (event) => {
        const path = event.path;
        const annotationData = path.toJSON();

        const { data, error } = await supabase
          .from('annotations')
          .insert([
            {
              file_id: selectedFile.id,
              user_id: userId,
              annotation_data: annotationData,
            },
          ]);

        if (error) {
          console.error('Error saving annotation:', error);
        } else {
          console.log('Annotation saved successfully:', data);
        }
      });
    }
  };

  const renderPDF = async (pdfUrl) => {
    try {
      const pdf = await pdfjsLib.getDocument({ url: pdfUrl }).promise;
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

      await page.render(renderContext).promise;

      const annotationCanvas = annotationCanvasRef.current;
      annotationCanvas.width = canvas.width;
      annotationCanvas.height = canvas.height;

      initCanvas();
      setTimeout(loadAnnotations, 500);

    } catch (error) {
      console.error("Error rendering PDF:", error);
    }
  };

  const loadAnnotations = async () => {
    if (!selectedFile || !userId) return;

    console.log("Fetching annotations for file_id:", selectedFile.id);
    console.log("Fetching annotations for user_id:", userId);

    const { data, error } = await supabase
      .from("annotations")
      .select("annotation_data")
      .eq("file_id", selectedFile.id)
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching annotations:", error);
      return;
    }

    console.log("Annotations fetched:", data);

    fabricCanvas.current.clear();

    if (data.length > 0) {
      data.forEach((annotation) => {
        const annotationData = annotation.annotation_data;

        console.log("Loading annotation:", annotationData);

        const pathObject = new fabric.Path(annotationData.path, {
          left: annotationData.left,
          top: annotationData.top,
          fill: null,
          stroke: annotationData.stroke || "black",
          strokeWidth: annotationData.strokeWidth || 2,
          selectable: false,
        });

        console.log("Created Fabric.js Path object:", pathObject);

        fabricCanvas.current.add(pathObject);
        fabricCanvas.current.renderAll();
      });
    } else {
      console.log("No annotations found for this file and user.");
    }
  };

  const speakText = (text) => {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices();
    utterance.voice = voices.find((voice) => voice.lang === 'en-US') || voices[0];
    synth.speak(utterance);
  };

  const extractTextFromImage = async (imageUrl) => {
    const { data: { text } } = await Tesseract.recognize(imageUrl, 'eng');
    return text;
  };

  const handleTTS = async () => {
    if (selectedFile && selectedFile.type === "application/pdf") {
      try {
        console.log("Loading PDF document...");
        const pdf = await pdfjsLib.getDocument({ url: selectedFile.url }).promise;
        console.log("PDF document loaded. Number of pages:", pdf.numPages);

        let fullText = '';

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          console.log(`Extracting text from page ${pageNum}...`);
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({ canvasContext: context, viewport }).promise;
          const imageUrl = canvas.toDataURL('image/png');

          const pageText = await extractTextFromImage(imageUrl);
          console.log(`Page ${pageNum} text:`, pageText);
          fullText += pageText + ' ';
        }

        if (fullText.trim()) {
          console.log("Extracted text:", fullText);
          speakText(fullText);
        } else {
          console.error("No text found in PDF.");
          alert("No text could be extracted from the PDF.");
        }
      } catch (error) {
        console.error("Error extracting text from PDF:", error);
        alert("An error occurred while extracting text from the PDF.");
      }
    } else {
      console.log("No PDF file selected.");
      alert("Please select a PDF file first.");
    }
  };

  useEffect(() => {
    if (selectedFile && selectedFile.type === "application/pdf") {
      console.log("Selected file is a PDF:", selectedFile.url);
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

          <div className="file-list">
            <h3>Your Uploaded Files</h3>
            <ul>
              {media.map((file, index) => (
                <li key={index} onClick={() => setSelectedFile(file)}>
                  {file.name}
                </li>
              ))}
            </ul>
          </div>

          <div className="viewer">
            {selectedFile && selectedFile.type === "application/pdf" && (
              <div className="annotation-container">
                <canvas ref={pdfCanvasRef} className="pdf-canvas"></canvas>
                <canvas ref={annotationCanvasRef} className="annotation-canvas"></canvas>
              </div>
            )}
          </div>

          <div className="tts-section">
            <button onClick={handleTTS}>Read PDF Aloud</button>
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