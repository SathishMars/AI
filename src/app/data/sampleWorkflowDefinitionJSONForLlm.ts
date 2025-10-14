import { WorkflowDefinition } from "../types/workflowTemplate";




export const sampleWorkflowDefinitionJSONForLlm: WorkflowDefinition = {
  "steps": [
    {
      "id": "OqFyAdnDJZ",
      "label": "On receiving the MRF",
      "type": "trigger",
      "stepFunction": "onMRF",
      "functionParams": {
        "mrfTemplateName": "all"
      },
      "next": [
        {
          "id": "uZsymgKdWY",
          "label": "Check location and maxAttendees",
          "type": "decision",
          "stepFunction": "checkCondition",
          "functionParams": {
            "evaluate": "{\"any\":[{\"fact\":\"location\",\"operator\":\"notEqual\",\"value\":\"US\"},{\"fact\":\"maxAttendees\",\"operator\":\"greaterThan\",\"value\":100}]}"
          },
          "onConditionPass": {
            "id": "mThKCURvwG",
            "label": "Request approval from manager",
            "type": "decision",
            "stepFunction": "requestApproval",
            "functionParams": {
              "approver": "${manager}",
              "reason": "Location is not US or maxAttendees exceeds 100"
            },
            "onConditionPass": "ynNcWEhTHe",
            "onConditionFail": "HFUgDJ8sZF"
          },
          "onConditionFail": "HFUgDJ8sZF"
        }
        ]
      },
      {
        "id": "ynNcWEhTHe",
        "label": "Create calendar event",
        "type": "task",
        "stepFunction": "createEvent",
        "functionParams": {},
        "next": [
          "HFUgDJ8sZF"
        ]
      },
      {
        "id": "HFUgDJ8sZF",
        "label": "Terminate workflow",
        "type": "terminate",
        "stepFunction": "terminate",
        "functionParams": {},
        "next": []
      }
    ]
  }