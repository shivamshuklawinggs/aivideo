import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  Grid,
  Chip,
} from '@mui/material';
import {
  CloudUpload,
  ArrowBack,
  ArrowForward,
  Check,
  Close,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';

import { useAppDispatch, useAppSelector } from '../../store';
import { uploadWebtoon } from '../../store/slices/webtoonSlice';

interface FormData {
  title: string;
  description: string;
  author: string;
  genres: string[];
  tags: string[];
}

const UploadComicPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isUploading, uploadProgress } = useAppSelector((state) => state.webtoon);

  const [activeStep, setActiveStep] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    author: '',
    genres: [],
    tags: [],
  });
  const [genreInput, setGenreInput] = useState('');
  const [tagInput, setTagInput] = useState('');

  const steps = ['Select Comic', 'Basic Info', 'Review & Upload'];

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const validFormats = ['.cbz', '.cbr', '.zip'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

      if (!validFormats.includes(fileExtension)) {
        toast.error('Please upload a valid comic file (.cbz, .cbr, or .zip)');
        return;
      }

      if (file.size > 500 * 1024 * 1024) { // 500MB limit
        toast.error('File size must be less than 500MB');
        return;
      }

      setSelectedFile(file);
      setActiveStep(1);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/zip': ['.cbz', '.zip'],
      'application/x-rar-compressed': ['.cbr'],
    },
    multiple: false,
  });

  const handleNext = () => {
    if (activeStep === 0 && !selectedFile) {
      toast.error('Please select a comic file');
      return;
    }
    if (activeStep === 1 && !formData.title) {
      toast.error('Please enter a title');
      return;
    }
    if (activeStep === 1) {
      handleSubmit();
    } else {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    const uploadFormData = new FormData();
    uploadFormData.append('archive', selectedFile);
    uploadFormData.append('title', formData.title);
    uploadFormData.append('description', formData.description);
    uploadFormData.append('author', formData.author);
    uploadFormData.append('genres', JSON.stringify(formData.genres));
    uploadFormData.append('tags', JSON.stringify(formData.tags));

    setActiveStep(2);

    try {
      await dispatch(uploadWebtoon(uploadFormData)).unwrap();
      toast.success('Comic uploaded successfully!');
      navigate('/webtoons');
    } catch (error) {
      toast.error('Upload failed. Please try again.');
    }
  };

  const addGenre = () => {
    if (genreInput.trim() && !formData.genres.includes(genreInput.trim())) {
      setFormData({
        ...formData,
        genres: [...formData.genres, genreInput.trim()],
      });
      setGenreInput('');
    }
  };

  const removeGenre = (genre: string) => {
    setFormData({
      ...formData,
      genres: formData.genres.filter((g) => g !== genre),
    });
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    });
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Select Comic File
            </Typography>
            <Typography variant="body2" sx={{ color: '#a0a0b8', mb: 3 }}>
              Upload your comic archive file (.cbz, .cbr, or .zip)
            </Typography>

            <div
              {...getRootProps()}
              className={`upload-area ${isDragActive ? 'active' : ''}`}
              style={{
                minHeight: '200px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <input {...getInputProps()} />
              <CloudUpload sx={{ fontSize: 48, color: '#4a4a6a', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {isDragActive ? 'Drop the file here' : 'Drag & drop comic file here'}
              </Typography>
              <Typography variant="body2" sx={{ color: '#a0a0b8' }}>
                or click to browse
              </Typography>
              <Typography variant="caption" sx={{ color: '#6a6a8a', mt: 2 }}>
                Supported formats: .cbz, .cbr, .zip (Max 500MB)
              </Typography>
            </div>

            {selectedFile && (
              <Box sx={{ mt: 2, p: 2, bgcolor: '#2a2a3e', borderRadius: 2 }}>
                <Typography variant="body2" sx={{ color: '#10b981' }}>
                  <Check sx={{ verticalAlign: 'middle', mr: 1 }} />
                  {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </Typography>
              </Box>
            )}
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Basic Information
            </Typography>
            <Typography variant="body2" sx={{ color: '#a0a0b8', mb: 3 }}>
              Add details about your comic
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: '#2a2a3e' },
                      '&:hover fieldset': { borderColor: '#4a4a6a' },
                      '&.Mui-focused fieldset': { borderColor: '#8b5cf6' },
                    },
                    '& .MuiInputLabel-root': { color: '#a0a0b8' },
                    '& .MuiInputBase-input': { color: '#ffffff' },
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: '#2a2a3e' },
                      '&:hover fieldset': { borderColor: '#4a4a6a' },
                      '&.Mui-focused fieldset': { borderColor: '#8b5cf6' },
                    },
                    '& .MuiInputLabel-root': { color: '#a0a0b8' },
                    '& .MuiInputBase-input': { color: '#ffffff' },
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Author"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: '#2a2a3e' },
                      '&:hover fieldset': { borderColor: '#4a4a6a' },
                      '&.Mui-focused fieldset': { borderColor: '#8b5cf6' },
                    },
                    '& .MuiInputLabel-root': { color: '#a0a0b8' },
                    '& .MuiInputBase-input': { color: '#ffffff' },
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Genres
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField
                    size="small"
                    placeholder="Add genre"
                    value={genreInput}
                    onChange={(e) => setGenreInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addGenre()}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: '#2a2a3e' },
                        '&:hover fieldset': { borderColor: '#4a4a6a' },
                        '&.Mui-focused fieldset': { borderColor: '#8b5cf6' },
                      },
                      '& .MuiInputBase-input': { color: '#ffffff' },
                    }}
                  />
                  <Button variant="outlined" onClick={addGenre}>
                    Add
                  </Button>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {formData.genres.map((genre) => (
                    <Chip
                      key={genre}
                      label={genre}
                      onDelete={() => removeGenre(genre)}
                      deleteIcon={<Close />}
                      sx={{ bgcolor: '#2a2a3e', color: '#ffffff' }}
                    />
                  ))}
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Tags
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <TextField
                    size="small"
                    placeholder="Add tag"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: '#2a2a3e' },
                        '&:hover fieldset': { borderColor: '#4a4a6a' },
                        '&.Mui-focused fieldset': { borderColor: '#8b5cf6' },
                      },
                      '& .MuiInputBase-input': { color: '#ffffff' },
                    }}
                  />
                  <Button variant="outlined" onClick={addTag}>
                    Add
                  </Button>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {formData.tags.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      onDelete={() => removeTag(tag)}
                      deleteIcon={<Close />}
                      sx={{ bgcolor: '#2a2a3e', color: '#ffffff' }}
                    />
                  ))}
                </Box>
              </Grid>
            </Grid>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review & Upload
            </Typography>
            
            {isUploading && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ color: '#a0a0b8', mb: 1 }}>
                  Uploading comic... {uploadProgress.toFixed(0)}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={uploadProgress}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: '#2a2a3e',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: '#8b5cf6',
                    },
                  }}
                />
              </Box>
            )}

            <Card sx={{ bgcolor: '#2a2a3e', border: '1px solid #3a3a4e' }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  File Information
                </Typography>
                <Typography variant="body2" sx={{ color: '#a0a0b8' }}>
                  <strong>Name:</strong> {selectedFile?.name}
                </Typography>
                <Typography variant="body2" sx={{ color: '#a0a0b8' }}>
                  <strong>Size:</strong> {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : 'N/A'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#a0a0b8', mt: 2 }}>
                  <strong>Title:</strong> {formData.title || 'Not specified'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#a0a0b8' }}>
                  <strong>Author:</strong> {formData.author || 'Not specified'}
                </Typography>
                {formData.genres.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" sx={{ color: '#a0a0b8' }}>
                      <strong>Genres:</strong>
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                      {formData.genres.map((genre) => (
                        <Chip
                          key={genre}
                          label={genre}
                          size="small"
                          sx={{ bgcolor: '#3a3a4e', color: '#ffffff' }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/webtoons')}
          sx={{ mr: 2 }}
        >
          Back to Library
        </Button>
        <Typography variant="h4">Upload Comic</Typography>
      </Box>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Card className="feature-card">
        <CardContent sx={{ p: 4 }}>
          {renderStepContent(activeStep)}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              startIcon={<ArrowBack />}
            >
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleNext}
              endIcon={activeStep === 1 ? <Check /> : <ArrowForward />}
              disabled={isUploading}
              sx={{
                background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #7c3aed, #db2777)',
                },
              }}
            >
              {activeStep === 1 ? 'Upload' : 'Next'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default UploadComicPage;
