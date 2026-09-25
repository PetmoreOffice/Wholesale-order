import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { backupFile, changeStore, createBackup, dataStatus, logActivity, readStore } from '../orders/store.js';

// Admin-only view of the local JSON order store: backups, downloads and the activity log.
// The file holds customer data, so every route here requires an admin session.
export const dataRouter = Router();
dataRouter.use(requireAuth, requireRole('admin'));

function actor(req) {
  return { actorId: req.user.uid, actorName: req.user.name };
}

dataRouter.get('/', async (_req, res, next) => {
  try {
    return res.json({ data: await dataStatus() });
  } catch (error) { return next(error); }
});

dataRouter.post('/backups', async (req, res, next) => {
  try {
    const name = await createBackup();
    if (!name) return res.status(409).json({ error: 'NOTHING_TO_BACK_UP', message: 'ยังไม่มีข้อมูล Order ให้สำรอง' });
    await changeStore((store) => logActivity(store, { ...actor(req), action: 'backup.created', detail: name }));
    return res.status(201).json({ data: await dataStatus() });
  } catch (error) { return next(error); }
});

async function recordDownload(req, detail) {
  await changeStore((store) => logActivity(store, { ...actor(req), action: 'data.downloaded', detail }));
}

dataRouter.get('/backups/:name', async (req, res, next) => {
  try {
    const file = backupFile(req.params.name);
    if (!file) return res.status(404).json({ error: 'BACKUP_NOT_FOUND', message: 'ไม่พบไฟล์สำรอง' });
    await recordDownload(req, req.params.name);
    return res.download(file, req.params.name, (error) => {
      if (error && !res.headersSent) res.status(404).json({ error: 'BACKUP_NOT_FOUND', message: 'ไม่พบไฟล์สำรอง' });
    });
  } catch (error) { return next(error); }
});

// The current data as one JSON file, for keeping a copy outside the server.
dataRouter.get('/export', async (req, res, next) => {
  try {
    const store = await readStore();
    const name = `orders-export-${new Date().toISOString().slice(0, 10)}.json`;
    await recordDownload(req, name);
    res.set('Content-Disposition', `attachment; filename="${name}"`);
    return res.type('application/json').send(JSON.stringify(store, null, 2));
  } catch (error) { return next(error); }
});

dataRouter.get('/activity', async (req, res, next) => {
  try {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 100, 1), 500);
    const { activity } = await readStore();
    return res.json({ data: activity.slice(0, limit), total: activity.length });
  } catch (error) { return next(error); }
});
