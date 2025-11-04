import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { WorkflowDefinition } from "../types/workflowTemplate";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { FollowUpOption, WorkflowMessage } from "../types/aimeWorkflowMessages";
import SmartAutocomplete from "./SmartAutocomplete";
import { cn } from "@/lib/utils";




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
const MessageItem = memo(({ message, isFirst, onOptionSelected }: { message: WorkflowMessage, isFirst: boolean, onOptionSelected?: (option: FollowUpOption, forKey: string) => void  }) => {
    const listItemClassName = message.sender === 'aime' 
        ? 'rounded-lg bg-transparent mb-1 border border-green-200' 
        : 'rounded-lg bg-blue-50 mb-1';
    const timestampClassName = cn(
        "text-xs opacity-70 whitespace-nowrap absolute top-1",
        message.sender === 'aime' ? 'right-2' : 'left-2'
    );

    const handleFollowUpOptionClick = (option: FollowUpOption, forKey: string) => {
        // Handle follow-up option click
        console.log(`The option for ${forKey} selected:`, option);
        if (onOptionSelected) {
            onOptionSelected(option, forKey);
        }
    };

    console.log('Rendering MessageItem:', message.id, 'isFirst:', isFirst);

    return (
        <div 
            key={message.id} 
            className={cn(
                "flex items-start gap-3 py-2 w-[calc(100%-30px)]",
                message.sender === 'aime' ? 'justify-start' : 'justify-end',
                listItemClassName
            )}
        >
            {message.sender === 'aime' && (
                <Avatar className="rounded-none bg-transparent">
                    <AvatarImage src="/aime-workflow-chat.png" alt="aime" />
                    <AvatarFallback>aime</AvatarFallback>
                </Avatar>
            )}
            
            <div className="flex-1 relative pt-4">
                <span className={timestampClassName}>
                    {formatRelativeTime(message.timestamp)}
                </span>

                <div className="space-y-1">
                    {message.content.text
                        .replace(/^\s*\n/, '')                // strip leading newline(s)
                        .replace(/\s*\n\s*$/, '')             // strip trailing newline(s)
                        .split('\n')
                        .map((line, index) => (
                            <p key={index} className="text-sm mb-1">
                                {line}
                            </p>
                        ))}
                </div>

                {message.content.followUpQuestions && message.content.followUpQuestions.length > 0 && (
                    <div key={message.id + '-questions'} className="mt-2">
                        {message.content.followUpQuestions.map((question, index) => (
                            <p key={index} className="text-sm text-blue-600">
                                Q. {question}
                            </p>
                        ))}
                    </div>
                )}
                
                {message.content.followUpOptions && Object.keys(message.content.followUpOptions).length > 0 && (
                    <div key={message.id + '-options-parent'} className="mt-2">
                        <div className="text-sm mb-1">Select one:</div>
                        {Object.entries(message.content.followUpOptions).map(([forKey, options]) => (
                            <div key={forKey + '-options'} className="mb-2">
                                <div className="font-bold text-sm">{forKey}:</div>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {options.map((option, index) => (
                                        <Badge 
                                            key={forKey + index}
                                            variant="secondary"
                                            className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                            onClick={() => handleFollowUpOptionClick(option, forKey)}
                                        >
                                            {option.label}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {message.sender !== 'aime' && (
                <Avatar className="bg-primary">
                    <AvatarFallback>JD</AvatarFallback>
                </Avatar>
            )}
        </div>
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
    const messagesContainerRef = useRef<HTMLDivElement | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Focus the input on mount
        setTimeout(() => {
            if (workflowTemplateId && workflowTemplateId.length > 0) {
                autocompleteRef.current?.focus();
            }
            scrollToBottom();
        }, 100);
    }, [workflowTemplateId]);

    useEffect(() => {
        // Scroll to bottom when messages change
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTo({
                top: messagesContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }

    const onOptionSelected = useCallback(async (option: FollowUpOption, forKey: string) => {
        setUserInput(`${userInput} ${userInput??'\n'} Use ${option.label}(${option.value}) for ${forKey}`);
        autocompleteRef.current?.focus();
    }, [userInput]);

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
            // Scroll to bottom of messages
            if (autocompleteRef.current) {
                autocompleteRef.current.focus();
            }
        }, 100);
    }, [sendMessage]);


    return (
        <div className="p-1 pl-0 flex-1 flex flex-col h-full">
            {error && (
                <Alert variant="destructive" className="mb-2">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {!error && workflowTemplateId && (
                <div className="self-stretch h-full p-1 flex flex-col items-stretch border rounded-md bg-card">
                    <div className="mb-1 font-bold">
                        Ask aime
                    </div>
                    <div
                        ref={messagesContainerRef}
                        className="border border-border rounded-md p-4 flex-1 mb-1 min-h-0 overflow-y-auto max-h-full"
                    >
                        <div className="w-full min-h-0">
                            {(messages?.length === 0) ? (
                                <div className="text-center text-muted-foreground">
                                    No messages yet. Start the conversation!
                                </div>
                            ) : (
                                messages?.map((message, index) => (
                                    <MessageItem key={message.id} message={message} isFirst={(index === 0)} onOptionSelected={onOptionSelected} />
                                ))
                            )}
                        </div>
                    </div>
                    {isLoading && (<Progress value={100} className="w-full animate-pulse" />)}
                    <SmartAutocomplete
                        value={userInput}
                        autoFocus={true}
                        onChange={setUserInput}
                        disabled={isLoading}
                        inputRef={autocompleteRef}
                        handleSendToAime={handleSendToAime}
                        workflowDefinition={workflowDefinition}
                    />
                </div>
            )}
        </div>
    );
}


