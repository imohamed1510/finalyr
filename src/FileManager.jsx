//MAKE SURE IT AUTOMATICALLY REDIRECTS WHEN YOU SELECT A NEW FILE, GET DROPPING FILE TO WORK ASWELL, MAYBE MAKE IT SO IT IS DISPLAYED IN A GRID FORMAT,
//ALLOW USERS TO MAKE FOLDERS

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';
import supabase from '../src/supabaseClient';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';

const FileManager = () => {
    const [userId, setUserId] = useState('');
    const [media, setMedia] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const navigate = useNavigate();


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

  const handleFileClick = (file) => {
    navigate('/NewDashBoard', { 
        state: { 
            file: {
              id: file.id,
              url: file.url,
              type: file.type,
              name: file.name
            } 
          } 
        });
  };

  return (
    <div className="file-manager">
      <div className="upload-section" onDrop={handleDrop} onDragOver={handleDragOver}>
        <input 
          type="file" 
          onChange={handleFileSelect} 
          accept="application/pdf" 
          disabled={isLoading}
        />
        <p>{isLoading ? 'Processing...' : 'Drag & drop a PDF file here or click to upload'}</p>
      </div>

      <div className="file-list">
        <h3>Your Uploaded Files</h3>
        {isLoading ? (
          <p>Loading files...</p>
        ) : (
          <ul>
            {media.map((file, index) => (
              <li key={index} onClick={() => handleFileClick(file)}>
                {file.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default FileManager;