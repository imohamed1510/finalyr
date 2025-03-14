// // //TTS added chnagin speed + fonts but still have speech synthesis error, LOADS WHOLE PDF,audio not connected to supabase

// STT CAN CHANGE SPEED BUT DOESNT CONTINUE FORM WHERE IT WAS
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

  useEffect(() => {
    if (utterance && isPlaying) {
      const synth = window.speechSynthesis;
      let lastSpokenWordIndex = 0;

      utterance.onboundary = (event) => {
        // Ensure we are tracking words correctly
        if (event.name === "word") {
          lastSpokenWordIndex = event.charIndex;
        }
      };

      // Stop current speech
      synth.cancel();

      setTimeout(() => {
        // Get remaining text from the last spoken word index
        const words = utterance.text.split(" ");
        const remainingText = words.slice(lastSpokenWordIndex).join(" ");

        if (!remainingText.trim()) return; // Prevent empty speech

        // Create a new utterance
        const newUtterance = new SpeechSynthesisUtterance(remainingText);
        newUtterance.voice = selectedVoice;
        newUtterance.rate = speed;

        // Maintain event listeners
        newUtterance.onstart = () => setIsPlaying(true);
        newUtterance.onend = () => setIsPlaying(false);
        newUtterance.onerror = (error) => {
          console.error("Speech synthesis error:", error);
          setIsPlaying(false);
        };

        // Update state and restart speech
        setUtterance(newUtterance);
        synth.speak(newUtterance);
      }, 300); // Slight delay for smooth transition
    }
  }, [speed]); // Runs when speed changes

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

    // Cancel any ongoing speech
    synth.cancel();

    // Create a new utterance
    const newUtterance = new SpeechSynthesisUtterance(text);
    newUtterance.voice = selectedVoice;
    newUtterance.rate = speed;

    // Set up event listeners for the utterance
    newUtterance.onstart = () => {
      setIsPlaying(true);
    };

    newUtterance.onend = () => {
      setIsPlaying(false);
    };

    newUtterance.onerror = (error) => {
      console.error("Speech synthesis error:", error);
      setIsPlaying(false);
    };

    // Set the utterance and start speaking
    setUtterance(newUtterance);
    synth.speak(newUtterance);
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
      window.speechSynthesis.cancel(); // Stop current speech
      lastSpokenWordIndex.current = 0; // Reset position

      setTimeout(() => {
        const newUtterance = new SpeechSynthesisUtterance(extractedText); // ✅ Use extracted text
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
            lastSpokenWordIndex.current = event.charIndex;
          }
        };

        setUtterance(newUtterance);
        window.speechSynthesis.speak(newUtterance);
      }, 200); // Prevent "interrupted" errors
    }
  };




  const extractTextFromImage = async (imageUrl) => {
    const { data: { text } } = await Tesseract.recognize(imageUrl, 'eng');
    return text;
  };

  const handleTTS = async () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);

    if (selectedFile && selectedFile.type === "application/pdf") {
      try {
        console.log("Loading PDF document...");
        const pdf = await pdfjsLib.getDocument({ url: selectedFile.url }).promise;
        console.log("PDF document loaded. Number of pages:", pdf.numPages);

        let textContent = '';

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          console.log(`Extracting text from page ${pageNum}...`);
          const page = await pdf.getPage(pageNum);
          const text = await page.getTextContent();

          // Extract text from PDF
          textContent += text.items.map(item => item.str).join(" ") + " ";
        }

        setExtractedText(textContent); // ✅ Save extracted text

        if (textContent.trim()) {
          console.log("Extracted text:", textContent);
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

  useEffect(() => {
    const synth = window.speechSynthesis;
    const availableVoices = synth.getVoices();
    setVoices(availableVoices);
    if (availableVoices.length > 0) {
      setSelectedVoice(availableVoices.find((voice) => voice.lang === 'en-US') || availableVoices[0]);
    }
  }, []);

  useEffect(() => {
    if (utterance && isPlaying) {
      utterance.onboundary = (event) => {
        if (event.name === "word") {
          lastSpokenWordIndex.current = event.charIndex; // Use `.current`
        }
      };
    }
  }, [utterance, isPlaying]);

  const updateSpeed = (newSpeed) => {
    setSpeed(newSpeed);

    if (utterance && isPlaying) {
      const synth = window.speechSynthesis;
      const remainingText = utterance.text.slice(lastSpokenWordIndex.current);

      if (!remainingText.trim()) return;

      synth.cancel(); // Stop only if absolutely needed

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
          lastSpokenWordIndex.current = event.charIndex;
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
                onChange={(e) => updateSpeed(parseFloat(e.target.value))}
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

