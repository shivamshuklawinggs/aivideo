import React from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Container,
  Paper,
} from '@mui/material';
import {
  Home,
  ArrowBack,
  Search,
} from '@mui/icons-material';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%)',
        py: 4,
      }}
    >
      <Container maxWidth="md">
        <Paper
          sx={{
            p: 6,
            textAlign: 'center',
            background: '#1a1a2e',
            border: '1px solid #2a2a3e',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          }}
        >
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: '4rem', md: '6rem' },
              fontWeight: 700,
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 2,
            }}
          >
            404
          </Typography>

          <Typography variant="h4" gutterBottom>
            Page Not Found
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: '#a0a0b8',
              mb: 4,
              maxWidth: 500,
              mx: 'auto',
            }}
          >
            Oops! The page you're looking for doesn't exist or has been moved.
            Let's get you back on track.
          </Typography>

          <Box
            sx={{
              display: 'flex',
              gap: 2,
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Button
              variant="contained"
              startIcon={<Home />}
              component={RouterLink}
              to="/dashboard"
              sx={{
                background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #7c3aed, #db2777)',
                },
              }}
            >
              Go to Dashboard
            </Button>

            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={() => navigate(-1)}
              sx={{
                borderColor: '#2a2a3e',
                color: '#ffffff',
                '&:hover': {
                  borderColor: '#4a4a6a',
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                },
              }}
            >
              Go Back
            </Button>

            <Button
              variant="text"
              startIcon={<Search />}
              component={RouterLink}
              to="/webtoons"
              sx={{
                color: '#8b5cf6',
                '&:hover': {
                  bgcolor: 'rgba(139, 92, 246, 0.1)',
                },
              }}
            >
              Browse Webtoons
            </Button>
          </Box>

          <Box sx={{ mt: 6 }}>
            <Typography variant="caption" sx={{ color: '#6a6a8a' }}>
              Error Code: 404 | Page not found
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default NotFoundPage;
