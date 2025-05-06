
import { v4 as uuidv4 } from 'uuid';
import * as fabric from 'fabric';
import supabase from '../src/supabaseClient';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import './NewDashboard.css';
import { useState, useEffect, useRef } from 'react';
import { FaComment, FaTimes } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';
import './fonts.css'
import { FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';
import { TextLayerBuilder } from 'pdfjs-dist/web/pdf_viewer';
import 'pdfjs-dist/web/pdf_viewer.css';

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
  const [tempSelectionRange, setTempSelectionRange] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const passedFile = location.state?.file;
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef(null);
  const [selectedFont, setSelectedFont] = useState('standard');
  const [textColorTheme, setTextColorTheme] = useState('default');
  const [fontSizeMultiplier, setFontSizeMultiplier] = useState(1);
  const [showTextOverlay, setShowTextOverlay] = useState(false);
  const isDrawingModeRef = useRef(isDrawingMode);
  const annotationContainerRef = useRef(null);
  

  // Single useEffect for initialization
  useEffect(() => {
    const initialize = async () => {
      await getUser();
      
      // If no file was passed, redirect back to file manager
      if (!passedFile) {
        navigate('/file-manager');
        return;
      }
      
      // Set the selected file and load media
      setSelectedFile(passedFile);
      await getMedia();
    };

    initialize();
  }, []);

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
        isDrawingMode: isDrawingMode, //chnaged from true
        interactive: true,
        selection: false,
        preserveObjectStacking: false, // Keep annotations visible
        backgroundColor: 'transparent', // Show through to PDF
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
      // Clear existing highlights and annotations
      currentHighlights.current.forEach(h => fabricCanvas.current?.remove(h));
      currentHighlights.current = [];
      
      // Cancel any ongoing PDF rendering
      if (pdfCanvasRef.current?._pdfPage) {
        pdfCanvasRef.current._pdfPage.cleanup();
      }
  
      const pdf = await pdfjsLib.getDocument({ url: pdfUrl }).promise;
      const page = await pdf.getPage(1);
      const scale = 1.5;
      const viewport = page.getViewport({ scale });
  
      // Store the page reference for cleanup
      pdfCanvasRef.current._pdfPage = page;
  
      // Reset canvases
      const canvas = pdfCanvasRef.current;
      const context = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
  
      annotationCanvasRef.current.width = viewport.width;
      annotationCanvasRef.current.height = viewport.height;
  
      // Render the page with cleanup handler
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
  
      await page.render(renderContext).promise.then(() => {
        console.log('Page rendered successfully');
      }).catch(err => {
        console.log('Rendering cancelled:', err);
      });
  
      // Reinitialize everything
      //CURRENTLY HAVE EDITED UP TO THIS POINT OF THE FILE!!!!!!
      initCanvas();
      await createTextLayer(page, viewport, scale);
      // loadAnnotations();
      fetchComments();
  
      if (fabricCanvas.current) {
        fabricCanvas.current.renderAll();
      }
  
    } catch (error) {
      console.error("Error rendering PDF:", error);
      // Handle specific rendering errors
      if (error.message.includes('multiple render() operations')) {
        console.warn('Rendering conflict detected - retrying...');
        setTimeout(() => renderPDF(pdfUrl), 100);
      }
    }
  };

  const createTextLayer = async (page, viewport, scale) => {
    const textContent = await page.getTextContent();
    let textLayer = document.querySelector(".text-layer");
  
    if (textLayer) textLayer.remove();
  
    textLayer = document.createElement("div");
    textLayer.className = "text-layer";
    textLayer.style.position = "absolute";
    textLayer.style.left = "0";
    textLayer.style.top = "0";
    textLayer.style.width = `${viewport.width}px`;
    textLayer.style.height = `${viewport.height}px`;
    textLayer.style.zIndex = "2"; // Between PDF and annotations
  
    // Always set the background to white
    textLayer.style.backgroundColor = "white";
    textLayer.style.opacity = "0.99";  // Slightly less than 1 to ensure compositing works properly
  
    // Allow text selection when drawing mode is off
    // textLayer.style.pointerEvents = isDrawingMode ? "none" : "auto";  // Allow interaction only when not drawing
    // textLayer.style.userSelect = isDrawingMode ? "none" : "text"; //Just added

    textLayer.style.pointerEvents = "auto";
    textLayer.style.userSelect = "text";
    
    // Font handling
    const fontFamily = selectedFont === 'opendyslexic' 
      ? 'OpenDyslexic, sans-serif'
      : selectedFont === 'lexend'
        ? 'Lexend, sans-serif'
        : 'Times New Roman, serif';
      
  
    textContent.items.forEach((item) => {
      const textDiv = document.createElement("div");
      const [x, y] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
      
      textDiv.textContent = item.str;
      textDiv.style.position = "absolute";
      textDiv.style.left = `${x}px`;
      textDiv.style.top = `${y - item.height * scale}px`;
      textDiv.style.fontSize = `${item.height * scale}px`;
      textDiv.style.fontFamily = fontFamily;
      textDiv.style.color = "black"; // Text color
      textDiv.style.lineHeight = "1"; // Ensure consistent line height
    
      textDiv.style.pointerEvents = "auto"; 
      textLayer.style.userSelect = "text";
  
      textLayer.appendChild(textDiv);
      
    });
  
    // Attach the event listener for text selection
    textLayer.addEventListener("mouseup", handleTextSelection);

    //USED THE REF HERE
    if (annotationContainerRef.current) {
      annotationContainerRef.current.appendChild(textLayer);
    } else {
      console.warn("annotationContainerRef is null");
    }
  };


  useEffect(() => {
    const textLayer = document.querySelector(".text-layer");
  });
  
  useEffect(() => {
    const updateFonts = async () => {
      if (!selectedFile) return;
      
      // Preload font before rendering
      const fontFamily = selectedFont === 'opendyslexic' ? 'OpenDyslexic' :
                        selectedFont === 'lexend' ? 'Lexend' : null;
      
      if (fontFamily) {
        await document.fonts.load(`12px ${fontFamily}`);
      }
      
      renderPDF(selectedFile.url);
    };
    
    updateFonts();
  }, [selectedFont]);
    
  const getXPathForElement = (element) => {
    if (element === document.body) return '/html/body';
  
    const idx = Array.from(element.parentNode.childNodes)
      .filter(node => node.nodeType === Node.ELEMENT_NODE && node.nodeName === element.nodeName)
      .indexOf(element) + 1;
  
    return getXPathForElement(element.parentNode) +
      '/' +
      element.nodeName.toLowerCase() +
      `[${idx}]`;
  };
  
  const getXPathForTextNode = (node) => {
    if (!node || node.nodeType !== Node.TEXT_NODE) return null;
  
    let parent = node.parentNode;
    let index = 0;
    for (let sibling = parent.firstChild; sibling; sibling = sibling.nextSibling) {
      if (sibling === node) break;
      if (sibling.nodeType === Node.TEXT_NODE) index++;
    }
  
    const elementPath = getXPathForElement(parent);
    return `${elementPath}/text()[${index + 1}]`;
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
  
    const range = selection.getRangeAt(0);
    const startNode = range.startContainer;
    const endNode = range.endContainer;
  
    const textLayer = document.querySelector('.text-layer');
    if (!textLayer) {
      console.error('No text-layer found for selection!');
      return;
    }
  
    if (!textLayer.contains(startNode) || !textLayer.contains(endNode)) {
      console.warn('Selection is outside the text-layer.');
      return;
    }
  
    const startPath = getXPathForTextNode(startNode, textLayer);
    const endPath = getXPathForTextNode(endNode, textLayer);
  
    const selection_range = {
      startPath,
      startOffset: range.startOffset,
      endPath,
      endOffset: range.endOffset,
    };
  
    const selectedText = selection.toString();
  
    console.log('Selected text:', selectedText);
    console.log('Selection range:', selection_range);
  
    setSelectedText(selectedText);
    setTempSelectionRange(selection_range); 
  };
  

  const speakSelectedText = () => {
    if (selectedText.trim()) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
    
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
          fabricCanvas.current.renderAll();
        }
      };

      setUtterance(newUtterance);
      window.speechSynthesis.speak(newUtterance);
    } else {
      console.error("No text selected to read aloud.");
    }
  };

  //useEffect to fetch comments when selectedFile changes
  useEffect(() => {
    if (selectedFile) {
      fetchComments();
    } else {
      setComments([]); // Clear comments when no file is selected
    }
  }, [selectedFile?.id]); // Only run when file ID changes

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
  
      // Ensure DOM is ready before applying highlights
      setTimeout(() => {
        (data || []).forEach(comment => {
          try {
            highlightCommentedText(comment);
          } catch (e) {
            console.warn('Highlight failed for comment:', comment, e);
          }
        });
      }, 50); // slight delay to allow DOM to finish rendering
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
  
    const getXPath = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return getXPathForTextNode(node);
      } else {
        return getXPathForElement(node);
      }
    };
  
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
  
      console.log("Saving comment:", commentData);  // Log to check the structure
  
      const { data, error } = await supabase
        .from('comments')
        .insert([commentData])
        .select();
  
      if (error) throw error;
  
      setComments(prev => [data[0], ...prev]);
      
      console.log("Highlighting comment:", data[0]);  // Log data passed to highlight
      highlightCommentedText(data[0]);
  
      setNewComment("");
    } catch (error) {
      console.error('Detailed error:', {
        message: error.message,
        details: error.details,
        code: error.code
      });
  
      if (error.code === 'PGRST204') {
        console.log('Refreshing schema cache...');
        await supabase.rpc('refresh_schema_cache');
        await saveComment();
      } else {
        alert("Failed to save comment. Check console for details.");
      }
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

  const waitForElement = (selector, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const interval = 100;
      let elapsed = 0;
  
      const checkExist = () => {
        const element = document.querySelector(selector);
        if (element) {
          resolve(element);
        } else {
          elapsed += interval;
          if (elapsed >= timeout) {
            reject(new Error(`Element ${selector} not found within ${timeout}ms`));
          } else {
            setTimeout(checkExist, interval);
          }
        }
      };
  
      checkExist();
    });
  };

  const getElementFromXPath = (xpath) => {
    const textLayer = document.querySelector(".text-layer");
    if (!textLayer) return null;
  
    const result = document.evaluate(
      xpath,
      textLayer, // Scoped to the rendered text
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
  
    return result.singleNodeValue;
  };
 
  function highlightCommentedText(comment) {
    if (!comment || !comment.selection_range) {
      console.warn('Invalid comment object:', comment);
      return;
    }
  
    const { startPath, startOffset, endPath, endOffset } = comment.selection_range;
  
    const startNode = getElementFromXPath(startPath);
    const endNode = getElementFromXPath(endPath);
  
    if (!startNode || !endNode) {
      console.warn('Could not resolve nodes for paths:', startPath, endPath);
      return;
    }
  
    if (startNode.nodeType !== Node.TEXT_NODE || endNode.nodeType !== Node.TEXT_NODE) {
      console.warn('Start or end node is not a text node.');
      return;
    }
  
    if (startOffset > startNode.length || endOffset > endNode.length) {
      console.warn('Offset out of bounds:', {
        startOffset,
        startNodeLength: startNode.length,
        endOffset,
        endNodeLength: endNode.length
      });
      return;
    }
  
    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
  
    // Get the PDF canvas and its position
    const pdfCanvas = pdfCanvasRef.current;
    const pdfRect = pdfCanvas.getBoundingClientRect();
    const textLayer = document.querySelector('.text-layer');
  
    // Highlight using absolute positioning relative to the PDF canvas
    const rects = Array.from(range.getClientRects());
    const container = document.querySelector('.annotation-container');
  
    rects.forEach(rect => {
      // Calculate position relative to the PDF canvas
      const highlight = document.createElement('div');
      highlight.className = 'text-highlight-overlay';
      highlight.style.position = 'absolute';
      highlight.style.left = `${rect.left - pdfRect.left}px`;
      highlight.style.top = `${rect.top - pdfRect.top}px`;
      highlight.style.width = `${rect.width}px`;
      highlight.style.height = `${rect.height}px`;
      highlight.style.backgroundColor = 'rgba(255, 255, 0, 0.4)';
      highlight.style.pointerEvents = 'none';
      highlight.style.zIndex = '10';
      highlight.dataset.commentId = comment.id;
  
      container?.appendChild(highlight);
    });
  }
  
  useEffect(() => {
    if (!selectedFile || !pdfCanvasRef.current) return;
  
    const highlightAfterRender = () => {
      // Clear existing highlights first
      document.querySelectorAll('.text-highlight-overlay').forEach(el => el.remove());
  
      if (comments.length > 0) {
        const checkTextLayer = () => {
          const textLayer = document.querySelector('.text-layer');
          if (textLayer) {
            comments.forEach(comment => highlightCommentedText(comment));
          } else {
            setTimeout(checkTextLayer, 100);
          }
        };
        checkTextLayer();
      }
    };
  
    highlightAfterRender();
  }, [selectedFile, comments]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        
        recognitionRef.current.onresult = (event) => {
          let interimTranscript = '';
          let finalTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }
          
          setTranscript(finalTranscript || interimTranscript);
        };
        
        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error', event.error);
          setIsListening(false);
        };
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      
      // When stopping, use the transcript to create a comment
      if (transcript.trim()) {
        setNewComment(transcript);
        setTranscript(""); // Clear transcript for next use
      }
    } else {
      setTranscript(""); // Clear previous transcript
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleSaveAndReset = async () => {
    await saveComment();  // Your existing save function
    setTranscript("");    // This clears the "Voice input" preview
  };

  return (
    <div className="dashboard-container">
      {userId ? (
        <>
          <div className="dashboard-header">
            <div className="header-left">
              <h2>
                <i className="fas fa-file-pdf"></i> {selectedFile?.name || 'PDF Viewer'}
              </h2>
            </div>
            <div className="header-right">
              <button 
                onClick={() => navigate('/FileManager')}
                className="btn btn-outline"
              >
                <i className="fas fa-folder-open"></i> File Manager
              </button>
              <button 
                onClick={signOut}
                className="btn btn-logout"
              >
                <i className="fas fa-sign-out-alt"></i> Logout
              </button>
            </div>
          </div>

          <div className="dashboard-main">
            <div className="pdf-viewer-container">
              {selectedFile && selectedFile.type === "application/pdf" && (
                <div className="pdf-viewer">
                  <div className="annotation-container" ref={annotationContainerRef}>
                    <canvas ref={pdfCanvasRef} className="pdf-canvas"></canvas>
                    <div className="text-layer"></div>
                    <canvas ref={annotationCanvasRef} className="annotation-canvas"></canvas>
                  </div>
                </div>
              )}
            </div>

            <div className="control-panel">
              <div className="panel-section">
                <h3><i className="fas fa-tools"></i> Tools</h3>
                <div className="button-group">
                  <button
                    onClick={() => {
                      const selection = window.getSelection();
                      if (selection && selection.toString().trim()) {
                        setShowCommentInput(true);
                      } else {
                        alert("Please select text to comment on");
                      }
                    }}
                    className="btn btn-primary"
                  >
                    <i className="fas fa-comment"></i> Add Comment
                  </button>
                </div>
              </div>

              <div className="panel-section">
                <h3><i className="fas fa-volume-up"></i> Text-to-Speech</h3>
                <div className="button-group">
                  <button 
                    className="btn btn-primary" 
                    onClick={handleTTS}
                  >
                    <i className="fas fa-play"></i> Read PDF
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    onClick={togglePauseResume} 
                    disabled={!utterance}
                  >
                    <i className={`fas fa-${isPlaying ? 'pause' : 'play'}`}></i> {isPlaying ? "Pause" : "Resume"}
                  </button>
                  <button 
                    className="btn btn-secondary" 
                    onClick={restartTTS} 
                    disabled={!utterance}
                  >
                    <i className="fas fa-redo"></i> Restart
                  </button>
                </div>

                <div className="form-group">
                  <label>
                    <i className="fas fa-user"></i> Voice:
                    <select
                      value={selectedVoice ? selectedVoice.name : ''}
                      onChange={(e) => {
                        const selected = voices.find(voice => voice.name === e.target.value);
                        setSelectedVoice(selected);
                      }}
                      className="form-control"
                    >
                      {voices.map((voice, index) => (
                        <option key={index} value={voice.name}>
                          {voice.name} ({voice.lang})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="panel-section">
                  <h3><i className="fas fa-highlighter"></i> Text Selection</h3>
                  <div className="selected-text-display">
                    {selectedText ? (
                      <div className="selected-text-content">
                        <p>{selectedText}</p>
                        <button 
                          onClick={speakSelectedText} 
                          disabled={!selectedText}
                          className="btn btn-primary"
                        >
                          <i className="fas fa-volume-up"></i> Read Selected Text
                        </button>
                      </div>
                    ) : (
                      <p className="text-muted">Select text from the PDF to read it aloud</p>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>
                    <i className="fas fa-tachometer-alt"></i> Speed:
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={speed}
                      onChange={(e) => updateSpeed(parseFloat(e.target.value))}
                      className="form-range"
                    />
                    <span className="speed-value">{speed}x</span>
                  </label>
                </div>
              </div>

              <div className="panel-section">
                <h3><i className="fas fa-font"></i> Text Appearance</h3>
                <div className="form-group">
                  <label>
                    Font:
                    <select 
                      value={selectedFont}
                      onChange={(e) => setSelectedFont(e.target.value)}
                      className="form-control"
                    >
                      <option value="standard">Standard</option>
                      <option value="opendyslexic">OpenDyslexic</option>
                      <option value="lexend">Lexend</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="panel-section">
                <h3><i className="fas fa-comments"></i> Comments</h3>
                <div className="comments-list">
                  {comments.map(comment => (
                    <div key={comment.id} className="comment-item">
                      <div className="comment-content">
                        <div className="comment-text">{comment.content}</div>
                        <div className="comment-meta">
                          <small>{new Date(comment.created_at).toLocaleString()}</small>
                        </div>
                      </div>
                      <div className="comment-actions">
                        <button 
                          onClick={() => {
                            setSelectedComment(comment);
                            const highlight = document.querySelector(`[data-comment-id="${comment.id}"]`);
                            if (highlight) {
                              highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              const originalBg = highlight.style.backgroundColor;
                              highlight.style.backgroundColor = 'rgba(255, 235, 59, 0.6)';
                              setTimeout(() => {
                                highlight.style.backgroundColor = originalBg || 'rgba(255, 248, 197, 0.7)';
                              }, 1500);
                            }
                          }}
                          className="btn btn-sm btn-view"
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                        <button 
                          onClick={() => deleteComment(comment.id)}
                          className="btn btn-sm btn-danger"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="comment-input">
                  <div className="form-group">
                    <label>New Comment</label>
                    <textarea 
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Type your comment or use voice input..."
                      className="form-control"
                      rows="3"
                    />
                  </div>
                  <div className="button-group">
                    <button 
                      onClick={toggleListening} 
                      className={`btn ${isListening ? 'btn-danger' : 'btn-secondary'}`}
                    >
                      {isListening ? <FaMicrophoneSlash /> : <FaMicrophone />}
                      {isListening ? ' Stop Listening' : ' Voice Input'}
                    </button>
                    <button 
                      onClick={saveComment}
                      disabled={!newComment.trim()}
                      className="btn btn-primary"
                    >
                      <i className="fas fa-save"></i> Save
                    </button>
                  </div>
                  {transcript && (
                    <div className="transcript-preview">
                      <p><strong>Voice input:</strong> {transcript}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="auth-container">
          <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} />
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
  

  