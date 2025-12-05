import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { WorkflowDefinition, WorkflowStep } from "../types/workflowTemplate";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { FollowUpOption, WorkflowMessage } from "../types/aimeWorkflowMessages";
import SmartAutocomplete from "./SmartAutocomplete";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Markdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { env } from '@/app/lib/env';
import { useUnifiedUserContext } from '@/app/contexts/UnifiedUserContext';
import ShortUniqueId from 'short-unique-id';

// 10-char alphanumeric short id generator
const uid = new ShortUniqueId({ length: 10, dictionary: 'alphanum' });
function generateShortId(): string {
  // @ts-ignore
  return uid.rnd();
}

interface AimeWorkflowPaneProps {
  // Props can be added here as needed
  messages?: WorkflowMessage[];
  workflowDefinition: WorkflowDefinition;
  workflowTemplateId?: string;
  sendMessage: (message: string) => Promise<void>;
  onWorkflowDefinitionChange?: (workflowDefinition: WorkflowDefinition) => void;
}


/**
 * Format a date as relative time (e.g., "2 minutes ago", "3 hours ago")
 * Handles both Date objects and ISO date strings
 */
function formatRelativeTime(date: Date | string): string {
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
const MessageItem = memo(({ message, isFirst, onOptionSelected, workflowDefinition, userInitials, userAvatar, displayName }: { 
  message: WorkflowMessage, 
  isFirst: boolean, 
  onOptionSelected?: (option: FollowUpOption, forKey: string) => void,
  workflowDefinition?: WorkflowDefinition,
  userInitials?: string, 
  userAvatar?: string, 
  displayName?: string 
}) => {
  const listItemClassName = message.sender === 'aime' 
      ? 'rounded-lg bg-transparent pt-4' 
      : 'rounded-lg bg-gray-100 p-[12px] pt-4';
  const timestampClassName = cn(
      "text-xs opacity-70 whitespace-nowrap absolute",
      message.sender === 'aime' ? 'top-0 left-0' : 'top-1 left-[12px]'
  );

  const handleFollowUpOptionClick = (option: FollowUpOption, forKey: string) => {
      if (onOptionSelected) {
          onOptionSelected(option, forKey);
      }
  };

  // Once a template is selected, user cannot change it
  const isOptionSelected = (option: FollowUpOption): boolean => {
      if (!workflowDefinition || !option.category) return false;
      
      // Check for request template selection - disable ALL if ANY is selected
      if (option.category === 'template_request') {
          // Look for ANY trigger step with onRequest that has a requestTemplateId
          const triggerStep = workflowDefinition.steps.find(step => 
              step.type === 'trigger' && 
              step.stepFunction === 'onRequest' &&
              step.functionParams?.requestTemplateId
          );
          return !!triggerStep;
      }
      return false;
  };

  return (
      <div 
          key={message.id} 
          className={cn(
              "flex items-end gap-3 py-2",                
          )}
      >            
          <div className="flex-1">
              <div className={cn("space-y-1 relative", listItemClassName)}>
                  <span className={timestampClassName}>
                      {formatRelativeTime(message.timestamp)}
                  </span>
                  <Markdown remarkPlugins={[remarkBreaks]}>{message.content.text}</Markdown>
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
                                  {options.map((option, index) => {
                                      const isDisabled = isOptionSelected(option);
                                      // Check if THIS specific option is the selected one
                                      const isThisOptionSelected = workflowDefinition?.steps.some(step => 
                                          option.category === 'template_request' &&
                                          step.type === 'trigger' && 
                                          step.stepFunction === 'onRequest' &&
                                          step.functionParams?.requestTemplateId === option.value
                                      );
                                      
                                      return (
                                          <Badge 
                                              key={forKey + index}
                                              variant="secondary"
                                              className={cn(
                                                  "cursor-pointer transition-colors",
                                                  isDisabled 
                                                      ? "opacity-50 cursor-not-allowed bg-muted" 
                                                      : "hover:bg-primary hover:text-primary-foreground"
                                              )}
                                              onClick={() => !isDisabled && handleFollowUpOptionClick(option, forKey)}
                                          >
                                              {option.label}
                                              {isThisOptionSelected && " ✓"}
                                          </Badge>
                                      );
                                  })}
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>

          {message.sender !== 'aime' && (
              <Avatar className="bg-gray-300">
                  <AvatarImage src={userAvatar} alt={displayName} />
                  <AvatarFallback className="bg-gray-300">{userInitials || 'U'}</AvatarFallback>
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
  onWorkflowDefinitionChange,
}: AimeWorkflowPaneProps) {
  const { user, displayName } = useUnifiedUserContext();
  const [userInput, setUserInput] = useState<string>('');
  const autocompleteRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const userInitials = user ? `${user.profile.firstName[0]}${user.profile.lastName[0]}` : "";
  const userAvatar = user?.profile.avatar;

  useEffect(() => {
      // Focus the input on moun
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

  const onOptionSelected = useCallback(async (option: FollowUpOption, forKey: string) => {
      // Handle template_request category by directly updating workflow definition
      if (option.category === 'template_request' && option.value && onWorkflowDefinitionChange) {
          // Find or create trigger step
          let triggerStep = workflowDefinition.steps.find(step => 
              step.type === 'trigger' && step.stepFunction === 'onRequest'
          ) as WorkflowStep | undefined;
          
          if (triggerStep) {
              // Update existing trigger step
              triggerStep = {
                  ...triggerStep,
                  functionParams: {
                      ...triggerStep.functionParams,
                      requestTemplateId: String(option.value)
                  }
              };
              
              const updatedSteps = workflowDefinition.steps.map(step => 
                  step.id === triggerStep!.id ? triggerStep! : step
              );
              
              onWorkflowDefinitionChange({ steps: updatedSteps });
          } else {
              // Create new trigger step
              const newTriggerStep: WorkflowStep = {
                  id: generateShortId(),
                  label: `When ${option.label} is submitted`,
                  type: 'trigger',
                  stepFunction: 'onRequest',
                  functionParams: {
                      requestTemplateId: String(option.value)
                  },
                  next: []
              };
              
              onWorkflowDefinitionChange({ 
                  steps: [newTriggerStep, ...workflowDefinition.steps] 
              });
          }
          
          const selectionText = `Use ${option.label} for ${forKey}`;
          await handleSendToAime(selectionText);
      } else {
          const selectionText = `Use ${option.label} for ${forKey}`;
          setUserInput(prev => {
              const separator = prev.trim() ? '\n' : '';
              return `${prev}${separator}${selectionText}`;
          });
          autocompleteRef.current?.focus();
      }
  }, [workflowDefinition, onWorkflowDefinitionChange, handleSendToAime]);


  return (
      <div className="p-0 pt-2 flex-1 flex flex-col h-full max-h-full">
          {error && (
              <Alert variant="destructive" className="mb-2">
                  <AlertDescription>{error}</AlertDescription>
              </Alert>
          )}

          {!error && workflowTemplateId && (
              <div className="flex-1 p-[20px] max-h-full flex flex-col items-stretch rounded-none bg-card">
                  <div className="mb-1 font-bold flex items-center gap-2">
                      <Image src={`${env.basePath}/aime-request-100x100.png`} alt="aime Request" width={48} height={48} />
                      Ask aime Request
                  </div>
                  <div
                      ref={messagesContainerRef}
                      className="border border-border rounded-md p-4 flex-1 mb-1 overflow-y-auto"
                  >
                          {(messages?.length === 0) ? (
                              <div className="text-center text-muted-foreground">
                                  No messages yet. Start the conversation!
                              </div>
                          ) : (
                              messages?.map((message, index) => (
                                  <MessageItem 
                                      key={message.id} 
                                      message={message} 
                                      isFirst={(index === 0)} 
                                      onOptionSelected={onOptionSelected}
                                      workflowDefinition={workflowDefinition}
                                      userInitials={userInitials}
                                      userAvatar={userAvatar}
                                      displayName={displayName}
                                  />
                              ))
                          )}
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


