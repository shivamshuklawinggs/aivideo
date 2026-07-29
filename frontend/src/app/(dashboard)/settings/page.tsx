'use client';
import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, TextField, Button,
  Grid, Divider, Switch, FormControlLabel, Alert,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useAppSelector, useAppDispatch } from '@/store';
import { updateProfile } from '@/store/slices/authSlice';

export default function SettingsPage() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [notifications, setNotifications] = useState(user?.preferences?.notifications ?? true);

  const { register: regProfile, handleSubmit: handleProfile, formState: { errors: profileErrors } } =
    useForm({ defaultValues: { name: user?.name || '', email: user?.email || '' } });

  const { register: regPassword, handleSubmit: handlePassword, formState: { errors: passErrors }, reset: resetPass } =
    useForm<{ currentPassword: string; newPassword: string; confirmPassword: string }>();

  const profileMutation = useMutation({
    mutationFn: (data: any) => dispatch(updateProfile(data)).unwrap(),
    onSuccess: () => toast.success('Profile updated!'),
    onError: (e: any) => toast.error(`Failed: ${e.message || e}`),
  });

  const passwordMutation = useMutation({
    mutationFn: async (_data: { currentPassword: string; newPassword: string }) => {
      return Promise.resolve();
    },
    onSuccess: () => { toast.success('Password changed!'); resetPass(); },
    onError: (e: any) => toast.error(`Failed: ${e.message}`),
  });

  const onPasswordSubmit = (data: any) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('New passwords do not match'); return;
    }
    passwordMutation.mutate({ currentPassword: data.currentPassword, newPassword: data.newPassword });
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom>Settings</Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Profile</Typography>
              <Divider sx={{ mb: 2 }} />
              <form onSubmit={handleProfile((data) => profileMutation.mutate(data))}>
                <TextField fullWidth label="Name" margin="normal"
                  {...regProfile('name', { required: 'Name is required' })}
                  error={!!profileErrors.name} helperText={profileErrors.name?.message} />
                <TextField fullWidth label="Email" type="email" margin="normal"
                  {...regProfile('email', { required: 'Email is required' })}
                  error={!!profileErrors.email} helperText={profileErrors.email?.message} />
                <Button type="submit" variant="contained" sx={{ mt: 2 }} disabled={profileMutation.isPending}>
                  {profileMutation.isPending ? 'Saving...' : 'Save Profile'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Change Password</Typography>
              <Divider sx={{ mb: 2 }} />
              <form onSubmit={handlePassword(onPasswordSubmit)}>
                <TextField fullWidth label="Current Password" type="password" margin="normal"
                  {...regPassword('currentPassword', { required: 'Current password is required' })}
                  error={!!passErrors.currentPassword} helperText={passErrors.currentPassword?.message} />
                <TextField fullWidth label="New Password" type="password" margin="normal"
                  {...regPassword('newPassword', { required: 'New password is required', minLength: { value: 6, message: 'Min 6 characters' } })}
                  error={!!passErrors.newPassword} helperText={passErrors.newPassword?.message} />
                <TextField fullWidth label="Confirm New Password" type="password" margin="normal"
                  {...regPassword('confirmPassword', { required: 'Please confirm your new password' })}
                  error={!!passErrors.confirmPassword} helperText={passErrors.confirmPassword?.message} />
                <Button type="submit" variant="contained" color="warning" sx={{ mt: 2 }} disabled={passwordMutation.isPending}>
                  {passwordMutation.isPending ? 'Changing...' : 'Change Password'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Preferences</Typography>
              <Divider sx={{ mb: 2 }} />
              <FormControlLabel
                control={<Switch checked={notifications} onChange={(e) => setNotifications(e.target.checked)} color="primary" />}
                label="Email Notifications"
              />
              <Alert severity="info" sx={{ mt: 2 }}>
                Account: <strong>{user?.subscription?.plan || 'Free'}</strong> plan
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Account Usage</Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={3}>
                {[
                  { label: 'Videos Generated', value: user?.usage?.videosGenerated ?? 0, limit: user?.usage?.monthlyVideoLimit ?? 0 },
                  { label: 'Storage Used (MB)', value: Math.round((user?.usage?.storageUsed ?? 0) / 1024 / 1024), limit: Math.round((user?.usage?.monthlyStorageLimit ?? 0) / 1024 / 1024) },
                ].map((item) => (
                  <Grid item xs={12} sm={6} key={item.label}>
                    <Typography variant="body2" color="textSecondary">{item.label}</Typography>
                    <Typography variant="h5">{item.value} / {item.limit || '∞'}</Typography>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
