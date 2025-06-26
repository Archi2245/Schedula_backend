import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('GET /', () => {
    it('should return "Welcome to the NestJS Boilerplate!"', () => {
      expect(appController.getRoot()).toBe('Welcome to the NestJS Boilerplate!');
    });
  });

  describe('GET /hello', () => {
    it('should return custom hello message', () => {
      expect(appController.getHello()).toBe('Hello from Saraswat at PearlsThoughts Internship!');
    });
  });
});
