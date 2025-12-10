import fs from 'node:fs/promises';
import path from 'node:path';

type PollerState = {
  lastProcessedCreatedAt: number;
  cronExpression: string;
};

const DEFAULT_STATE: PollerState = {
  lastProcessedCreatedAt: 0,
  cronExpression: '0 * * * *', // по умолчанию — каждый час
};

class PollerStateStorage {
  private readonly filePath: string;
  private state: PollerState;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.state = { ...DEFAULT_STATE };
  }

  public async initialize(): Promise<void> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(data) as Partial<PollerState>;

      // Валидируем и применяем значения, если они корректны
      this.state = {
        lastProcessedCreatedAt:
          typeof parsed.lastProcessedCreatedAt === 'number'
            ? parsed.lastProcessedCreatedAt
            : DEFAULT_STATE.lastProcessedCreatedAt,
        cronExpression:
          typeof parsed.cronExpression === 'string' && parsed.cronExpression.trim() !== ''
            ? parsed.cronExpression.trim()
            : DEFAULT_STATE.cronExpression,
      };
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        if (error.code === 'ENOENT') {
          console.log('poller-state.json не найден, создаётся новый файл с дефолтными значениями');
          await this.save();
        } else {
          console.warn(
            'Ошибка при чтении poller-state.json, используются дефолтные значения:',
            error.message,
          );
          this.state = { ...DEFAULT_STATE };
          await this.save();
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
    if (typeof timestamp !== 'number' || isNaN(timestamp)) {
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
