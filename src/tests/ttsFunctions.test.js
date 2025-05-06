// import { speakText, updateSpeed, restartTTS } from './DashboardPage';

// describe('Text-to-Speech Functions', () => {
//   let mockSynth, mockUtterance;

//   beforeEach(() => {
//     mockUtterance = {
//       onstart: null,
//       onend: null,
//       onerror: null,
//       onboundary: null,
//       voice: null,
//       rate: 1
//     };
    
//     mockSynth = {
//       speak: jest.fn(),
//       cancel: jest.fn(),
//       pause: jest.fn(),
//       resume: jest.fn(),
//       getVoices: jest.fn().mockReturnValue([])
//     };
    
//     window.speechSynthesis = mockSynth;
//     window.SpeechSynthesisUtterance = jest.fn().mockImplementation(() => mockUtterance);
//   });

//   test('speakText creates and speaks utterance', () => {
//     const text = 'Test text';
//     const voice = { name: 'Test Voice' };
//     const speed = 1.2;
    
//     speakText(text, voice, speed);
    
//     expect(window.SpeechSynthesisUtterance).toHaveBeenCalledWith(text);
//     expect(mockUtterance.voice).toBe(voice);
//     expect(mockUtterance.rate).toBe(speed);
//     expect(mockSynth.speak).toHaveBeenCalledWith(mockUtterance);
//   });

//   test('updateSpeed adjusts speed and restarts speech', () => {
//     const newSpeed = 1.5;
//     const isPlaying = true;
//     const extractedText = 'Test text';
//     const lastSpokenWordIndex = 5;
    
//     updateSpeed(newSpeed, isPlaying, extractedText, lastSpokenWordIndex);
    
//     expect(mockSynth.cancel).toHaveBeenCalled();
//     expect(window.SpeechSynthesisUtterance).toHaveBeenCalledWith(extractedText.slice(lastSpokenWordIndex));
//   });

//   test('restartTTS resets and starts from beginning', () => {
//     const extractedText = 'Test text';
    
//     restartTTS(extractedText);
    
//     expect(mockSynth.cancel).toHaveBeenCalled();
//     expect(window.SpeechSynthesisUtterance).toHaveBeenCalledWith(extractedText);
//   });
// });