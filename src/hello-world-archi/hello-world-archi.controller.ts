import { Controller, Get } from '@nestjs/common';
import { HelloWorldArchiService } from './hello-world-archi.service';

@Controller('hello-world-archi')
export class HelloWorldArchiController {
  constructor(private readonly helloWorldService: HelloWorldArchiService) {}

  @Get()
  getMessage(): string {
    return this.helloWorldService.getMessage();
  }
}
