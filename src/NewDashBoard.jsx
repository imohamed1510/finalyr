//BASIC TTS WORKS WITH SYNCHRO HIGHLIGHTING WHILE CHNAGING SPEED, still get synth error
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
  const [utterance, setUtterance] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [speed, setSpeed] = useState(1);
  const lastSpokenWordIndex = useRef(0);
  const [extractedText, setExtractedText] = useState("");
  const textPositionsRef = useRef([]); // Track text positions
  const currentHighlights = useRef([]); // Track current highlights

  useEffect(() => {
    getUser();
  }, []);

  useEffect(() => {
    if (userId) getMedia();
  }, [userId]);

  useEffect(() => {
    const synth = window.speechSynthesis;
    const availableVoices = synth.getVoices();
    setVoices(availableVoices);
    if (availableVoices.length > 0) {
      setSelectedVoice(availableVoices.find((voice) => voice.lang === 'en-US') || availableVoices[0]);
    }
  }, []);

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

    const { data, error } = await supabase
      .from("annotations")
      .select("annotation_data")
      .eq("file_id", selectedFile.id)
      .eq("user_id", userId);

    if (error) {
      console.error("Error fetching annotations:", error);
      return;
    }

    fabricCanvas.current.clear();

    if (data.length > 0) {
      data.forEach((annotation) => {
        const annotationData = annotation.annotation_data;
        const pathObject = new fabric.Path(annotationData.path, {
          left: annotationData.left,
          top: annotationData.top,
          fill: null,
          stroke: annotationData.stroke || "black",
          strokeWidth: annotationData.strokeWidth || 2,
          selectable: false,
        });

        fabricCanvas.current.add(pathObject);
        fabricCanvas.current.renderAll();
      });
    }
  };

  

  const togglePauseResume = () => {
    const synth = window.speechSynthesis;
    if (isPlaying) {
      synth.pause();
      setIsPlaying(false);
    } else {
      synth.resume();
      setIsPlaying(true);
    }
  };

  
  const restartTTS = () => {
    if (extractedText.trim()) {
      window.speechSynthesis.cancel();
      lastSpokenWordIndex.current = 0;

      // Clears existing highlights
      currentHighlights.current.forEach(h => fabricCanvas.current.remove(h));
      currentHighlights.current = []; 
      fabricCanvas.current.renderAll(); 

      // Create a new utterance with the full text
      const newUtterance = new SpeechSynthesisUtterance(extractedText);
      newUtterance.voice = selectedVoice;
      newUtterance.rate = speed;

      newUtterance.onstart = () => setIsPlaying(true);
      newUtterance.onend = () => setIsPlaying(false);
      newUtterance.onerror = (error) => {
        console.error("Speech synthesis error:", error);
        setIsPlaying(false);
      };

      newUtterance.onboundary = (event) => {
        if (event.name === "word") {
          const charIndex = event.charIndex;
          const wordLength = event.charLength;

          // Find matching text positions
          const matching = textPositionsRef.current.filter(pos => 
            pos.startIndex <= charIndex + wordLength && 
            pos.endIndex >= charIndex
          );

          // Clear previous highlights
          currentHighlights.current.forEach(h => fabricCanvas.current.remove(h));
          fabricCanvas.current.renderAll();

          // Addsnew highlights
          currentHighlights.current = matching.map(pos => {
            const rect = new fabric.Rect({
              left: pos.x,
              top: pos.y - pos.height, // Proper highlighting alignment
              width: pos.width,
              height: pos.height,
              fill: 'rgba(255, 255, 0, 0.3)', 
              selectable: false,
            });
            fabricCanvas.current.add(rect);
            return rect;
          });

          fabricCanvas.current.renderAll(); 
        }
      };

      setUtterance(newUtterance);
      window.speechSynthesis.speak(newUtterance);
    }
  };

  const handleTTS = async () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);

    if (selectedFile && selectedFile.type === "application/pdf") {
      try {
        const pdf = await pdfjsLib.getDocument({ url: selectedFile.url }).promise;
        let currentIndex = 0;
        const textPositions = [];

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.5 });
          const text = await page.getTextContent();

          text.items.forEach((item) => {
            const tx = item.transform[4];
            const ty = item.transform[5];
            const [x, y] = viewport.convertToViewportPoint(tx, ty);

            // Calculate the correct Y-coordinate for Fabric.js
            const canvasY = viewport.height - y - (item.height * viewport.scale);

            textPositions.push({
              str: item.str,
              x: x,
              y: y, //if chgnge from canvasY yo y it underlines not highlights over
              width: item.width * viewport.scale,
              height: item.height * viewport.scale,
              startIndex: currentIndex,
              endIndex: currentIndex + item.str.length,
            });

            currentIndex += item.str.length + 1; // +1 for space
          });
        }

        textPositionsRef.current = textPositions;

        const textContent = textPositions.map(pos => pos.str).join(" ");
        setExtractedText(textContent);

        if (textContent.trim()) {
          speakText(textContent);
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

  const speakText = (text) => {
    const synth = window.speechSynthesis;
    synth.cancel();

    const newUtterance = new SpeechSynthesisUtterance(text);
    newUtterance.voice = selectedVoice;
    newUtterance.rate = speed;

    newUtterance.onboundary = (event) => {
      if (event.name === "word") {
        const charIndex = event.charIndex;
        const wordLength = event.charLength;

        // Find matching text positions
        const matching = textPositionsRef.current.filter(pos => 
          pos.startIndex <= charIndex + wordLength && 
          pos.endIndex >= charIndex
        );

        // Clear previous highlights
        currentHighlights.current.forEach(h => fabricCanvas.current.remove(h));
        fabricCanvas.current.renderAll();

        // Add new highlights
        currentHighlights.current = matching.map(pos => {
          const rect = new fabric.Rect({
            left: pos.x,
            top: pos.y - pos.height,
            width: pos.width,
            height: pos.height,
            fill: 'rgba(237, 237, 22, 0.37)',
            selectable: false,
          });
          fabricCanvas.current.add(rect);
          return rect;
        });
        fabricCanvas.current.renderAll(); // Render the canvas to show the new highlights
      }
    };

  newUtterance.onstart = () => setIsPlaying(true);
  newUtterance.onend = () => setIsPlaying(false);
  newUtterance.onerror = (error) => {
    console.error("Speech synthesis error:", error);
    setIsPlaying(false);
  };

  setUtterance(newUtterance);
  synth.speak(newUtterance);
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

  
  const updateSpeed = (newSpeed) => {
    setSpeed(newSpeed);

    if (utterance && isPlaying) {
        const synth = window.speechSynthesis;
        synth.cancel(); //stop only if needed!!

        const resumeFromIndex = lastSpokenWordIndex.current || 0;

        //use the full extracted text
        const remainingText = extractedText.slice(resumeFromIndex);
        if (!remainingText.trim()) return;

        const newUtterance = new SpeechSynthesisUtterance(remainingText);
        newUtterance.voice = selectedVoice;
        newUtterance.rate = newSpeed;

        newUtterance.onstart = () => setIsPlaying(true);
        newUtterance.onend = () => setIsPlaying(false);
        newUtterance.onerror = (error) => {
            console.error("Speech synthesis error:", error);
            setIsPlaying(false);
        };

        newUtterance.onboundary = (event) => {
            if (event.name === "word") {
                lastSpokenWordIndex.current = resumeFromIndex + event.charIndex;

                // Find matching text positions for highlighting
                const charIndex = lastSpokenWordIndex.current;
                const wordLength = event.charLength;

                const matching = textPositionsRef.current.filter(pos => 
                    pos.startIndex <= charIndex + wordLength && 
                    pos.endIndex >= charIndex
                );

                // Clear old highlights
                currentHighlights.current.forEach(h => fabricCanvas.current.remove(h));
                fabricCanvas.current.renderAll();

                // Add new highlights
                currentHighlights.current = matching.map(pos => {
                    const rect = new fabric.Rect({
                        left: pos.x,
                        top: pos.y - pos.height,
                        width: pos.width,
                        height: pos.height,
                        fill: 'rgba(237, 237, 22, 0.37)',
                        selectable: false,
                    });
                    fabricCanvas.current.add(rect);
                    return rect;
                });
                fabricCanvas.current.renderAll();
            }
        };

        setUtterance(newUtterance);
        synth.speak(newUtterance);
    }
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
            <button onClick={togglePauseResume} disabled={!utterance}>
              {isPlaying ? "Pause" : "Resume"}
            </button>
            <button onClick={restartTTS} disabled={!utterance}>Restart</button>
            <div>
              <label htmlFor="voice-select">Select Voice:</label>
              <select
                id="voice-select"
                value={selectedVoice ? selectedVoice.name : ''}
                onChange={(e) => {
                  const selected = voices.find(voice => voice.name === e.target.value);
                  setSelectedVoice(selected);
                }}
              >
                {voices.map((voice, index) => (
                  <option key={index} value={voice.name}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="speed-select">Select Speed:</label>
              <input
                id="speed-select"
                type="number"
                min="0.5"
                max="2"
                step="0.1"
                value={speed}
                onChange={(e) => updateSpeed(parseFloat(e.target.value))} // Call updateSpeed
              />
            </div>
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



