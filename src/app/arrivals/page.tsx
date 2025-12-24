// INSIGHTS-SPECIFIC: Arrivals page route
import { InsightsAppShell } from "@/app/components/Shell/AppShell";
import InsightsArrivalsPage from "@/app/components/arrivals/ArrivalsPage";

export default function ArrivalsPageRoute() {
    return (
        <InsightsAppShell>
            <InsightsArrivalsPage />
        </InsightsAppShell>
    );
}

