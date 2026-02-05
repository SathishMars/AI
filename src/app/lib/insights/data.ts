// INSIGHTS-SPECIFIC: Mock data and report definitions
// This is separate from workflow data (see data/ directory)

export type InsightsReport = {
  id: string;
  title: string;
  date?: string;
  tag?: string;
  section: "my" | "shared" | "system";
};

export const insightsMyReports: InsightsReport[] = [
  // { id: "my-1", title: "Dashboard Export 1", date: "Oct 19, 2025", section: "my" },
  // { id: "my-2", title: "Dashboard Export 2", date: "Oct 19, 2025", section: "my" },
  // { id: "my-3", title: "Dashboard Export 3", date: "Oct 19, 2025", section: "my" },
];

export const insightsSharedReports: InsightsReport[] = [
  // { id: "sh-1", title: "Dashboard Export 4", date: "Oct 19, 2025", section: "shared" },
  // { id: "sh-2", title: "Dashboard Export 5", date: "Oct 19, 2025", section: "shared" },
  // { id: "sh-3", title: "Dashboard Export 6", date: "Oct 19, 2025", section: "shared" },
  // { id: "sh-4", title: "Dashboard Export 7", date: "Oct 19, 2025", section: "shared" },
];

export const insightsAttendanceReports: InsightsReport[] = [
  { id: "sys-1", tag: "Attendance", title: "Attendee Report", section: "system" },
  { id: "sys-2", tag: "Attendance", title: "All Data", section: "system" },
  { id: "sys-3", tag: "Attendance", title: "Dashboard Export", section: "system" },
  { id: "sys-4", tag: "Attendance", title: "Questions", section: "system" },
  { id: "sys-5", tag: "Attendance", title: "Questions by Attendee", section: "system" },
  { id: "sys-6", tag: "Attendance", title: "Sessions Report", section: "system" },
  { id: "sys-7", tag: "Attendance", title: "Sessions by Attendee Report", section: "system" },
  { id: "sys-8", tag: "Attendance", title: "Communication Log", section: "system" },
];

export const insightsSuggestions = [
  "Show me total attendance numbers by ticket type",
  "Which sessions had the highest attendance?",
  "Compare VIP vs regular attendee participation",
  "Show attendee registration trends over time",
  "List attendees with dietary restrictions",
  "Show attendees who haven't checked in yet",
];

export type InsightsAttendeeRow = Record<string, string | null>;

export const insightsAttendeeColumns = [
  "First Name",
  "Middle Name",
  "Last Name",
  "Email",
  "Companion(s)",
  "Company Name",
  "Phone",
  "Mobile",
  "Attendee Type",
  "Emergency Contact",
  "Registration Status",
  "Manual Status",
  "Room Status",
  "Air Status",
  "Created At",
  "Updated At",
  "Concur Login Id",
  "Internal Notes"
];

export const insightsAttendeeRows: InsightsAttendeeRow[] = [];

// Legacy exports for backward compatibility
export type Report = InsightsReport;
export const myReports = insightsMyReports;
export const sharedReports = insightsSharedReports;
export const attendanceReports = insightsAttendanceReports;
export const suggestions = insightsSuggestions;
export type AttendeeRow = InsightsAttendeeRow;
export const attendeeColumns = insightsAttendeeColumns;
export const attendeeRows = insightsAttendeeRows;

