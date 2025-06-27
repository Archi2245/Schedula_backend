import { Controller, Get } from '@nestjs/common';
import { HelloWorldArchiService } from './hello-world-archi.service';

@Controller() // IMPORTANT: No path here
export class HelloWorldArchiController {
  constructor(private readonly helloWorldService: HelloWorldArchiService) {}

  @Get() // This will now handle GET /
  getRoot(): string {
    return this.helloWorldService.getMessage();
  }

  @Get('hello-world-archi') // This will handle GET /hello-world-archi
  getHello(): string {
    return this.helloWorldService.getMessage();
  }
}
