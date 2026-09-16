import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Fab, Paper, Typography, IconButton, TextField, Button,
  Chip, Avatar, CircularProgress, Tooltip, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import {
  SmartToy as BotIcon, Close as CloseIcon, Send as SendIcon,
  Mic as MicIcon, MicOff as MicOffIcon, VolumeUp as VolumeUpIcon,
  Refresh as RefreshIcon, Psychology as BrainIcon, AutoAwesome as SparklesIcon
} from '@mui/icons-material';
import api from '../services/api';
import useAuthStore from '../store/authStore';

const AiChatbot = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'Namaste! Main Finsen Store AI Assistant hoon. Aap mujhse kisi bhi material (jaise Cement, Pipe, Nojal, Flange) ke store stock ke baare me pooch sakte hain.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      options: []
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState({ connected: false, availableModels: ['llama3.2'], defaultModel: 'llama3.2' });
  const [selectedModel, setSelectedModel] = useState('llama3.2');
  const messagesEndRef = useRef(null);
  const selectedLocation = useAuthStore((state) => state.selectedLocation);
  const user = useAuthStore((state) => state.user);

  const quickQuestions = [
    'Cement kitna store me bacha hai?',
    'Pipe kitna bacha hai?',
    'Nojal kitna hai?',
    'Lose Accessories kitna bacha hai?'
  ];

  useEffect(() => {
    checkStatus();
  }, []);

  useEffect(() => {
    if (open) {
      scrollToBottom();
    }
  }, [messages, open]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkStatus = async () => {
    try {
      const res = await api.get('/api/v1/ai/status');
      if (res.data) {
        setOllamaStatus(res.data);
        if (res.data.defaultModel) {
          setSelectedModel(res.data.defaultModel);
        }
      }
    } catch (err) {
      console.log('Ollama status check offline or fallback mode');
    }
  };

  const handleSend = async (textToSend) => {
    const query = textToSend || input;
    if (!query || !query.trim()) return;

    const userMsg = {
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));

      const locId = selectedLocation?.id || user?.locationId || null;
      const locName = selectedLocation?.name || user?.location || null;

      const res = await api.post('/api/v1/ai/chat', {
        message: query,
        history: historyPayload,
        locationId: locId,
        locationName: locName,
        model: selectedModel
      });

      const aiMsg = {
        sender: 'ai',
        text: res.data.reply || 'Maaf kijiye, abhi response process nahi ho paya.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        options: res.data.options || [],
        source: res.data.source,
        model: res.data.model
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: 'Connection Error: AI Chatbot server response nahi de raha. Kripya check karein ki Spring Boot backend active hai.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Voice Input (Speech-to-Text)
  const toggleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Aapke browser me Speech Recognition support nahi hai. Chrome ya Edge browser use karein.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN'; // Hindi / Hinglish recognition
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  // Text-to-Speech (Read Aloud)
  const speakText = (text) => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in this browser.');
      return;
    }
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#•]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'hi-IN';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <>
      {/* Floating Action Button */}
      {!open && (
        <Fab
          color="primary"
          aria-label="AI Store Assistant"
          onClick={() => setOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1300,
            background: 'linear-gradient(135deg, #0B4F6C 0%, #01BAEF 100%)',
            boxShadow: '0 8px 24px rgba(1, 186, 239, 0.4)',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'scale(1.1)',
              boxShadow: '0 12px 28px rgba(1, 186, 239, 0.6)'
            }
          }}
        >
          <BotIcon sx={{ fontSize: 32 }} />
        </Fab>
      )}

      {/* Chat Window Container */}
      {open && (
        <Paper
          elevation={12}
          sx={{
            position: 'fixed',
            bottom: { xs: 0, sm: 24 },
            right: { xs: 0, sm: 24 },
            width: { xs: '100vw', sm: 420 },
            height: { xs: '100vh', sm: 580 },
            zIndex: 1300,
            borderRadius: { xs: 0, sm: 4 },
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid rgba(1, 186, 239, 0.2)',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.3)'
          }}
        >
          {/* Header */}
          <Box
            sx={{
              p: 2,
              background: 'linear-gradient(135deg, #0B4F6C 0%, #01BAEF 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <Box display="flex" alignItems="center" gap={1.5}>
              <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)', width: 40, height: 40 }}>
                <BotIcon />
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
                  Finsen Store AI Assistant
                </Typography>
                <Box display="flex" alignItems="center" gap={0.8} mt={0.3}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: ollamaStatus.connected ? '#4CAF50' : '#FFC107'
                    }}
                  />
                  <Typography variant="caption" sx={{ opacity: 0.9, fontSize: '0.75rem' }}>
                    {selectedLocation?.name || user?.location ? `SITE: ${selectedLocation?.name || user?.location} • ${ollamaStatus.connected ? 'Ollama AI' : 'RAG Engine'}` : (ollamaStatus.connected ? `Ollama Active (${selectedModel})` : 'Smart RAG Engine')}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Box display="flex" alignItems="center">
              <Tooltip title="Refresh Ollama Status">
                <IconButton size="small" onClick={checkStatus} sx={{ color: '#fff' }}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: '#fff' }}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>

          {/* Model Selector Bar */}
          {ollamaStatus.connected && ollamaStatus.availableModels?.length > 0 && (
            <Box sx={{ px: 2, py: 0.8, bgcolor: 'rgba(1, 186, 239, 0.08)', borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="caption" color="text.secondary">Ollama Model:</Typography>
              <Select
                size="small"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                sx={{ height: 28, fontSize: '0.8rem', bgcolor: '#fff' }}
              >
                {ollamaStatus.availableModels.map((m) => (
                  <MenuItem key={m} value={m} sx={{ fontSize: '0.8rem' }}>{m}</MenuItem>
                ))}
              </Select>
            </Box>
          )}

          {/* Chat Messages Body */}
          <Box
            sx={{
              flexGrow: 1,
              p: 2,
              overflowY: 'auto',
              bgcolor: '#F8FAFC',
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5
            }}
          >
            {messages.map((msg, index) => (
              <Box
                key={index}
                sx={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%'
                }}
              >
                <Paper
                  elevation={1}
                  sx={{
                    p: 1.8,
                    borderRadius: msg.sender === 'user' ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
                    bgcolor: msg.sender === 'user' ? '#01BAEF' : '#FFFFFF',
                    color: msg.sender === 'user' ? '#FFFFFF' : '#1A202C',
                    border: msg.sender === 'user' ? 'none' : '1px solid #E2E8F0'
                  }}
                >
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-line', lineHeight: 1.6 }}>
                    {msg.text}
                  </Typography>

                  {/* Option Chips for Clarification Questions */}
                  {msg.options && msg.options.length > 0 && (
                    <Box display="flex" flexWrap="wrap" gap={0.8} mt={1.5}>
                      {msg.options.map((opt, idx) => (
                        <Chip
                          key={idx}
                          label={opt}
                          size="small"
                          clickable
                          onClick={() => handleSend(opt)}
                          color="primary"
                          variant="outlined"
                          sx={{ fontSize: '0.75rem', bgcolor: '#EBF8FF' }}
                        />
                      ))}
                    </Box>
                  )}

                  <Box display="flex" alignItems="center" justifyContent="space-between" mt={1}>
                    <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.7rem' }}>
                      {msg.time}
                    </Typography>
                    {msg.sender === 'ai' && (
                      <IconButton size="small" onClick={() => speakText(msg.text)} sx={{ p: 0.2 }}>
                        <VolumeUpIcon sx={{ fontSize: 16, opacity: 0.7 }} />
                      </IconButton>
                    )}
                  </Box>
                </Paper>
              </Box>
            ))}

            {loading && (
              <Box alignSelf="flex-start" display="flex" alignItems="center" gap={1} p={1}>
                <CircularProgress size={20} color="primary" />
                <Typography variant="caption" color="text.secondary">Thinking...</Typography>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Box>

          {/* Quick Suggestions */}
          <Box sx={{ px: 1.5, py: 1, bgcolor: '#FFFFFF', borderTop: '1px solid #E2E8F0', overflowX: 'auto', whiteSpace: 'nowrap' }}>
            <Box display="flex" gap={1}>
              {quickQuestions.map((q, idx) => (
                <Chip
                  key={idx}
                  label={q}
                  size="small"
                  onClick={() => handleSend(q)}
                  sx={{ fontSize: '0.75rem', bgcolor: '#EDF2F7', '&:hover': { bgcolor: '#E2E8F0' } }}
                />
              ))}
            </Box>
          </Box>

          {/* Input Footer */}
          <Box sx={{ p: 1.5, bgcolor: '#FFFFFF', borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title={isListening ? 'Stop Listening' : 'Voice Input (Hinglish/Hindi)'}>
              <IconButton
                color={isListening ? 'error' : 'default'}
                onClick={toggleVoiceInput}
                sx={{
                  bgcolor: isListening ? '#FED7D7' : '#F7FAFC',
                  animation: isListening ? 'pulse 1.5s infinite' : 'none'
                }}
              >
                {isListening ? <MicOffIcon color="error" /> : <MicIcon color="action" />}
              </IconButton>
            </Tooltip>

            <TextField
              fullWidth
              size="small"
              placeholder={isListening ? 'Listening...' : 'Poochein (e.g. Cement kitna bacha hai?)...'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              disabled={loading}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
            />

            <IconButton
              color="primary"
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              sx={{ bgcolor: '#01BAEF', color: '#fff', '&:hover': { bgcolor: '#0B4F6C' } }}
            >
              <SendIcon />
            </IconButton>
          </Box>
        </Paper>
      )}
    </>
  );
};

export default AiChatbot;
