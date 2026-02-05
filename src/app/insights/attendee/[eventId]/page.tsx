// INSIGHTS-SPECIFIC: Attendee page route with dynamic eventId
import { Suspense } from "react";
import { InsightsAppShell } from "@/app/components/Shell/AppShell";
import InsightsAttendeePage from "@/app/components/attendee/AttendeePage";

export default function AttendeePageRoute() {
    return (
        <InsightsAppShell>
            <Suspense fallback={<div>Loading...</div>}>
                <InsightsAttendeePage />
            </Suspense>
        </InsightsAppShell>
    );
}
