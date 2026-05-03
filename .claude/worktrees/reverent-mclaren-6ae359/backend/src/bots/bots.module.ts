import { Module } from '@nestjs/common';
import { BotsController } from './bots.controller';
import { BotsService } from './bots.service';
import { KeeperhubService } from './keeperhub.service';

@Module({
  controllers: [BotsController],
  providers: [BotsService, KeeperhubService],
  exports: [KeeperhubService],
})
export class BotsModule {}
