import { Controller, Get } from '@nestjs/common';
import { HelloWorldArchiService } from './hello-world-archi.service';

@Controller('api/v1/hello-world-archi')
export class HelloWorldArchiController {
  @Get()
  getMessage(): string {
    return 'Hello World from Archi at PearlThoughts Internship!';
  }
}
