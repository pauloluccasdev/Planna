import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      data: { service: 'planna-api', status: 'ok' },
    } as const;
  }
}
