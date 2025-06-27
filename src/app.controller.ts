import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot(): string {
    return '✅ Hello World from Archi — Render is working!';
  }
}
