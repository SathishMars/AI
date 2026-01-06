// INSIGHTS-SPECIFIC: Main insights page route
import { InsightsAppShell } from "@/app/components/Shell/AppShell";
import { InsightsPageComponent } from "@/app/components/insights/InsightsPage";

export default function InsightsPageRoute() {
  return (
    <InsightsAppShell>
      <InsightsPageComponent />
    </InsightsAppShell>
  );
}

