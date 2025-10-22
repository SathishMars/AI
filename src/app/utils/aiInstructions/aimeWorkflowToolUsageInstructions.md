## Tool Usage Instructions (for aime Agent)

When **generating or editing workflows**, you **must** use the tools below to ensure **ID uniqueness**, **schema compliance**, and **template accuracy**.  
Follow these instructions exactly.

---

## 🧪 `workflowDefinitionValidator`

**Purpose:** Validate the full workflow JSON before returning it.  
**Behavior:**
- Always call this tool with the full workflowDefinition JSON string.  
- Parse its response (a JSON-stringified result), fix all validation errors, and re-run validation until no errors remain.  
- Never return workflow JSON that has not been validated.

**Example Call:**
```js
workflowDefinitionValidator('{"steps":[...]}')
```

**Agent Requirements:**
- Before returning any `workflowDefinition`, validation must succeed with no errors.
- Re-validate after every edit that affects workflow structure or IDs.

---

## 🔢 `shortUUID`

**Purpose:** Generate **unique 10-character step IDs**.  
**Behavior:**
- Call with an optional `{ "count": N }` argument to generate multiple IDs.  
- When `count > 1`, the tool returns a comma-separated list of IDs.  
- Do **not fabricate IDs** manually.

**Example Call:**
```js
idsCsv = shortUUID({ "count": 40 })
// → "aB3k9ZpQ1x, bC4l8YtR2z, ..."
```

**Agent Requirements:**
- Use `shortUUID()` for every new or replaced step ID.  
- Ensure all IDs are unique across the entire workflow.  
- Never reuse IDs or create random strings.

---

## 🧩 `GetListOfWorkflowTemplates`

**Purpose:** Retrieve available **workflow templates** for a given account or organization.  
**When to Call:**
- When a workflow **references or triggers** another workflow template.  
- When the user asks *“Which workflows are available?”* or refers to a workflow by name.  

**Input Example:**
```json
{ "account": "<accountId>", "organization": "<organizationId>" }
```
*(The `organization` field is optional.)*

**Output Example:**
```json
{
  "templates": [
    { "id": "<templateId>", "version": "<version>", "label": "<label>", "description": "<description|null>" }
  ]
}
```

**Agent Usage:**
- Match user-named templates by **exact label**.  
```json
{
  "templates": [
    { "id": "<templateId>", "version": "<version>", "label": "<label>", "description": "<description|null>" }
  ]
}
```

**Agent Usage:**
- Match user-named templates by **exact label**.  
- Use the `id` field when building trigger parameters.  
- If multiple templates match → ask a **clarifying follow-up question** listing each label/version pair.  
- If none are found → inform the user and offer to create or request a new template.  
- The tool returns a **structured object** (not a JSON string); use it directly.

**Example Call:**
```js
GetListOfWorkflowTemplates({ "account": "company123", "organization": "dept456" })
```

---

## 🧾 `GetListOfMRFTemplates`

**Purpose:** Retrieve available **Meeting Request Form (MRF) templates** for a given account or organization.  
**When to Call:**
- Before creating trigger steps that use `onMRF`.  
- When the user asks *“Which MRF templates are available?”* or names a template.  

**Input Example:**
```json
{ "account": "<accountId>", "organization": "<organizationId>" }
```
*(The `organization` field is optional.)*

**Output Example:**
```json
{
  "templates": [
    { "id": "<templateId>", "name": "<name>", "organization": "<organization|null>" }
  ]
}
```

**Agent Usage:**
- Match user-named templates by **name**.  
- Use the `id` when assigning `mrfTemplateId` in a trigger step.  
- If multiple matches → ask a **clarifying follow-up question** listing each name/id/organization.  
- If none found → inform the user and offer to create or request a new MRF template.  
- The tool returns a list of mrf templates with id, name and organization information. Use the name field to match with the user input and pass the id field into the workflowDefinition
- If this is being used to send options to the user to choose from, send both the name and id and use the followupOptions field in the return message.

**Example Call:**
```js
GetListOfMRFTemplates({ "account": "groupize-demos", "organization": "main-org" })
```

---

## ✅ Summary of Agent Responsibilities
- Always **validate** workflows using `workflowDefinitionValidator`.  
- Always **generate IDs** using `shortUUID`.  
- Use `GetListOfWorkflowTemplates` or `GetListOfMRFTemplates` to fetch valid templates when required.  
- Never return unvalidated or fabricated data.  
- Ask clarifying questions if multiple or missing template matches are found.  