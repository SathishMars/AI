import { Alert, Avatar, Box, Chip, LinearProgress, List, ListItem, ListItemAvatar, ListItemText, Paper, Typography } from "@mui/material";
import { WorkflowDefinition } from "../types/workflowTemplate";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { FollowUpOption, WorkflowMessage } from "../types/aimeWorkflowMessages";
import styles from "./AimeWorkflowPane.module.css";
import SmartAutocomplete from "./SmartAutocomplete";




interface AimeWorkflowPaneProps {
    // Props can be added here as needed
    messages?: WorkflowMessage[];
    workflowDefinition: WorkflowDefinition;
    workflowTemplateId?: string;
    sendMessage: (message: string) => Promise<void>;
}


/**
 * Format a date as relative time (e.g., "2 minutes ago", "3 hours ago")
 * Handles both Date objects and ISO date strings
 */
function formatRelativeTime(date: Date | string): string {
    // Convert string to Date if needed
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
        return 'recently';
    }

    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'just now';
    if (diffMin === 1) return '1 minute ago';
    if (diffMin < 60) return `${diffMin} minutes ago`;
    if (diffHour === 1) return '1 hour ago';
    if (diffHour < 24) return `${diffHour} hours ago`;
    if (diffDay === 1) return 'yesterday';
    if (diffDay < 7) return `${diffDay} days ago`;

    // For older dates, show formatted date
    return dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}


// Memoized message item component to prevent unnecessary re-renders
const MessageItem = memo(({ message, isFirst }: { message: WorkflowMessage, isFirst: boolean }) => {
    const listItemClassName = message.sender === 'aime' ? styles['aime-message'] : styles['user-message'];
    let timestampSX: Record<string, unknown> = { opacity: 0.7, whiteSpace: 'nowrap', position: 'absolute', top: 3 };
    timestampSX = (message.sender === 'aime') ? { ...timestampSX, right: 8 } : { ...timestampSX, left: 8 };

    const handleFollowUpOptionClick = (option: FollowUpOption, forKey: string) => {
        // Handle follow-up option click
        console.log(`The option for ${forKey} selected:`, option);
    };

    console.log('Rendering MessageItem:', message.id, 'isFirst:', isFirst);

    return (
        <>
            {/* {(!isFirst) && (<Divider variant="middle" sx={{ my: 2 }} />)} */}
            <ListItem key={message.id} sx={{ alignItems: 'normal', justifySelf: message.sender === 'aime' ? 'flex-start' : 'flex-end', width: 'calc(100% - 30px)' }} className={listItemClassName}>
                {(message.sender === 'aime') && (
                    <ListItemAvatar sx={{ justifySelf: "flex-start" }}>
                        <Avatar alt="aime" src="/aime-flat.png">aime</Avatar>
                    </ListItemAvatar>
                )}
                <Typography variant="caption" sx={timestampSX}>
                    {formatRelativeTime(message.timestamp)}
                </Typography>

                <ListItemText
                    sx={{ mt: 2 }}
                    slots={{ primary: 'div', secondary: 'div' }}
                    primary={
                        <>
                            {message.content.text
                                .replace(/^\s*\n/, '')                // strip leading newline(s)
                                .replace(/\s*\n\s*$/, '')             // strip trailing newline(s)
                                .split('\n')
                                .map((line, index) => (
                                    <Typography key={index} variant="body1" sx={{ mb: '5px' }}>
                                        {line}
                                    </Typography>
                                ))}
                        </>
                    }
                    secondary={
                        <>
                            {message.content.followUpQuestions && message.content.followUpQuestions.length > 0 && (
                                <div key={message.id + '-questions'}>
                                    {message.content.followUpQuestions.map((question, index) => (
                                        <Typography key={index} variant="subtitle2" color="text.info">
                                            Q. {question}
                                        </Typography>
                                    ))}
                                </div>
                            )}
                            {message.content.followUpOptions && Object.keys(message.content.followUpOptions).length > 0 && (
                                <div key={message.id + '-options-parent'}>
                                    Select one:
                                    {Object.entries(message.content.followUpOptions).map(([forKey, options]) => (
                                        <div key={forKey + '-options'}>
                                            {options.map((option, index) => (
                                                <div key={forKey + index}>
                                                    <Chip size="small" color="info" label={option.label} sx={{ m: 0.5 }} onClick={() => handleFollowUpOptionClick(option, forKey)} />
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    }
                />
                {(message.sender !== 'aime') && (
                    <ListItemAvatar>
                        <Avatar alt="John Doe" sx={{ bgcolor: 'primary.main' }}>JD</Avatar>
                    </ListItemAvatar>
                )}
            </ListItem>
        </>
    );
});

MessageItem.displayName = "MessageItem"; // Set display name for better debugging


export default function AimeWorkflowPane({
    messages,
    workflowDefinition,
    workflowTemplateId,
    sendMessage,    
}: AimeWorkflowPaneProps) {
    const [userInput, setUserInput] = useState<string>('');
    const autocompleteRef = useRef<HTMLTextAreaElement | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Focus the input on mount
        if (!workflowTemplateId) {
            autocompleteRef.current?.focus();
        }
    }, [workflowTemplateId]);


    const handleSendToAime = useCallback(async (userMessage: string) => {
        if (!userMessage.trim()) return;
        setIsLoading(true);
        setError(null);
        setUserInput('');
        try {
            await sendMessage(userMessage);
        } catch (error: unknown) {
            if (typeof error === "object" && error !== null && "message" in error) {
                setError((error as { message?: string })?.message ?? String(error));
            } else {
                setError(String(error));
            }
        }
        setTimeout(() => {
            setIsLoading(false);
            if (autocompleteRef.current) {
                autocompleteRef.current.focus();
            }
        }, 100);
    }, [sendMessage]);


    return (
        <Box sx={{ p: 1, pl: 0, flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {!error && workflowTemplateId && (
                <Paper sx={{ alignSelf: 'stretch', flex: 1, p: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                    <Box sx={{ mb: 1, fontWeight: 'bold' }}>
                        Ask aime
                    </Box>
                    <Box
                        sx={{
                            border: 1,
                            borderColor: 'divider',
                            borderRadius: 1,
                            p: 2,
                            flex: 1,
                            mb: 1,
                            minHeight: 0,
                            position: 'relative',
                            overflowY: 'auto',
                            maxHeight: '100%',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                    >
                        <List sx={{ flex: 1, minHeight: 0, overflow: 'visible' }}>
                            {(messages?.length === 0) ? (
                                <Box sx={{ textAlign: 'center', color: 'text.secondary' }}>
                                    No messages yet. Start the conversation!
                                </Box>
                            ) : (
                                messages?.map((message, index) => (
                                    <MessageItem key={message.id} message={message} isFirst={(index === 0)} />
                                ))
                            )}
                        </List>
                        {isLoading && (<LinearProgress sx={{ position: 'absolute', bottom: 0, left: 0, right: 0 }} />)}
                    </Box>
                    <SmartAutocomplete
                        value={userInput}
                        autoFocus={true}
                        onChange={setUserInput}
                        disabled={isLoading}
                        inputRef={autocompleteRef}
                        handleSendToAime={handleSendToAime}
                        workflowDefinition={workflowDefinition}
                    />
                </Paper>
            )}
        </Box>
    );
}


