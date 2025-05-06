
// beforeAll(() => {
//     global.pdfjsLib = {
//       GlobalWorkerOptions: { workerSrc: 'mock-worker-src' },
//       AbortException: jest.fn(),
//     };
//   });
  
//   // Mock pdfjsLib and related dependencies
//   jest.mock('pdfjs-dist/web/pdf_viewer', () => ({
//     pdfjsLib: {
//       GlobalWorkerOptions: {
//         workerSrc: 'mock-worker-src',
//       },
//       AbortException: jest.fn(),
//     },
//     TextLayerBuilder: jest.fn(),
//   }));
  
//   jest.mock('pdfjs-dist/build/pdf', () => ({
//     getDocument: jest.fn(() => ({
//       promise: Promise.resolve({
//         numPages: 1,
//         metadata: {},
//       }),
//     })),
//   }));

// jest.mock('../supabaseClient', () => ({
//   supabase: {
//     auth: {
//       getUser: jest.fn(),
//       signOut: jest.fn(),
//     },
//     storage: {
//       from: jest.fn().mockReturnThis(),
//       upload: jest.fn(),
//       list: jest.fn(),
//       getPublicUrl: jest.fn(),
//     },
//     from: jest.fn().mockReturnThis(),
//     select: jest.fn().mockReturnThis(),
//     eq: jest.fn().mockReturnThis(),
//     order: jest.fn().mockReturnThis(),
//     insert: jest.fn().mockReturnThis(),
//     delete: jest.fn().mockReturnThis(),
//   },
// }));

// import { uploadFile, getMedia, fetchComments, saveComment, deleteComment } from '../NewDashBoard';
// import { supabase } from '../supabaseClient';

// describe('API Functions', () => {
//   const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
//   const mockUserId = 'user123';
//   const mockFileId = 'file123';

//   beforeEach(() => {
//     jest.clearAllMocks();
//   });

//   test('uploadFile success', async () => {
//     supabase.storage.from().upload.mockResolvedValue({ error: null });
//     supabase.storage.from().getPublicUrl.mockReturnValue({ data: { publicUrl: 'http://test.url' } });

//     await uploadFile(mockFile, mockUserId);

//     expect(supabase.storage.from().upload).toHaveBeenCalled();
//     expect(supabase.storage.from().getPublicUrl).toHaveBeenCalled();
//   });

//   test('getMedia success', async () => {
//     const mockData = [{ name: 'user123/file123_test.pdf' }];
//     supabase.storage.from().list.mockResolvedValue({ data: mockData, error: null });
//     supabase.storage.from().getPublicUrl.mockReturnValue({ data: { publicUrl: 'http://test.url' } });

//     const result = await getMedia(mockUserId);
    
//     expect(result).toBeUndefined(); // Since it sets state internally
//     expect(supabase.storage.from().list).toHaveBeenCalledWith(`${mockUserId}/`);
//   });

//   test('fetchComments success', async () => {
//     const mockComments = [{ id: '1', content: 'Test comment' }];
//     supabase.from().select().eq().order.mockResolvedValue({ data: mockComments, error: null });

//     await fetchComments(mockFileId, mockUserId);
    
//     expect(supabase.from().select).toHaveBeenCalledWith('*');
//     expect(supabase.from().eq).toHaveBeenCalledWith('file_id', mockFileId);
//   });

//   test('saveComment success', async () => {
//     const mockComment = { content: 'Test', selection_range: {} };
//     supabase.from().insert.mockResolvedValue({ data: [mockComment], error: null });

//     await saveComment(mockComment, mockFileId, mockUserId);
    
//     expect(supabase.from().insert).toHaveBeenCalledWith([{
//       ...mockComment,
//       user_id: mockUserId,
//       file_id: mockFileId
//     }]);
//   });

//   test('deleteComment success', async () => {
//     const commentId = 'comment123';
//     supabase.from().delete.mockResolvedValue({ error: null });

//     await deleteComment(commentId);
    
//     expect(supabase.from().delete).toHaveBeenCalled();
//     expect(supabase.from().eq).toHaveBeenCalledWith('id', commentId);
//   });
// });

