// import { useEffect, useState } from 'react';
// import { v4 as uuidv4 } from 'uuid';
// import supabase from '../src/supabaseClient';
// import { Auth } from '@supabase/auth-ui-react';
// import { ThemeSupa } from '@supabase/auth-ui-shared';
// import './Dashboard.css'; // Assume you have a CSS file for styling

// const DashboardPage = () => {
//   const [userId, setUserId] = useState('');
//   const [media, setMedia] = useState([]);

//   // Function to get the current user
//   const getUser = async () => {
//     try {
//       const { data: { user } } = await supabase.auth.getUser();
//       setUserId(user ? user.id : '');
//     } catch (error) {
//       console.error('Error fetching user:', error);
//     }
//   };

//   // Function to handle image uploads
//   const uploadImage = async (e) => {
//     const file = e.target.files[0];
//     if (!file || !userId) return;

//     const filePath = `${userId}/${uuidv4()}`;
//     const { data, error } = await supabase.storage.from('uploads').upload(filePath, file);

//     if (error) {
//       console.error('Upload error:', error);
//     } else {
//       getMedia();
//     }
//   };

//   // Function to get uploaded media for the current user
//   const getMedia = async () => {
//     if (!userId) return;
//     const { data, error } = await supabase.storage.from('uploads').list(`${userId}/`, {
//       limit: 10,
//       offset: 0,
//       sortBy: { column: 'name', order: 'asc' }
//     });

//     if (error) {
//       console.error('Error fetching media:', error);
//     } else {
//       setMedia(data);
//     }
//   };

//   // Function to handle user sign-out
//   const signOut = async () => {
//     await supabase.auth.signOut();
//     setUserId('');
//   };

//   useEffect(() => {
//     getUser();
//     if (userId) getMedia();
//   }, [userId]);

//   return (
//     <div className="dashboard-page">
//       {userId ? (
//         <>
//           <div className="upload-section">
//             <input type="file" onChange={uploadImage} />
//           </div>
//           <div className="media-section">
//             <h3>My Uploads</h3>
//             <div className="media-gallery">
//               {media.map((item) => (
//                 <div key={item.name} className="media-item">
//                   <img
//                     src={`https://ouhmeezffbzzeurpyidi.supabase.co/storage/v1/object/public/uploads/${userId}/${item.name}`}
//                     alt={item.name}
//                   />
//                 </div>
//               ))}
//             </div>
//           </div>
//           <div className="sign-out">
//             <button onClick={signOut}>Logout</button>
//           </div>
//         </>
//       ) : (
//         <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} />
//       )}
//     </div>
//   );
// };

// export default DashboardPage;

// import { useEffect, useState } from 'react';
// import { v4 as uuidv4 } from 'uuid';
// import supabase from '../src/supabaseClient';
// import { Auth } from '@supabase/auth-ui-react';
// import { ThemeSupa } from '@supabase/auth-ui-shared';
// import './Dashboard.css';

// const DashboardPage = () => {
//   const [userId, setUserId] = useState('');
//   const [media, setMedia] = useState([]);
//   const [previewUrl, setPreviewUrl] = useState(null);

//   const getUser = async () => {
//     try {
//       const { data: { user } } = await supabase.auth.getUser();
//       setUserId(user ? user.id : '');
//     } catch (error) {
//       console.error('Error fetching user:', error);
//     }
//   };

//   const uploadImage = async (file) => {
//     if (!file || !userId) return;
//     setPreviewUrl(URL.createObjectURL(file));

//     const filePath = `${userId}/${uuidv4()}`;
//     const { data, error } = await supabase.storage.from('uploads').upload(filePath, file);

//     if (error) {
//       console.error('Upload error:', error);
//     } else {
//       getMedia();
//     }
//   };

//   const handleFileSelect = (e) => {
//     const file = e.target.files[0];
//     if (file) uploadImage(file);
//   };

//   const handleDrop = (e) => {
//     e.preventDefault();
//     const file = e.dataTransfer.files[0];
//     if (file) uploadImage(file);
//   };

//   const handleDragOver = (e) => {
//     e.preventDefault();
//   };

