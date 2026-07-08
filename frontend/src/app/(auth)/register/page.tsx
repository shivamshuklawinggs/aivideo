'use client';
import React from 'react';
import Link from 'next/link';
import {
  Box, Card, CardContent, TextField, Button,
  Typography, CircularProgress, Container,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store';
import { register as registerUser, clearError } from '@/store/slices/authSlice';

interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { isLoading, error } = useAppSelector((state) => state.auth);

  const { register, handleSubmit, formState: { errors }, watch } = useForm<RegisterFormData>();

  React.useEffect(() => {
    if (error) { toast.error(error); dispatch(clearError()); }
  }, [error, dispatch]);

  const onSubmit = async (data: RegisterFormData) => {
    if (data.password !== data.confirmPassword) { toast.error('Passwords do not match'); return; }
    try {
      await dispatch(registerUser({ name: data.name, email: data.email, password: data.password })).unwrap();
      toast.success('Registration successful!');
      router.push('/dashboard');
    } catch (_) {}
  };

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      '& fieldset': { borderColor: '#2a2a3e' },
      '&:hover fieldset': { borderColor: '#4a4a6a' },
      '&.Mui-focused fieldset': { borderColor: '#8b5cf6' },
    },
    '& .MuiInputLabel-root': { color: '#a0a0b8' },
    '& .MuiInputBase-input': { color: '#ffffff' },
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%)', py: 4 }}>
      <Container maxWidth="sm">
        <Card sx={{ background: '#1a1a2e', border: '1px solid #2a2a3e', borderRadius: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography variant="h4" gutterBottom sx={{ background: 'linear-gradient(135deg,#8b5cf6,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Create Account
              </Typography>
              <Typography variant="body2" sx={{ color: '#a0a0b8' }}>Join the AI Webtoon Platform</Typography>
            </Box>
            <form onSubmit={handleSubmit(onSubmit)}>
              <TextField fullWidth label="Full Name" margin="normal" sx={inputSx}
                {...register('name', { required: 'Name is required' })}
                error={!!errors.name} helperText={errors.name?.message} />
              <TextField fullWidth label="Email" type="email" margin="normal" sx={inputSx}
                {...register('email', { required: 'Email is required', pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Invalid email' } })}
                error={!!errors.email} helperText={errors.email?.message} />
              <TextField fullWidth label="Password" type="password" margin="normal" sx={inputSx}
                {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Min 6 characters' } })}
                error={!!errors.password} helperText={errors.password?.message} />
              <TextField fullWidth label="Confirm Password" type="password" margin="normal" sx={inputSx}
                {...register('confirmPassword', { required: 'Please confirm password', validate: (v) => v === watch('password') || 'Passwords do not match' })}
                error={!!errors.confirmPassword} helperText={errors.confirmPassword?.message} />
              <Button type="submit" fullWidth variant="contained" disabled={isLoading}
                sx={{ mt: 3, mb: 2, py: 1.5, background: 'linear-gradient(135deg,#8b5cf6,#ec4899)', '&:hover': { background: 'linear-gradient(135deg,#7c3aed,#db2777)' }, '&.Mui-disabled': { background: '#2a2a3e' } }}>
                {isLoading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Create Account'}
              </Button>
            </form>
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2" sx={{ color: '#a0a0b8' }}>
                Already have an account?{' '}
                <Link href="/login" style={{ color: '#8b5cf6' }}>Sign in</Link>
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
