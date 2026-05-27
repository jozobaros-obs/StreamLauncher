'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Player
  openStream:        (url)    => ipcRenderer.invoke('open-stream', url),
  closeStream:       ()       => ipcRenderer.invoke('close-stream'),

  // Subtitles
  loadSubtitle:      ()       => ipcRenderer.invoke('load-subtitle'),
  setSubtitleOffset: (delta)  => ipcRenderer.invoke('set-subtitle-offset', delta),
  clearSubtitle:     ()       => ipcRenderer.invoke('clear-subtitle'),

  // Settings
  getSettings:       ()       => ipcRenderer.invoke('get-settings'),
  saveSettings:      (data)   => ipcRenderer.invoke('save-settings', data),

  // Sites list
  getSites:          ()       => ipcRenderer.invoke('get-sites'),

  // Window controls
  minimize:          ()       => ipcRenderer.invoke('win-minimize'),
  maximize:          ()       => ipcRenderer.invoke('win-maximize'),
  close:             ()       => ipcRenderer.invoke('win-close'),
  openExternal:      (url)    => ipcRenderer.invoke('open-external', url),

  // Events from main
  onPlayerClosed:    (cb) => ipcRenderer.on('player-closed',   () => cb()),
  onFullscreen:      (cb) => ipcRenderer.on('fullscreen-change', (_e, val) => cb(val)),
});
