'use client'
import { Box, Button, Stack, TextField } from "@mui/material";
import CircularProgress from '@mui/material/CircularProgress';
import { useState, useEffect } from "react";

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm the Rate My Professor support assistant. How can I help you today?",
    },
  ]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      document.body.style.background = `linear-gradient(135deg, #${Math.floor(Math.random() * 16777215).toString(16)}, #${Math.floor(Math.random() * 16777215).toString(16)})`;
    }, 3000); // Change background color every 3 seconds

    return () => clearInterval(interval);
  }, []);

  const sendMessage = async () => {
    const newMessage = { role: "user", content: message };
    setMessages((prevMessages) => [
      ...prevMessages,
      newMessage,
      { role: "assistant", content: '' }
    ]);
    setMessage('');

    setLoading(true);

    const response = await fetch('/api/chat', {
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([...messages, newMessage])
    });

    setLoading(false);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let result = '';

    const processText = async ({ done, value }) => {
      if (done) {
        return result;
      }
      const text = decoder.decode(value || new Uint8Array(), { stream: true });
      setMessages((prevMessages) => {
        const lastMessage = prevMessages[prevMessages.length - 1];
        return [
          ...prevMessages.slice(0, -1),
          { ...lastMessage, content: lastMessage.content + text }
        ];
      });
      return reader.read().then(processText);
    };

    reader.read().then(processText);
  };

  return (
    
    <Box 
      width="100vw" 
      height="100vh" 
      display="flex" 
      flexDirection="column" 
      justifyContent="center" 
      alignItems="center"
      sx={{
        animation: 'backgroundAnimation 10s infinite alternate',
        '@keyframes backgroundAnimation': {
          '0%': { backgroundColor: '#1a2a6c' },
          '50%': { backgroundColor: '#b21f1f' },
          '100%': { backgroundColor: '#fdbb2d' },
        },
      }}
    >
      <Stack 
        direction="column" 
        width="500px" 
        height="700px"
        border="1px solid black" 
        p={2} 
        spacing={3}
        sx={{
          background: 'rgba(255, 255, 255, 0.8)', 
          backdropFilter: 'blur(10px)', 
          boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.5)',
          borderRadius: '16px',
          animation: 'boxGlow 2s ease-in-out infinite alternate',
          '@keyframes boxGlow': {
            '0%': { boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.5)' },
            '100%': { boxShadow: '0px 10px 50px rgba(0, 0, 0, 0.8)' },
          },
        }}
      >
        <Stack 
          direction="column" 
          spacing={2} 
          flexGrow={1} 
          overflow='auto' 
          maxHeight='100%'
        >
          {
            messages.map((message, index) => (
              <Box 
                key={index} 
                display="flex" 
                justifyContent={
                  message.role === "assistant" ? 'flex-start' : 'flex-end'
                }
                width="100%"
                mb={3} // Increased margin bottom to prevent overlap
              >
                <Box 
                  bgcolor={message.role === 'assistant' ? "primary.main" : "secondary.main"}
                  color="white"
                  borderRadius={16}
                  p={3}
                  boxShadow={2} 
                  style={{ 
                    maxWidth: '80%', 
                    margin: '5px', 
                    transform: `scale(${1 + index * 0.02})`, 
                    transition: 'transform 0.3s ease-in-out', 
                    whiteSpace: 'pre-wrap', 
                    overflowWrap: 'break-word',
                  }}
                >
                  {message.content.replace(/(\d+\.\s|\*\*)/g, '').split('\n').map((str, i) => (
                    <p key={i} style={{ margin: 0 }}>
                      {str}
                    </p>
                  ))}
                </Box>
              </Box>
            ))}
          {loading && <CircularProgress />} 
        </Stack>
        <Stack 
          direction="row"
          spacing={2}
        >
          <TextField
            label="Message"
            fullWidth
            value={message}
            onChange={(e) => {
              if (e.target.value.length <= 200) { 
                setMessage(e.target.value);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                sendMessage();
              }
            }}
            sx={{
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              transition: 'background-color 0.3s ease-in-out',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 1)',
              },
              width: '600px', // Adjust this value to widen the text box
            }}
          />
          <Button 
            variant='contained' 
            onClick={async () => {
              setLoading(true); 
              await sendMessage(); 
              setLoading(false); 
            }}
            sx={{
              animation: 'buttonPulse 1.5s infinite',
              '@keyframes buttonPulse': {
                '0%': { transform: 'scale(1)' },
                '50%': { transform: 'scale(1.1)' },
                '100%': { transform: 'scale(1)' },
              },
            }}
          >
            Send
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}