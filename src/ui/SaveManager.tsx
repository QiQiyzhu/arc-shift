import { useRef, useState } from 'react';
import type { Engine } from '../game/engine';
import { type SaveData, writeSave } from '../core/save';
import {
  exportSave,
  importSave,
  MAX_BACKUP_BYTES,
} from '../core/save-transfer';
import {
  announceLanguageChange,
  normalizeLanguage,
  useTranslation,
} from './i18n';

export function SaveManager({
  engine,
  onRestore,
}: {
  engine: Engine;
  onRestore: () => void;
}) {
  const t = useTranslation();
  const file = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<SaveData | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const canRestore = engine.world.phase === 'menu';
  return (
    <section
      className="save-manager"
      aria-label={t.copy('存档备份', 'Save backup')}
    >
      <h3>{t.copy('存档备份', 'Save backup')}</h3>
      <p>
        {t.copy(
          '进度仅保存在当前浏览器。换设备或清理浏览器前，请下载备份。备份包含主行动检查点、营地成长和声音/语言设置；独立模式记录和自定义按键不在其中。',
          'Progress lives in this browser. Download a backup before changing devices or clearing browser data. Backups contain the campaign checkpoint, camp progress and audio/language settings; standalone mode records and custom bindings are separate.',
        )}
      </p>
      <div className="save-actions">
        <button
          onClick={() => {
            const url = URL.createObjectURL(
              new Blob([exportSave(engine.save)], { type: 'application/json' }),
            );
            const link = document.createElement('a');
            link.href = url;
            link.download = `ARC-SHIFT-save-${new Date().toISOString().slice(0, 10)}.json`;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            setMessage(
              t.copy(
                '备份已生成，请保留下载的 JSON 文件。',
                'Backup created. Keep the downloaded JSON file.',
              ),
            );
          }}
        >
          {t.copy('下载存档备份', 'Download save backup')}
        </button>
        <button
          disabled={!canRestore || busy}
          onClick={() => file.current?.click()}
        >
          {t.copy('选择备份文件', 'Choose backup file')}
        </button>
      </div>
      {!canRestore && (
        <p>
          {t.copy(
            '返回主界面后可恢复备份。',
            'Return to the main menu to restore a backup.',
          )}
        </p>
      )}
      <input
        ref={file}
        className="sr-only"
        type="file"
        accept=".json,application/json"
        aria-label={t.copy('选择存档备份', 'Select save backup')}
        disabled={!canRestore || busy}
        onChange={async (event) => {
          const selected = event.target.files?.[0];
          event.target.value = '';
          setPending(null);
          setMessage('');
          if (!selected) return;
          setBusy(true);
          try {
            if (selected.size > MAX_BACKUP_BYTES)
              throw new Error('backup-too-large');
            setPending(importSave(await selected.text()));
          } catch {
            setMessage(
              t.copy(
                '无法读取该备份，或其中的行动存档已损坏。当前进度未更改。',
                'This backup is invalid or its campaign checkpoint is damaged. Your current progress is unchanged.',
              ),
            );
          } finally {
            setBusy(false);
          }
        }}
      />
      {pending && (
        <div className="restore-preview">
          <h4>{t.copy('确认恢复这份备份？', 'Restore this backup?')}</h4>
          <p>
            {t.copy('已完成胜利', 'Victories')}: {pending.meta.wins} ·{' '}
            {t.copy('营地碎片', 'Camp shards')}: {pending.meta.shards}
            <br />
            {pending.checkpoint
              ? t.copy(
                  `可继续第 ${pending.checkpoint.room.index} 层`,
                  `Continue from sector ${pending.checkpoint.room.index}`,
                )
              : t.copy('没有进行中的行动', 'No active campaign')}
          </p>
          <p>
            {t.copy(
              '这会替换此浏览器的主行动、营地进度和声音/语言设置。建议先下载当前备份。',
              'This replaces the campaign, camp progress and audio/language settings in this browser. Download your current backup first.',
            )}
          </p>
          <div className="save-actions">
            <button onClick={() => setPending(null)}>
              {t.copy('取消恢复', 'Cancel restore')}
            </button>
            <button
              onClick={() => {
                if (engine.world.phase !== 'menu') return;
                if (!writeSave(pending)) {
                  setMessage(
                    t.copy(
                      '浏览器不允许保存，备份尚未应用。',
                      'Browser storage is unavailable. The backup has not been applied.',
                    ),
                  );
                  return;
                }
                engine.save = pending;
                engine.storageAvailable = true;
                announceLanguageChange(
                  normalizeLanguage(pending.settings.language),
                );
                onRestore();
              }}
            >
              {t.copy('替换并恢复存档', 'Replace and restore save')}
            </button>
          </div>
        </div>
      )}
      <output aria-live="polite">{message}</output>
    </section>
  );
}
