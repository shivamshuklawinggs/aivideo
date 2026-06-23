import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Switch,
  FormControlLabel,
  Avatar,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Person,
  Security,
  Notifications,
  Palette,
  Storage,
  Save,
} from '@mui/icons-material';

import { useAppSelector, useAppDispatch } from '../../store';
import { updateProfile } from '../../store/slices/authSlice';
import { toast } from 'react-toastify';

const SettingsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'preferences'>('profile');
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [preferences, setPreferences] = useState({
    theme: user?.preferences?.theme || 'dark',
    language: user?.preferences?.language || 'en',
    notifications: user?.preferences?.notifications ?? true,
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleProfileUpdate = async () => {
    setIsSaving(true);
    try {
      await dispatch(updateProfile({
        name: formData.name,
        preferences,
      })).unwrap();
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    }
    setIsSaving(false);
  };

  const handlePasswordChange = async () => {
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsSaving(true);
    try {
      // Password change logic would go here
      toast.success('Password changed successfully');
      setFormData({
        ...formData,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      toast.error('Failed to change password');
    }
    setIsSaving(false);
  };

  const handlePreferencesUpdate = async () => {
    setIsSaving(true);
    try {
      await dispatch(updateProfile({ preferences })).unwrap();
      toast.success('Preferences updated successfully');
    } catch (error) {
      toast.error('Failed to update preferences');
    }
    setIsSaving(false);
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <Person /> },
    { id: 'security', label: 'Security', icon: <Security /> },
    { id: 'notifications', label: 'Notifications', icon: <Notifications /> },
    { id: 'preferences', label: 'Preferences', icon: <Palette /> },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>

      <Grid container spacing={3}>
        {/* Sidebar */}
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: '#1a1a2e', border: '1px solid #2a2a3e' }}>
            <CardContent sx={{ p: 2 }}>
              {tabs.map((tab) => (
                <Button
                  key={tab.id}
                  fullWidth
                  startIcon={tab.icon}
                  onClick={() => setActiveTab(tab.id as any)}
                  sx={{
                    justifyContent: 'flex-start',
                    mb: 1,
                    color: activeTab === tab.id ? '#8b5cf6' : '#a0a0b8',
                    bgcolor: activeTab === tab.id ? 'rgba(139, 92, 246, 0.1)' : 'transparent',
                    '&:hover': {
                      bgcolor: activeTab === tab.id ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    },
                  }}
                >
                  {tab.label}
                </Button>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Content */}
        <Grid item xs={12} md={9}>
          <Card className="feature-card">
            <CardContent sx={{ p: 3 }}>
              {activeTab === 'profile' && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Profile Information
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Avatar
                      sx={{
                        width: 80,
                        height: 80,
                        bgcolor: '#8b5cf6',
                        mr: 3,
                        fontSize: 32,
                      }}
                    >
                      {user?.name?.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="h6">{user?.name}</Typography>
                      <Typography variant="body2" sx={{ color: '#a0a0b8' }}>
                        {user?.email}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#6a6a8a' }}>
                        {user?.role?.toUpperCase()} • {user?.subscription?.plan?.toUpperCase()}
                      </Typography>
                    </Box>
                  </Box>

                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Full Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Email"
                        value={formData.email}
                        disabled
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
                  </Grid>

                  <Box sx={{ mt: 3 }}>
                    <Button
                      variant="contained"
                      startIcon={isSaving ? <CircularProgress size={20} /> : <Save />}
                      onClick={handleProfileUpdate}
                      disabled={isSaving}
                      sx={{
                        background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #7c3aed, #db2777)',
                        },
                      }}
                    >
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </Box>
                </Box>
              )}

              {activeTab === 'security' && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Security Settings
                  </Typography>

                  <Alert severity="info" sx={{ mb: 3 }}>
                    Use a strong password with at least 8 characters, including uppercase, lowercase, numbers, and symbols.
                  </Alert>

                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        type="password"
                        label="Current Password"
                        value={formData.currentPassword}
                        onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
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
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        type="password"
                        label="New Password"
                        value={formData.newPassword}
                        onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
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
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        type="password"
                        label="Confirm New Password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
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
                  </Grid>

                  <Box sx={{ mt: 3 }}>
                    <Button
                      variant="contained"
                      startIcon={isSaving ? <CircularProgress size={20} /> : <Save />}
                      onClick={handlePasswordChange}
                      disabled={isSaving || !formData.currentPassword || !formData.newPassword}
                      sx={{
                        background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #7c3aed, #db2777)',
                        },
                      }}
                    >
                      {isSaving ? 'Updating...' : 'Update Password'}
                    </Button>
                  </Box>
                </Box>
              )}

              {activeTab === 'notifications' && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Notification Preferences
                  </Typography>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={preferences.notifications}
                          onChange={(e) => setPreferences({ ...preferences, notifications: e.target.checked })}
                        />
                      }
                      label="Email Notifications"
                    />
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="Push Notifications"
                    />
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="Video Completion Alerts"
                    />
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="Render Queue Updates"
                    />
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="Security Alerts"
                    />
                  </Box>

                  <Box sx={{ mt: 3 }}>
                    <Button
                      variant="contained"
                      startIcon={isSaving ? <CircularProgress size={20} /> : <Save />}
                      onClick={handlePreferencesUpdate}
                      disabled={isSaving}
                      sx={{
                        background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #7c3aed, #db2777)',
                        },
                      }}
                    >
                      {isSaving ? 'Saving...' : 'Save Preferences'}
                    </Button>
                  </Box>
                </Box>
              )}

              {activeTab === 'preferences' && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Preferences
                  </Typography>

                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel sx={{ color: '#a0a0b8' }}>Theme</InputLabel>
                        <Select
                          value={preferences.theme}
                          onChange={(e) => setPreferences({ ...preferences, theme: e.target.value as any })}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              '& fieldset': { borderColor: '#2a2a3e' },
                              '&:hover fieldset': { borderColor: '#4a4a6a' },
                              '&.Mui-focused fieldset': { borderColor: '#8b5cf6' },
                            },
                            '& .MuiInputLabel-root': { color: '#a0a0b8' },
                            '& .MuiSelect-select': { color: '#ffffff' },
                          }}
                        >
                          <MenuItem value="light">Light</MenuItem>
                          <MenuItem value="dark">Dark</MenuItem>
                          <MenuItem value="auto">Auto</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth>
                        <InputLabel sx={{ color: '#a0a0b8' }}>Language</InputLabel>
                        <Select
                          value={preferences.language}
                          onChange={(e) => setPreferences({ ...preferences, language: e.target.value as any })}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              '& fieldset': { borderColor: '#2a2a3e' },
                              '&:hover fieldset': { borderColor: '#4a4a6a' },
                              '&.Mui-focused fieldset': { borderColor: '#8b5cf6' },
                            },
                            '& .MuiInputLabel-root': { color: '#a0a0b8' },
                            '& .MuiSelect-select': { color: '#ffffff' },
                          }}
                        >
                          <MenuItem value="en">English</MenuItem>
                          <MenuItem value="es">Spanish</MenuItem>
                          <MenuItem value="fr">French</MenuItem>
                          <MenuItem value="de">German</MenuItem>
                          <MenuItem value="ja">Japanese</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>

                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" sx={{ color: '#8b5cf6', mb: 2 }}>
                      Storage Usage
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Storage sx={{ color: '#a0a0b8' }} />
                      <Typography variant="body2" sx={{ color: '#a0a0b8' }}>
                        {user ? `${(user.usage.storageUsed / 1024 / 1024).toFixed(1)} MB used of ${(user.usage.monthlyStorageLimit / 1024 / 1024).toFixed(1)} MB` : 'Calculating...'}
                      </Typography>
                    </Box>
                    <Box sx={{ width: '100%', bgcolor: '#2a2a3e', borderRadius: 2, p: 1 }}>
                      <Box
                        sx={{
                          height: 8,
                          borderRadius: 1,
                          bgcolor: '#8b5cf6',
                          width: user ? `${(user.usage.storageUsed / user.usage.monthlyStorageLimit) * 100}%` : '0%',
                        }}
                      />
                    </Box>
                  </Box>

                  <Box sx={{ mt: 3 }}>
                    <Button
                      variant="contained"
                      startIcon={isSaving ? <CircularProgress size={20} /> : <Save />}
                      onClick={handlePreferencesUpdate}
                      disabled={isSaving}
                      sx={{
                        background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #7c3aed, #db2777)',
                        },
                      }}
                    >
                      {isSaving ? 'Saving...' : 'Save Preferences'}
                    </Button>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SettingsPage;
