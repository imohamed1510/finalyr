import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';
import supabase from '../src/supabaseClient';
import './FileManager.css';

const FileManager = () => {
    const [userId, setUserId] = useState('');
    const [fileSystem, setFileSystem] = useState({
        folders: [],
        files: []
    });
    const [currentFolder, setCurrentFolder] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [newFolderName, setNewFolderName] = useState('');
    const [showFolderInput, setShowFolderInput] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [draggedFile, setDraggedFile] = useState(null);
    const [folderDragOver, setFolderDragOver] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState({
        show: false,
        type: null,
        item: null,
        name: ''
    });
    const navigate = useNavigate();

    useEffect(() => {
        getUser();
    }, []);

    useEffect(() => {
        if (userId) getFileSystem();
    }, [userId, currentFolder]);

    const getUser = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            setUserId(user ? user.id : '');
        } catch (error) {
            console.error('Error fetching user:', error);
        }
    };

    // Drag and drop handlers
    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        
        const files = e.dataTransfer.files;
        if (files.length > 0) handleFiles(files);
    };

    const handleFiles = (files) => {
        const validFiles = Array.from(files).filter(file => 
            file.type === 'application/pdf'
        );
        
        if (validFiles.length === 0) {
            alert('Please upload only PDF files');
            return;
        }
        validFiles.forEach(file => uploadFile(file));
    };

    const uploadFile = async (file) => {
        if (!file || !userId) return;

        const fileId = uuidv4();
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = currentFolder 
            ? `${userId}/${currentFolder}/${fileId}_${sanitizedName}`
            : `${userId}/${fileId}_${sanitizedName}`;

        try {
            setIsLoading(true);
            const { error: uploadError } = await supabase.storage
                .from('uploads')
                .upload(filePath, file);

            if (uploadError) throw uploadError;
            await getFileSystem();
        } catch (error) {
            console.error('Upload error:', error);
            alert(`File upload failed: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // File movement and deletion
    const moveFileToFolder = async (file, targetFolder) => {
        if (!file || !targetFolder || !userId) return;

        try {
            setIsLoading(true);
            const oldPath = file.path;
            const newFolderPath = currentFolder 
                ? `${userId}/${currentFolder}/${targetFolder.name}/`
                : `${userId}/${targetFolder.name}/`;
            const newPath = `${newFolderPath}${file.id}_${file.name}`;

            const { data: copyData, error: copyError } = await supabase.storage
                .from('uploads')
                .copy(oldPath, newPath);

            if (copyError) throw copyError;

            const { error: removeError } = await supabase.storage
                .from('uploads')
                .remove([oldPath]);

            if (removeError) throw removeError;

            await getFileSystem();
        } catch (error) {
            console.error('Error moving file:', error);
            alert('Failed to move file. Please try again.');
        } finally {
            setIsLoading(false);
            setDraggedFile(null);
            setFolderDragOver(null);
        }
    };

    const requestDelete = (type, item) => {
        setConfirmDelete({
            show: true,
            type,
            item,
            name: type === 'file' ? item.name : item.name
        });
    };

    const cancelDelete = () => {
        setConfirmDelete({ show: false, type: null, item: null, name: '' });
    };

    const confirmDeleteAction = async () => {
        if (!confirmDelete.item || !userId) return;

        try {
            setIsLoading(true);
            
            if (confirmDelete.type === 'file') {
                const { error } = await supabase.storage
                    .from('uploads')
                    .remove([confirmDelete.item.path]);
                if (error) throw error;
            } else if (confirmDelete.type === 'folder') {
                const { data: folderContents, error: listError } = await supabase.storage
                    .from('uploads')
                    .list(`${userId}/${currentFolder ? currentFolder + '/' : ''}${confirmDelete.name}/`);
                
                if (listError) throw listError;
                
                const filesToDelete = folderContents.map(item => 
                    `${userId}/${currentFolder ? currentFolder + '/' : ''}${confirmDelete.name}/${item.name}`
                );
                
                if (filesToDelete.length > 0) {
                    const { error: deleteError } = await supabase.storage
                        .from('uploads')
                        .remove(filesToDelete);
                    if (deleteError) throw deleteError;
                }
                
                const { error: folderError } = await supabase.storage
                    .from('uploads')
                    .remove([`${userId}/${currentFolder ? currentFolder + '/' : ''}${confirmDelete.name}/.keep`]);
                if (folderError) throw folderError;
            }

            await getFileSystem();
        } catch (error) {
            console.error('Delete error:', error);
            alert(`Failed to delete ${confirmDelete.type}: ${error.message}`);
        } finally {
            setIsLoading(false);
            cancelDelete();
        }
    };

    const getFileSystem = async () => {
        if (!userId) return;

        try {
            setIsLoading(true);
            const path = currentFolder ? `${userId}/${currentFolder}/` : `${userId}/`;
            const { data, error } = await supabase.storage
                .from('uploads')
                .list(path);

            if (error) throw error;

            const folders = data.filter(item => item.metadata === null);
            const files = data.filter(item => item.metadata !== null);

            const filesWithUrls = await Promise.all(
                files.map(async (file) => {
                    const filePath = currentFolder 
                        ? `${userId}/${currentFolder}/${file.name}`
                        : `${userId}/${file.name}`;

                    const { data: { publicUrl } } = supabase.storage
                        .from('uploads')
                        .getPublicUrl(filePath);

                    return {
                        id: file.name.split('_')[0],
                        name: file.name.split('_').slice(1).join('_'),
                        path: filePath,
                        url: publicUrl,
                        type: file.name.endsWith('.pdf') ? 'application/pdf' : 'unknown'
                    };
                })
            );

            setFileSystem({
                folders: folders.map(folder => ({
                    id: folder.id,
                    name: folder.name
                })),
                files: filesWithUrls
            });
        } catch (error) {
            console.error('Error fetching file system:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const createFolder = async () => {
        if (!newFolderName.trim() || !userId) return;

        try {
            setIsLoading(true);
            const folderPath = currentFolder 
                ? `${userId}/${currentFolder}/${newFolderName}/.keep`
                : `${userId}/${newFolderName}/.keep`;

            const { error } = await supabase.storage
                .from('uploads')
                .upload(folderPath, new Blob());

            if (error) throw error;

            setNewFolderName('');
            setShowFolderInput(false);
            await getFileSystem();
        } catch (error) {
            console.error('Error creating folder:', error);
            alert('Failed to create folder. It may already exist.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileSelect = (e) => {
        const files = e.target.files;
        if (files.length > 0) handleFiles(files);
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

    const navigateToFolder = (folderName) => {
        setCurrentFolder(prev => 
            prev ? `${prev}/${folderName}` : folderName
        );
    };

    const navigateUp = () => {
        if (!currentFolder) return;
        const pathParts = currentFolder.split('/');
        pathParts.pop();
        setCurrentFolder(pathParts.join('/'));
    };

    const signOut = async () => {
        try {
            await supabase.auth.signOut();
            navigate('/SignIn'); 
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    return (
        <div className="file-manager-container">
            <div className="file-manager-header">
                <div className="breadcrumbs">
                    <button className="breadcrumb-root" onClick={() => setCurrentFolder('')}>
                        <i className="fas fa-home"></i> Root
                    </button>
                    {currentFolder && currentFolder.split('/').map((folder, index, arr) => (
                        <span key={index} className="breadcrumb-separator">
                            <i className="fas fa-chevron-right"></i>
                            <button 
                                className="breadcrumb-item"
                                onClick={() => setCurrentFolder(arr.slice(0, index + 1).join('/'))}
                            >
                                {folder}
                            </button>
                        </span>
                    ))}
                </div>
                <div className="header-actions">
                    <button 
                        className="btn btn-primary"
                        onClick={() => setShowFolderInput(true)}
                        disabled={isLoading}
                    >
                        <i className="fas fa-folder-plus"></i> New Folder
                    </button>
                    <button 
                        onClick={signOut}
                        className="btn btn-logout"
                    >
                        <i className="fas fa-sign-out-alt"></i> Logout
                    </button>
                </div>
            </div>

            <div 
                className={`upload-area ${isDragging ? 'drag-active' : ''}`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                <input 
                    type="file" 
                    id="file-upload"
                    onChange={handleFileSelect} 
                    accept="application/pdf" 
                    disabled={isLoading}
                    multiple
                />
                <label htmlFor="file-upload" className="upload-label">
                    <div className="upload-content">
                        <i className="fas fa-cloud-upload-alt"></i>
                        <h3>Drag & Drop Files Here</h3>
                        <p>or click to browse files</p>
                        <button className="btn btn-outline">
                            <i className="fas fa-file-upload"></i> Select Files
                        </button>
                    </div>
                </label>
                
                {showFolderInput && (
                    <div className="folder-creator">
                        <input
                            type="text"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            placeholder="Enter folder name"
                            disabled={isLoading}
                            autoFocus
                        />
                        <div className="folder-creator-buttons">
                            <button className="btn btn-success" onClick={createFolder} disabled={isLoading || !newFolderName.trim()}>
                                Create
                            </button>
                            <button className="btn btn-cancel" onClick={() => setShowFolderInput(false)} disabled={isLoading}>
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="file-explorer">
                <div className="file-system-grid">
                    <div className="folders-panel">
                        <div className="panel-header">
                            <h3><i className="fas fa-folder"></i> Folders</h3>
                        </div>
                        <div className="folders-list">
                            {fileSystem.folders.length === 0 ? (
                                <div className="empty-state">
                                    <i className="fas fa-folder-open"></i>
                                    <p>No folders</p>
                                </div>
                            ) : (
                                fileSystem.folders.map((folder, index) => (
                                    <div 
                                        key={index}
                                        className={`folder-item ${folderDragOver?.id === folder.id ? 'drag-over' : ''}`}
                                    >
                                        <div className="folder-content" onClick={() => navigateToFolder(folder.name)}>
                                            <i className="fas fa-folder"></i>
                                            <span className="folder-name">{folder.name}</span>
                                        </div>
                                        <button 
                                            className="btn-delete"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                requestDelete('folder', folder);
                                            }}
                                            title="Delete folder"
                                        >
                                            <i className="fas fa-trash-alt"></i>
                                        </button>
                                        {folderDragOver?.id === folder.id && (
                                            <div className="drop-hint">
                                                <i className="fas fa-arrow-down"></i> Drop to move here
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="files-panel">
                        <div className="panel-header">
                            <h3><i className="fas fa-file"></i> Files</h3>
                            <div className="file-count">{fileSystem.files.length} items</div>
                        </div>
                        <div className="files-grid">
                            {fileSystem.files.length === 0 ? (
                                <div className="empty-state">
                                    <i className="fas fa-file-alt"></i>
                                    <p>No files in this folder</p>
                                </div>
                            ) : (
                                fileSystem.files.map((file, index) => (
                                    <div 
                                        key={index}
                                        className="file-item"
                                        draggable
                                        onDragStart={() => handleFileDragStart(file)}
                                    >
                                        <div className="file-content" onClick={() => handleFileClick(file)}>
                                            <div className="file-icon">
                                                <i className="fas fa-file-pdf"></i>
                                            </div>
                                            <div className="file-details">
                                                <div className="file-name">{file.name}</div>
                                                <div className="file-meta">PDF • {new Date().toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                        <button 
                                            className="btn-delete"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                requestDelete('file', file);
                                            }}
                                            title="Delete file"
                                        >
                                            <i className="fas fa-trash-alt"></i>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {confirmDelete.show && (
                <div className="delete-confirmation-modal">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Confirm Deletion</h3>
                            <button className="modal-close" onClick={cancelDelete}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>Are you sure you want to delete this {confirmDelete.type}?</p>
                            <div className="item-to-delete">
                                {confirmDelete.type === 'folder' ? (
                                    <i className="fas fa-folder"></i>
                                ) : (
                                    <i className="fas fa-file-pdf"></i>
                                )}
                                <span>{confirmDelete.name}</span>
                            </div>
                            <p className="warning-text">
                                <i className="fas fa-exclamation-triangle"></i> This action cannot be undone
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-cancel" onClick={cancelDelete}>
                                Cancel
                            </button>
                            <button 
                                className="btn btn-danger" 
                                onClick={confirmDeleteAction}
                                disabled={isLoading}
                            >
                                {isLoading ? 'Deleting...' : 'Delete Permanently'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FileManager;

    