//   const getMedia = async () => {
//     if (!userId) return;
//     const { data, error } = await supabase.storage.from('uploads').list(`${userId}/`, {
//       limit: 10,
//       offset: 0,
//       sortBy: { column: 'name', order: 'asc' }
//     });

//     if (error) {
//       console.error('Error fetching media:', error);
//     } else {
//       setMedia(data);
//     }
//   };

//   const signOut = async () => {
//     await supabase.auth.signOut();
//     setUserId('');
//   };

//   useEffect(() => {
//     getUser();
//     if (userId) getMedia();
//   }, [userId]);

//   return (
//     <div className="dashboard-page">
//       {userId ? (
//         <>
//           <div className="upload-section" 
//                onDrop={handleDrop} 
//                onDragOver={handleDragOver}>
//             <input type="file" onChange={handleFileSelect} />
//             {previewUrl && <img src={previewUrl} alt="Preview" className="preview" />}
//             <p>Drag & drop a file here or click to upload</p>
//           </div>
//           <div className="media-section">
//             <h3>My Uploads</h3>
//             <div className="media-gallery">
//               {media.map((item) => (
//                 <div key={item.name} className="media-item">
//                   <img
//                     src={`https://ouhmeezffbzzeurpyidi.supabase.co/storage/v1/object/public/uploads/${userId}/${item.name}`}
//                     alt={item.name}
//                   />
//                 </div>
//               ))}
//             </div>
//           </div>
//           <div className="sign-out">
//             <button onClick={signOut}>Logout</button>
//           </div>
//         </>
//       ) : (
//         <Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} />
//       )}
//     </div>
//   );
// };

// export default DashboardPage;

import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import supabase from '../src/supabaseClient';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import './Dashboard.css';

const DashboardPage = () => {
  const [userId, setUserId] = useState('');
  const [media, setMedia] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    getUser();
  }, []);

  useEffect(() => {
    if (userId) getMedia();
  }, [userId]);

  // Fetch current user
  const getUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user ? user.id : '');
    } catch (error) {
      console.error('Error fetching user:', error);
    }
  };

  // Upload PDF or Image
  const uploadFile = async (file) => {
    if (!file || !userId) return;

    setPreviewUrl(URL.createObjectURL(file)); // Local preview before upload

    const filePath = `${userId}/${uuidv4()}_${file.name}`;
    const { error } = await supabase.storage.from('uploads').upload(filePath, file);

    if (error) {
      console.error('Upload error:', error);
    } else {
      getMedia(); // Refresh file list after upload
    }
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) uploadFile(file);
  };

  // Handle drag & drop
  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Fetch uploaded files for the user
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
      // Convert filenames to public URLs
      const mediaWithUrls = data.map(item => ({
        name: item.name,
        url: supabase.storage.from('uploads').getPublicUrl(`${userId}/${item.name}`).data.publicUrl
      }));
      setMedia(mediaWithUrls);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserId('');
  };

  return (
    <div className="dashboard-page">
      {userId ? (
        <>
          <div className="upload-section" 
               onDrop={handleDrop} 
               onDragOver={handleDragOver}>
            <input type="file" onChange={handleFileSelect} accept="image/*,application/pdf"/>
            {previewUrl && <p>Preview:</p>}
            {previewUrl && previewUrl.endsWith(".pdf") ? (
              <iframe src={previewUrl} className="preview-pdf" title="PDF Preview"></iframe>
            ) : (
              <img src={previewUrl} alt="Preview" className="preview-image" />
            )}
            <p>Drag & drop a file here or click to upload (PDFs & Images supported)</p>
          </div>

          <div className="media-section">
            <h3>My Uploads</h3>
            <div className="media-gallery">
              {media.map((item) => (
                <div key={item.name} className="media-item">
                  {item.name.endsWith(".pdf") ? (
                    <iframe src={item.url} className="pdf-frame" title={item.name}></iframe>
                  ) : (
                    <img src={item.url} alt={item.name} className="media-img" />
                  )}
                  <p>{item.name}</p>
                </div>
              ))}
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
