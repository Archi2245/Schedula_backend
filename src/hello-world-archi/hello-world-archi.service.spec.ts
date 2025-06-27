import { Test, TestingModule } from '@nestjs/testing';
import { HelloWorldArchiService } from './hello-world-archi.service';

describe('HelloWorldArchiService', () => {
  let service: HelloWorldArchiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HelloWorldArchiService],
    }).compile();

    service = module.get<HelloWorldArchiService>(HelloWorldArchiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
