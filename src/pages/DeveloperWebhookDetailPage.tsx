import { useParams } from 'react-router-dom';
import { WebhookDetail } from '@/features/developers/WebhookDetail';

export default function DeveloperWebhookDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <WebhookDetail id={id ?? ''} />;
}
