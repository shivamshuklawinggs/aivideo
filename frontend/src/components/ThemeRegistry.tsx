'use client';
import * as React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import NextAppDirEmotionCacheProvider from './EmotionCache';
// ─── All theme data is sourced from defaults.json (single source of truth) ──
// Edit defaults.json to change colors, fonts, or defaults, then everything
// stays in sync automatically. You can copy-paste defaults.json anywhere.



export const colorPresets = {
    "darkSlate": {
      "main": "#383e4b",
      "light": "#475569",
      "dark": "#2d3440",
      "contrast": "#FFFFFF"
    },
     "slate": {
      "main": "#64748B",
      "light": "#94A3B8",
      "dark": "#475569",
      "contrast": "#FFFFFF"
    },
  }
const lightBackgrounds = {
    "neutral": {
      "default": "#F5F5F5",
      "paper": "#FFFFFF",
      "sidebar": "#EEEEEE"
    }
  }
const darkTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: colorPresets.darkSlate.main },
    secondary: { main: colorPresets.slate.main},
    background: {
      default: lightBackgrounds.neutral.default,
      paper: lightBackgrounds.neutral.paper,
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', borderRadius: 8 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },
  },
});

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return (
    <NextAppDirEmotionCacheProvider options={{ key: 'mui' }}>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </NextAppDirEmotionCacheProvider>
  );
}
