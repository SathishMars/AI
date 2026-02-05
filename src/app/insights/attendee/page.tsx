// INSIGHTS-SPECIFIC: Redirect old route to new format with default eventId
import { redirect } from "next/navigation";

export default function AttendeePageRoute() {
    // Redirect to default eventId (5281) in the new URL format
    redirect('/insights/attendee/5281');
}
