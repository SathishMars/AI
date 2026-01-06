import { useCallback, useEffect, useRef, useState } from "react";
import { WorkflowMessage } from "../types/aimeWorkflowMessages";
import ShortUniqueId from 'short-unique-id';
import { WorkflowDefinition } from "../types/workflowTemplate";
// removed unused import 'text'
import { useUnifiedUserContext } from "../contexts/UnifiedUserContext";
import { apiFetch } from "../utils/api";

// 10-char alphanumeric short id generator (reusable instance)
const uid = new ShortUniqueId({ length: 10, dictionary: 'alphanum' });

// Helper to produce an id string
function generateShortId(): string {
    // use rnd() to generate id string with this package version
    // (instance is not directly callable in typings)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return uid.rnd();
}

interface AImeWorkflowOptions {
    workflowTemplateId: string;
    workflowDefinition: WorkflowDefinition;
    onMessage: (message: string) => void;
    onWorkflowDefinitionChange?: (workflowDefinition: WorkflowDefinition, mermaidDiagram?: string) => void;
}

interface UseAimeWorkflowReturn {
    messages: WorkflowMessage[];
    sendMessage: (message: string) => Promise<void>;
    regenerateMermaidDiagram: () => Promise<void>;
    regenerateWorkflowDefinition: () => Promise<void>;
}

const seedWelcomeMessage = (): WorkflowMessage => {
        return {
            id: generateShortId(),
            sender: "aime",
            type: "text",
            userId: "system",
            userName: "aime workflows",
            content: {
                text: "**Hey there! I'm aime Request — your AI sidekick for building smart workflows.**\nTell me what you'd like to create, and I'll guide you through it step by step — or jump right in with a preset."
            },
            timestamp: new Date().toISOString()
        };
    }; 

export function useAimeWorkflow({
    workflowTemplateId,
    workflowDefinition,
    onMessage,
    onWorkflowDefinitionChange
}: AImeWorkflowOptions): UseAimeWorkflowReturn {
    const sessionIDRef = useRef<string>(generateShortId());
    const sessionId = sessionIDRef.current;
    const [messages, setMessages] = useState<WorkflowMessage[]>([]);
    const { user, account, currentOrganization, isLoading: contextLoading } = useUnifiedUserContext();
    const accountId = account?.id;
    const organizationId = currentOrganization?.id || null;

    useEffect(() => {
        if (!workflowTemplateId || workflowTemplateId.trim()==="new") {
                // this is a new conversation. So seed it with a welcome message from aime
                setMessages([seedWelcomeMessage()]);
                return;           
        }

        // Wait for context to load before fetching messages
        if (contextLoading || !accountId) {
            return;
        }

        const url = '/api/workflow-templates/' + encodeURIComponent(workflowTemplateId) + '/aime-messages';
        const headers = {
            'Content-Type': 'application/json',
            'x-account': accountId,
            'x-organization': organizationId || ''
        };

        // Reset messages when workflowTemplateId changes
        apiFetch(url, {
            method: 'GET',
            headers
        })
        .then(async (response) => {
            if (!response.ok) {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();

            if (data && Array.isArray(data) && data.length > 0) {
                setMessages(data);
            } else {
                //  new chat. So seed it with a welcome message from aime
                setMessages([seedWelcomeMessage()]);            
            }
        })
        .catch((error) => {
            console.error('[useAimeWorkflow] Error fetching messages:', error);
            setMessages([]);
        });
    }, [workflowTemplateId, accountId, organizationId, contextLoading, account, currentOrganization]);

    const sendMessage = useCallback(async (message: string) => {
        const newMessage: WorkflowMessage = {
            id: generateShortId(),
            sender: 'user',
            type: 'text',
            userId: user?.id ?? 'unknown',
            userName: `${user?.profile?.lastName ?? ''}${user?.profile?.lastName && user?.profile?.firstName ? ', ' : ''}${user?.profile?.firstName ?? 'user'}`,
            content: { text: message },
            timestamp: new Date().toISOString()
        };

        // Append user message to state
        setMessages(prev => [...prev, newMessage]);
        //call the/api/generate-workflow API to get aime response
        // we need to send only the last few messages to keep the payload small and maintain context
        const MAX_CONTEXT_MESSAGES = 10; // including the new user message
        const recentMessages = messages.slice(- (MAX_CONTEXT_MESSAGES - 1)); // get last N-1 messages
        const messagesHistory = [...recentMessages, newMessage];
        const payload = {
            sessionId,
            templateId: workflowTemplateId,
            messages: messagesHistory,
            workflowDefinition: workflowDefinition
        };

        const response = await apiFetch('/api/generate-workflow', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('API response data:', data);

        if (data && Array.isArray(data.messages)) {
            setMessages(prev => [...prev, ...data.messages]);
        } else {
            throw new Error('Invalid response format from API');
        }

        console.log('Received workflowDefinition from API:', data.workflowDefinition);

        if (data.workflowDefinition && onWorkflowDefinitionChange) {
            onWorkflowDefinitionChange(data.workflowDefinition, data.mermaidDiagram.trim());
        }
        if (onMessage) {
            onMessage(message);
        }
    }, [messages, onMessage, onWorkflowDefinitionChange, sessionId, workflowDefinition, workflowTemplateId, user?.id, user?.profile?.firstName, user?.profile?.lastName]);


    const regenerateMermaidDiagram = useCallback(async () => {
        if (!workflowTemplateId || workflowTemplateId.trim() === "new") {
            console.warn('Cannot regenerate mermaid diagram for new template');
            return;
        }
        const payload = {
            sessionId: sessionIDRef.current,
            workflowTemplateId,
            workflowDefinition
        };

        const response = await apiFetch('/api/generate-mermaid', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Regenerate mermaid API response data:', data);

        if (onWorkflowDefinitionChange) {
            onWorkflowDefinitionChange(workflowDefinition, data.mermaidDiagram.trim());
        }
    } , [onWorkflowDefinitionChange, workflowDefinition, workflowTemplateId]);

    const regenerateWorkflowDefinition = useCallback(async () => {
        if (!workflowTemplateId || workflowTemplateId.trim() === "new") {
            console.warn('Cannot regenerate workflow definition for new template');
            return;
        }
        const payload = {
            sessionId,
            templateId: workflowTemplateId,
            messages,
            workflowDefinition
        };

        const response = await apiFetch('/api/regenerate-workflow-definition', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Regenerate workflow definition API response data:', data);

        if (data.workflowDefinition && onWorkflowDefinitionChange) {
            onWorkflowDefinitionChange(data.workflowDefinition, data.mermaidDiagram?.trim());
        }
    } , [messages, onWorkflowDefinitionChange, sessionId, workflowDefinition, workflowTemplateId]);

    return {
        messages,
        sendMessage,
        regenerateMermaidDiagram,
        regenerateWorkflowDefinition
    };
}
