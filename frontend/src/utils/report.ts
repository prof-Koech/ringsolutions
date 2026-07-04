import { message } from 'antd';
import api from '../services/api';

export type ReportActionMode = 'download' | 'print';

export const handleCampaignReport = async ({
  campaignId,
  campaignName,
  mode,
}: {
  campaignId: string;
  campaignName: string;
  mode: ReportActionMode;
}) => {
  if (mode === 'print') {
    await printReport(campaignId);
    return;
  }
  await downloadReport(campaignId, campaignName);
};

async function printReport(campaignId: string) {
  try {
    // Fetch the auto-print HTML page as a blob (JWT header is set by the Axios interceptor)
    const resp = await api.get(`/reports/campaign/${campaignId}/html`, {
      responseType: 'blob',
    } as object);

    const blob = new Blob([resp.data as BlobPart], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    // Open the HTML page in a new tab. The page has window.onload = window.print()
    // so the browser's native print dialog fires automatically.
    const win = window.open(url, '_blank');
    if (!win) {
      // Popup blocked — fall back to a direct navigation message
      message.warning('Popup blocked. Please allow pop-ups for this site to print reports.');
      URL.revokeObjectURL(url);
      return;
    }

    // Clean up the blob URL after the window has had time to load and print
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch {
    message.error('Could not load report for printing');
  }
}

async function downloadReport(campaignId: string, campaignName: string) {
  try {
    const resp = await api.get(`/reports/campaign/${campaignId}/pdf`, {
      responseType: 'blob',
    } as object);

    const blob = new Blob([resp.data as BlobPart], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const filename = `RingSolutions_${campaignName.replace(/\s+/g, '_')}_Report.pdf`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    message.error('Report not available yet');
  }
}
