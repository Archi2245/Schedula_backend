import { Test, TestingModule } from '@nestjs/testing';
import { HelloWorldArchiController } from './hello-world-archi.controller';

describe('HelloWorldArchiController', () => {
  let controller: HelloWorldArchiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HelloWorldArchiController],
    }).compile();

    controller = module.get<HelloWorldArchiController>(HelloWorldArchiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
