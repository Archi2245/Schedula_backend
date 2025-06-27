import { Module } from '@nestjs/common';
import { HelloWorldArchiController } from './hello-world-archi.controller';
import { HelloWorldArchiService } from './hello-world-archi.service';

@Module({
  controllers: [HelloWorldArchiController],
  providers: [HelloWorldArchiService],
})
export class HelloWorldArchiModule {}
