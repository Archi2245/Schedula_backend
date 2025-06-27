import { Injectable } from '@nestjs/common';

@Injectable()
export class HelloWorldArchiService {
  getMessage(): string {
    return 'Hello World from Archi at PearlThoughts Internship!';
  }
}
