
//UPDATED CSS, NEED TO FIX SYNCHRO HIGHLIGHTING FOR SELECTED TEXT, CONNECTED COMMENTS TO SUPABASE 
import { v4 as uuidv4 } from 'uuid';
import * as fabric from 'fabric';
import supabase from '../src/supabaseClient';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import './Dashboard.css';
import { useState, useEffect, useRef } from 'react';
import { FaComment, FaTimes } from 'react-icons/fa';

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
  const textPositionsRef = useRef([]);
  const currentHighlights = useRef([]);
  const [selectedText, setSelectedText] = useState("");
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [selectedComment, setSelectedComment] = useState(null);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [commentPosition, setCommentPosition] = useState({ x: 0, y: 0 });

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
    const filePath = `${userId}/${fileId}_${file.name}`;
    
    try {
      
      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, file);
  
      if (uploadError) throw uploadError;
  
      //Create a URL for immediate use
      const { data: { publicUrl } } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);
  
      //Update UI as
      setSelectedFile({ 
        id: fileId, 
        url: publicUrl, 
        type: file.type, 
        name: file.name 
      });
  
      // 4. Refresh the media list
      await getMedia();
  
    } catch (error) {
      console.error('Upload error:', error);
      alert('File upload failed. Please try again.');
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


  //updated the getmedia
  const getMedia = async () => {
    if (!userId) return;
  
    try {
      // List files from storage
      const { data, error } = await supabase.storage
        .from('uploads')
        .list(`${userId}/`);
  
      if (error) throw error;
  
      // Create proper file objects with URLs
      const mediaWithUrls = await Promise.all(
        data.map(async (item) => {
          const { data: { publicUrl } } = supabase.storage
            .from('uploads')
            .getPublicUrl(`${userId}/${item.name}`);
  
          return {
            id: item.name.split('_')[0], 
            name: item.name,
            url: publicUrl,
            type: item.name.endsWith('.pdf') ? 'application/pdf' : 'unknown'
          };
        })
      );
  
      setMedia(mediaWithUrls);
    } catch (error) {
      console.error('Error fetching media:', error);
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

      // Clear existing highlights
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

          // Add new highlights
          currentHighlights.current = matching.map(pos => {
            const rect = new fabric.Rect({
              left: pos.x,
              top: pos.y - pos.height,
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
              y: y,
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
        fabricCanvas.current.renderAll();
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
      synth.cancel();

      const resumeFromIndex = lastSpokenWordIndex.current || 0;
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

          const charIndex = lastSpokenWordIndex.current;
          const wordLength = event.charLength;

          const matching = textPositionsRef.current.filter(pos =>
            pos.startIndex <= charIndex + wordLength &&
            pos.endIndex >= charIndex
          );

          currentHighlights.current.forEach(h => fabricCanvas.current.remove(h));
          fabricCanvas.current.renderAll();

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
  
      annotationCanvasRef.current.width = viewport.width;
      annotationCanvasRef.current.height = viewport.height;
  
      await page.render({ canvasContext: context, viewport }).promise;
  
      initCanvas(); // Respects current annotationCanvas size
      await createTextLayer(page, viewport, scale); // Pass scale directly
      loadAnnotations();
    } catch (error) {
      console.error("Error rendering PDF:", error);
    }
  };

  const createTextLayer = async (page, viewport, scale) => {
    const textContent = await page.getTextContent();
    let textLayer = document.querySelector(".text-layer");
  
    if (textLayer) textLayer.remove(); // Remove old layer if exists
  
    textLayer = document.createElement("div");
    textLayer.className = "text-layer";
    textLayer.style.position = "absolute";
    textLayer.style.top = "0";
    textLayer.style.left = "0";
    textLayer.style.width = `${viewport.width}px`;
    textLayer.style.height = `${viewport.height}px`;
    textLayer.style.pointerEvents = isDrawingMode ? "none" : "auto";
    textLayer.style.userSelect = isDrawingMode ? "none" : "text";
  
    textContent.items.forEach((item) => {
      const textDiv = document.createElement("div");
      const [x, y] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
  
      textDiv.textContent = item.str;
      textDiv.style.position = "absolute";
      textDiv.style.left = `${x}px`;
      textDiv.style.top = `${y - item.height * scale}px`;
      textDiv.style.fontSize = `${item.height * scale}px`;
      textDiv.style.color = "transparent";
      textDiv.style.pointerEvents = isDrawingMode ? "none" : "auto";
  
      textLayer.appendChild(textDiv);
    });
  
    textLayer.addEventListener("mouseup", handleTextSelection);
  
    const container = document.querySelector(".annotation-container");
    if (container) container.appendChild(textLayer);
  };
  
  

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const selectedText = selection.toString();
      console.log("Selected Text:", selectedText); // Debugging
      setSelectedText(selectedText);
    }
  };

  const speakSelectedText = () => {
    if (selectedText.trim()) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      // Clear existing highlights
      currentHighlights.current.forEach(h => fabricCanvas.current.remove(h));
      currentHighlights.current = [];
      fabricCanvas.current.renderAll();

      // Create a new utterance
      const newUtterance = new SpeechSynthesisUtterance(selectedText);
      newUtterance.voice = selectedVoice;
      newUtterance.rate = speed;

      newUtterance.onstart = () => {
        console.log("TTS started");
        setIsPlaying(true);
      };

      newUtterance.onend = () => {
        console.log("TTS ended");
        setIsPlaying(false);

        // Clear highlights when speech ends
        currentHighlights.current.forEach(h => fabricCanvas.current.remove(h));
        currentHighlights.current = [];
        fabricCanvas.current.renderAll();
      };

      newUtterance.onerror = (error) => {
        console.error("Speech synthesis error:", error);
        setIsPlaying(false);
      };

      newUtterance.onboundary = (event) => {
        if (event.name === "word") {
          const charIndex = event.charIndex; // Start index of the current word
          const wordLength = event.charLength; // Length of the current word

          // Find matching text positions based on start and end indices
          const matching = textPositionsRef.current.filter(pos =>
            pos.startIndex <= charIndex + wordLength &&
            pos.endIndex >= charIndex
          );

          // Clear previous highlights
          currentHighlights.current.forEach(h => fabricCanvas.current.remove(h));
          currentHighlights.current = [];

          // Add new highlights
          matching.forEach(pos => {
            const rect = new fabric.Rect({
              left: pos.x,
              top: pos.y - pos.height,
              width: pos.width,
              height: pos.height,
              fill: 'rgba(255, 255, 0, 0.3)', // Yellow highlight
              selectable: false,
            });
            fabricCanvas.current.add(rect);
            currentHighlights.current.push(rect);
          });

          fabricCanvas.current.renderAll();
        }
      };

      setUtterance(newUtterance);
      window.speechSynthesis.speak(newUtterance);
    } else {
      console.error("No text selected to read aloud.");
    }
  };

  // useEffect(() => {
  //   if (selectedFile) {
  //     fetchComments();
  //   }
  // }, [selectedFile, userId]);

  // Replace your existing comment functions with these:

  const fetchComments = async () => {
    if (!selectedFile || !userId) return;

    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('file_id', selectedFile.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching comments:', error);
    } else {
      setComments(data || []);
      // Highlight all comments when fetched
      data.forEach(comment => highlightCommentedText(comment));
    }
  };

  const saveComment = async () => {
    if (!selectedFile || !userId || !newComment.trim()) return;
  
    const selection = window.getSelection();
    if (!selection?.toString().trim()) {
      alert("Please select text to comment on");
      return;
    }
  
    const range = selection.getRangeAt(0);
    const selectedText = selection.toString();
    
    try {
      const commentData = {
        user_id: userId,
        file_id: selectedFile.id,
        content: newComment.trim(),
        selection_range: {
          startPath: getXPath(range.startContainer),
          startOffset: range.startOffset,
          endPath: getXPath(range.endContainer),
          endOffset: range.endOffset,
          text: selectedText
        }
      };
  
      // Only include selected_text if you're sure the column exists
      // commentData.selected_text = selectedText;
  
      const { data, error } = await supabase
        .from('comments')
        .insert([commentData])
        .select();
  
      if (error) throw error;
  
      setComments(prev => [data[0], ...prev]);
      highlightCommentedText(data[0]);
      setNewComment("");
    } catch (error) {
      console.error('Detailed error:', {
        message: error.message,
        details: error.details,
        code: error.code
      });
      
      // If it's a schema cache error, try refreshing
      if (error.code === 'PGRST204') {
        console.log('Refreshing schema cache...');
        await supabase.rpc('refresh_schema_cache');
        // Retry without selected_text
        await saveComment();
      } else {
        alert("Failed to save comment. Check console for details.");
      }
    }
  };

  // Helper function to get XPath
  const getXPath = (element) => {
    if (!element) return '';
    
    // If element has an ID, use that for simplicity
    if (element.id) {
      return `//*[@id="${element.id}"]`;
    }
  
    // Handle text nodes by using their parent element
    if (element.nodeType === Node.TEXT_NODE) {
      return getXPath(element.parentNode);
    }
  
    const parts = [];
    while (element && element.nodeType === Node.ELEMENT_NODE) {
      let index = 0;
      const siblings = element.parentNode?.childNodes || [];
      
      for (let i = 0; i < siblings.length; i++) {
        const sibling = siblings[i];
        if (sibling === element) {
          parts.unshift(`${element.tagName.toLowerCase()}[${index + 1}]`);
          break;
        }
        if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === element.tagName) {
          index++;
        }
      }
      
      if (!siblings.length) {
        parts.unshift(element.tagName.toLowerCase());
      }
      
      element = element.parentNode;
    }
  
    return parts.length ? `/${parts.join('/')}` : null;
  };

  // Highlight commented text
  const highlightCommentedText = (comment) => {
    if (!comment?.selection_range) return;
  
    try {
      // First remove any existing highlight for this comment
      document.querySelectorAll(`[data-comment-id="${comment.id}"]`).forEach(el => {
        el.replaceWith(...el.childNodes);
      });
  
      const { startPath, startOffset, endPath, endOffset } = comment.selection_range;
      
      // Find the nodes using XPath
      const startNode = document.evaluate(
        startPath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue;
  
      const endNode = document.evaluate(
        endPath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue;
  
      if (!startNode || !endNode) {
        console.warn('Could not find nodes for comment:', comment.id);
        return;
      }
  
      const range = document.createRange();
      range.setStart(startNode, startOffset);
      range.setEnd(endNode, endOffset);
      
      // Only proceed if the range is valid
      if (range.collapsed) {
        console.warn('Range is collapsed for comment:', comment.id);
        return;
      }
      
      const span = document.createElement('span');
      span.className = 'comment-highlight';
      span.dataset-comment-id ; comment.id;
      span.style.backgroundColor = '#fff8c5';
      span.style.borderBottom = '1px solid #d4d4d4';
      span.style.cursor = 'pointer';
      
      try {
        range.surroundContents(span);
      } catch (e) {
        console.error('Could not surround contents:', e);
        return;
      }
      
      span.addEventListener('click', () => {
        setSelectedComment(comment);
      });
    } catch (error) {
      console.error('Error highlighting comment:', {
        error,
        commentId: comment.id
      });
    }
  };
  
  const deleteComment = async (commentId) => {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('Error deleting comment:', error);
    } else {
      // Remove the highlight from the document
      const highlight = document.querySelector(`[data-comment-id="${commentId}"]`);
      if (highlight) {
        highlight.replaceWith(...highlight.childNodes);
      }
      fetchComments();
    }
  };

  
  



  //   
  return (
    <div className="dashboard-page">
      {userId ? (
        <>
          {/* Header Section */}
          <div className="header-section">
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
          </div>
  
          {/* Main Content Area */}
          <div className="main-content">
            {/* PDF Viewer */}
            <div className="viewer-container">
              {selectedFile && selectedFile.type === "application/pdf" && (
                <div className="viewer">
                  <div className="annotation-container">
                    <canvas ref={pdfCanvasRef} className="pdf-canvas"></canvas>
                    <canvas ref={annotationCanvasRef} className="annotation-canvas"></canvas>
                  </div>
                </div>
              )}
            </div>
            <div className="comment-sidebar">
              <h3>Comments</h3>
              
              {comments.map(comment => (
                <div key={comment.id} className="comment-item">
                  <div className="comment-text">{comment.text}</div>
                  <small>{new Date(comment.created_at).toLocaleString()}</small>
                  <div className="comment-actions">
                    <button onClick={() => setSelectedComment(comment)}>View</button>
                    <button onClick={() => deleteComment(comment.id)}>Delete</button>
                  </div>
                </div>
              ))}
              
              {selectedComment && (
                <div className="comment-input">
                  <h4>Selected Comment</h4>
                  <p>{selectedComment.text}</p>
                  <button onClick={() => setSelectedComment(null)}>Close</button>
                </div>
              )}
              
              <div className="comment-input">
                <h4>Add Comment</h4>
                <textarea 
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Type your comment..."
                />
                <button onClick={saveComment}>Save Comment</button>
              </div>
            </div>
            {/* Controls Sidebar */}
            <div className="controls-sidebar">
              <div className="control-group">
                <button
                  onClick={() => {
                    const selection = window.getSelection();
                    if (selection && selection.toString().trim()) {
                      const range = selection.getRangeAt(0);
                      const rect = range.getBoundingClientRect();
                      const canvasRect = pdfCanvasRef.current.getBoundingClientRect();
                      
                      setCommentPosition({
                        x: rect.right - canvasRect.left + 10,
                        y: rect.top - canvasRect.top
                      });
                      setShowCommentInput(true);
                    } else {
                      alert("Please select text to comment on");
                    }
                  }}
                  className="control-button"
                >
                  Add Comment
                </button>
  
                <button
                  onClick={() => {
                    setIsDrawingMode(prev => {
                      const newMode = !prev;
                      if (fabricCanvas.current) {
                        fabricCanvas.current.isDrawingMode = newMode;
                        fabricCanvas.current.selection = !newMode;
                        
                        const textLayer = document.querySelector(".text-layer");
                        if (textLayer) {
                          textLayer.style.pointerEvents = newMode ? "none" : "auto";
                          textLayer.style.userSelect = newMode ? "none" : "text";
                        }
                      }
                      return newMode;
                    });
                  }}
                  className="control-button"
                >
                  {isDrawingMode ? "Disable Drawing" : "Enable Drawing"}
                </button>
                
                <button className="control-button" onClick={handleTTS}>
                  Read PDF Aloud
                </button>
              </div>
  
              <div className="control-group">
                <button 
                  className="control-button" 
                  onClick={togglePauseResume} 
                  disabled={!utterance}
                >
                  {isPlaying ? "Pause" : "Resume"}
                </button>
                
                <button 
                  className="control-button" 
                  onClick={restartTTS} 
                  disabled={!utterance}
                >
                  Restart
                </button>
              </div>
  
              <div className="control-group">
                <label>
                  Select Voice:
                  <select
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
                </label>
              </div>
  
              <div className="control-group">
                <label>
                  Select Speed:
                  <input
                    type="number"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={speed}
                    onChange={(e) => updateSpeed(parseFloat(e.target.value))}
                  />
                </label>
              </div>
  
              {/* Comments List */}
              <div className="comments-section">
                <h4>Comments</h4>
                <div className="comments-list">
                  {comments.map(comment => (
                    <div key={comment.id} className="comment">
                      <div className="comment-text">{comment.text}</div>
                      <div className="comment-context">"{comment.selected_text}"</div>
                      <button 
                        className="delete-comment"
                        onClick={() => deleteComment(comment.id)}
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
  
              <div className="selected-text-section">
                <h4>Read Selected Text</h4>
                <div className="selected-text-display">
                  {selectedText || "Select text from the PDF to read it aloud"}
                </div>
                <button 
                  onClick={speakSelectedText} 
                  disabled={!selectedText}
                  className="control-button"
                >
                  Read Selected Text
                </button>
              </div>
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
