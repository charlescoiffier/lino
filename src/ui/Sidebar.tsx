import type { Project } from '../store/projects';
import { Icon } from './Icon';

interface Props {
  projects: Project[];
  activeId: string | null;
  canSave: boolean;
  storageAvailable: boolean;
  onAddImage: (file: File) => void;
  onSave: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onExportFile: () => void;
  onImportFile: (file: File) => void;
}

export function Sidebar({ projects, activeId, canSave, storageAvailable, onAddImage, onSave, onOpen, onDelete, onExportFile, onImportFile }: Props) {
  return (
    <aside className="sidebar" aria-label="Navigation">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          L
        </span>
        Lino
      </div>

      <label className="add-button">
        <span className="add-plus">
          <Icon name="plus" size={16} />
        </span>
        Ajouter une image
        <input
          data-testid="file-input"
          className="sr-only"
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) onAddImage(file);
          }}
        />
      </label>

      <nav className="nav" aria-label="Projets">
        <h2 className="nav-title">Projets</h2>
        {!storageAvailable && <p role="status" className="nav-empty">Sauvegarde locale indisponible : utilisez l'export de projet.</p>}
        {storageAvailable && projects.length === 0 && <p className="nav-empty">Aucun projet enregistré.</p>}
        {storageAvailable && (
          <ul>
            {projects.map((p) => (
              <li key={p.id} className={p.id === activeId ? 'nav-row is-active' : 'nav-row'}>
                <button type="button" className="nav-item" onClick={() => onOpen(p.id)}>
                  <Icon name="image" size={18} />
                  <span>{p.name}</span>
                </button>
                <button type="button" className="nav-delete" aria-label={`Supprimer ${p.name}`} onClick={() => onDelete(p.id)}>
                  <Icon name="x" size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>

      <div className="sidebar-actions">
        {storageAvailable && (
          <button type="button" className="nav-item" disabled={!canSave} onClick={onSave}>
            <Icon name="save" size={18} />
            <span>Enregistrer</span>
          </button>
        )}
        <button type="button" className="nav-item" disabled={!canSave} onClick={onExportFile}>
          <Icon name="download" size={18} />
          <span>Exporter le projet</span>
        </button>
        <label className="nav-item">
          <Icon name="upload" size={18} />
          <span>Importer un projet</span>
          <input
            className="sr-only"
            type="file"
            accept=".json,application/json"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) onImportFile(file);
            }}
          />
        </label>
      </div>
    </aside>
  );
}
