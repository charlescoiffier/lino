import type { Project } from '../store/projects';

interface Props {
  projects: Project[];
  canSave: boolean;
  storageAvailable: boolean;
  onSave: () => void;
  onOpen: (id: string) => void;
  onExportFile: () => void;
  onImportFile: (file: File) => void;
}

export function ProjectBar({ projects, canSave, storageAvailable, onSave, onOpen, onExportFile, onImportFile }: Props) {
  return (
    <section style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', margin: '12px 0' }}>
      {storageAvailable ? (
        <>
          <button type="button" disabled={!canSave} onClick={onSave}>
            Enregistrer
          </button>
          <select
            aria-label="Projets enregistrés"
            value=""
            onChange={(e) => e.target.value && onOpen(e.target.value)}
          >
            <option value="">Ouvrir un projet…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </>
      ) : (
        <span role="status">Sauvegarde locale indisponible : utilisez l'export de projet.</span>
      )}
      <button type="button" disabled={!canSave} onClick={onExportFile}>
        Exporter le projet
      </button>
      <label>
        Importer un projet{' '}
        <input type="file" accept=".json,application/json" onChange={(e) => e.target.files?.[0] && onImportFile(e.target.files[0])} />
      </label>
    </section>
  );
}
