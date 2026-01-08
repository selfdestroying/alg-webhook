import fs from 'node:fs/promises';
import path from 'node:path';

type PollerState = {
  lastProcessedCreatedAt: number;
  cronExpression: string;
};

class PollerStateStorage {
  private readonly filePath: string;
  private state: PollerState = {
    lastProcessedCreatedAt: -1,
    cronExpression: '',
  };

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  public async initialize(): Promise<void> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(data) as Partial<PollerState>;

      // Валидируем и применяем значения, если они корректны
      if (!parsed.cronExpression || typeof parsed.cronExpression !== 'string') {
        throw new Error('Некорректное значение cronExpression в poller-state.json');
      }
      if (!parsed.lastProcessedCreatedAt || typeof parsed.lastProcessedCreatedAt !== 'number') {
        throw new Error('Некорректное значение lastProcessedCreatedAt в poller-state.json');
      }
      this.state = {
        cronExpression: parsed.cronExpression,
        lastProcessedCreatedAt: parsed.lastProcessedCreatedAt,
      };
    } catch (error) {
      if (error instanceof Error) {
        if ('code' in error && error.code === 'ENOENT') {
          throw new Error('poller-state.json не найден');
        } else {
          throw new Error(`Ошибка при чтении poller-state.json: ${error.message}`);
        }
      }
    }
  }

  static async create() {
    const filePath: string = path.join(process.cwd(), 'poller-state.json');
    const instance = new PollerStateStorage(filePath);
    await instance.initialize();
    return instance;
  }

  private async save(): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });

    const data = JSON.stringify(this.state, null, 2);
    await fs.writeFile(this.filePath, data, 'utf-8');
  }

  public async updateCronExpression(cron: string): Promise<void> {
    if (typeof cron !== 'string' || cron.trim() === '') {
      throw new Error('cronExpression должен быть непустой строкой');
    }

    this.state.cronExpression = cron.trim();
    await this.save();
  }

  public async updateLastProcessed(timestamp: number): Promise<void> {
    if (typeof timestamp !== 'number' || isNaN(timestamp) || timestamp < 0) {
      throw new Error('timestamp должен быть валидным числом');
    }

    this.state.lastProcessedCreatedAt = timestamp;
    await this.save();
  }

  public getState(): PollerState {
    return { ...this.state };
  }

  public getLastProcessedCreatedAt(): number {
    return this.state.lastProcessedCreatedAt;
  }

  public getCronExpression(): string {
    return this.state.cronExpression;
  }
}

export default await PollerStateStorage.create();
