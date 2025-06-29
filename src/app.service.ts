import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getRootMessage(): string {
    return 'Hello World!';
  }

  getHelloMessage(): string {
    return 'Hello World!';
  }
}
