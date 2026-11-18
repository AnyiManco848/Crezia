import { PageHeader } from '../../components/PageHeader';
import { Icon } from '../../components/Icon';

// Placeholder for a section whose screen is built in a later part of the front.
export function PendingPage({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <div className="panel">
        <div className="state">
          <Icon name="empty" />
          <h2>Esta sección aún no está disponible</h2>
          <p>Estamos terminando esta pantalla. Vuelve pronto.</p>
        </div>
      </div>
    </>
  );
}
