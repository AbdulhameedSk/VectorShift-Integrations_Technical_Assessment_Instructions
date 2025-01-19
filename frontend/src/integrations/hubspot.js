import { useState, useEffect } from 'react';
import { Box, Button, CircularProgress, Alert, Snackbar } from '@mui/material';
import axios from 'axios';

// Constants
const NOTION_CLIENT_ID ='180d872b-594c-802b-b4c3-0037a6851038'
const NOTION_REDIRECT_URI = process.env.REACT_APP_NOTION_REDIRECT_URI || 'http://localhost:8000/integrations/notion/callback';

export const NotionIntegration = ({ user, org, integrationParams, setIntegrationParams }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState(null);

    // Check connection status on mount and when integrationParams change
    useEffect(() => {
        setIsConnected(!!integrationParams?.credentials);
    }, [integrationParams?.credentials]);

    // Function to open OAuth in a new window
    const handleConnectClick = async () => {
        try {
            setIsConnecting(true);
            setError(null);
            
            if (!NOTION_CLIENT_ID) {
                throw new Error('Notion Client ID is not configured');
            }

            const formData = new FormData();
            formData.append('user_id', user);
            formData.append('org_id', org);
            formData.append('client_id', NOTION_CLIENT_ID);
            formData.append('redirect_uri', NOTION_REDIRECT_URI);

            const response = await axios.post(
                'http://localhost:8000/integrations/notion/authorize', 
                formData
            );
            
            const authURL = response?.data?.authURL ;
            if (!authURL) {
                throw new Error('No authorization URL received');
            }

            const newWindow = window.open(
                authURL, 
                'Notion Authorization',
                'width=600,height=600,scrollbars=yes'
            );

            const pollTimer = window.setInterval(() => {
                if (newWindow?.closed) {
                    window.clearInterval(pollTimer);
                    handleWindowClosed();
                }
            }, 200);

        } catch (err) {
            setError(err?.response?.data?.detail || err.message || 'Failed to connect to Notion');
            setIsConnecting(false);
        }
    };

    // Handle OAuth window close
    const handleWindowClosed = async () => {
        try {
            const formData = new FormData();
            formData.append('user_id', user);
            formData.append('org_id', org);

            const response = await axios.post(
                'http://localhost:8000/integrations/notion/credentials',
                formData
            );

            const credentials = response?.data?.credentials;
            if (credentials) {
                setIntegrationParams(prev => ({
                    ...prev,
                    credentials,
                    type: 'Notion'
                }));
                setIsConnected(true);
            }
        } catch (err) {
            setError(err?.response?.data?.detail || 'Failed to retrieve Notion credentials');
        } finally {
            setIsConnecting(false);
        }
    };

    // Handle disconnect
    const handleDisconnect = async () => {
        try {
            setIsConnecting(true);
            setError(null);

            const formData = new FormData();
            formData.append('user_id', user);
            formData.append('org_id', org);

            await axios.post(
                'http://localhost:8000/integrations/notion/disconnect',
                formData
            );

            setIntegrationParams(prev => ({
                ...prev,
                credentials: null,
                type: null
            }));
            setIsConnected(false);
        } catch (err) {
            setError(err?.response?.data?.detail || 'Failed to disconnect from Notion');
        } finally {
            setIsConnecting(false);
        }
    };

    return (
        <Box className="p-4">
            <Box className="flex flex-col items-center gap-4">
                {isConnected ? (
                    <Button
                        variant="outlined"
                        color="error"
                        onClick={handleDisconnect}
                        disabled={isConnecting}
                        className="w-48"
                    >
                        {isConnecting ? (
                            <CircularProgress size={20} className="mr-2" />
                        ) : (
                            'Disconnect Notion'
                        )}
                    </Button>
                ) : (
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handleConnectClick}
                        disabled={isConnecting}
                        className="w-48"
                    >
                        {isConnecting ? (
                            <CircularProgress size={20} className="mr-2" />
                        ) : (
                            'Connect to Notion'
                        )}
                    </Button>
                )}

                {isConnected && (
                    <Alert severity="success" className="w-full">
                        Successfully connected to Notion
                    </Alert>
                )}
            </Box>

            <Snackbar
                open={!!error}
                autoHideDuration={6000}
                onClose={() => setError(null)}
            >
                <Alert severity="error" onClose={() => setError(null)}>
                    {error}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default NotionIntegration;